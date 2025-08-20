import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { FaClock, FaUser, FaCalendarAlt, FaChevronLeft, FaChevronRight, FaCog, FaTimes } from 'react-icons/fa';
import './RosterView.css';

const RosterView = () => {
  const { currentUser, token, isAdmin } = useAuth();
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [systemSettings, setSystemSettings] = useState({ first_day_of_week: 1 });
  
  // Selected week date (start with current week)
  const [selectedWeekStart, setSelectedWeekStart] = useState(new Date());

  // Calculate week dates based on system settings
  const weekDates = useMemo(() => {
    if (!systemSettings) return [];
    
    const dates = [];
    const today = new Date(selectedWeekStart);
    
    // Find the start of the current week based on system settings
    const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const firstDayOfWeek = systemSettings.first_day_of_week || 1; // Default to Monday
    
    // Calculate days to subtract to get to the first day of the week
    let daysToSubtract = currentDayOfWeek - firstDayOfWeek;
    if (daysToSubtract < 0) {
      daysToSubtract += 7;
    }
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysToSubtract);
    
    // Generate the 7 days of the week
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  }, [selectedWeekStart, systemSettings]);

  // Day names based on system settings
  const dayNames = useMemo(() => {
    if (weekDates.length === 0) return [];
    
    return weekDates.map(date => 
      date.toLocaleDateString('en-US', { weekday: 'short' })
    );
  }, [weekDates]);

  // Navigation functions
  const goToPreviousWeek = () => {
    const newDate = new Date(selectedWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedWeekStart(newDate);
  };

  const goToCurrentWeek = () => {
    setSelectedWeekStart(new Date());
  };

  // Check if current week is selected
  const isCurrentWeek = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (weekDates.length === 0) return false;
    
    const weekStart = new Date(weekDates[0].getFullYear(), weekDates[0].getMonth(), weekDates[0].getDate());
    const weekEnd = new Date(weekDates[6].getFullYear(), weekDates[6].getMonth(), weekDates[6].getDate());
    
    return today >= weekStart && today <= weekEnd;
  };

  // Fetch system settings
  useEffect(() => {
    const fetchSystemSettings = async () => {
      try {
        const response = await axios.get('/settings');
        if (response.data && response.data.success && response.data.data) {
          setSystemSettings(response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch system settings:', err);
        // Continue with default settings
      }
    };
    
    fetchSystemSettings();
  }, []);

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await axios.get('/employees');
        if (response.data && response.data.data) {
          setEmployees(response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch employees:', err);
        setError('Failed to load employees');
      }
    };
    
    fetchEmployees();
  }, []);

  // Fetch schedules for current week
  useEffect(() => {
    const fetchSchedules = async () => {
      if (weekDates.length === 0) return;
      
      try {
        setLoading(true);
        const startDate = weekDates[0].toISOString().split('T')[0];
        const endDate = weekDates[6].toISOString().split('T')[0];
        
        const response = await axios.get(`/schedules?start_date=${startDate}&end_date=${endDate}&status=approved`);
        if (response.data && response.data.data) {
          setSchedules(response.data.data);
        }
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch schedules:', err);
        setError('Failed to load schedule data');
        setLoading(false);
      }
    };
    
    fetchSchedules();
  }, [weekDates, selectedWeekStart]);

  // Get schedules for a specific employee and day
  const getSchedulesForEmployeeAndDay = (employeeId, dayIndex) => {
    const targetDate = weekDates[dayIndex];
    if (!targetDate) return [];
    
    const dateStr = targetDate.toISOString().split('T')[0];
    
    return schedules.filter(schedule => 
      schedule.employee_id === employeeId && 
      schedule.date === dateStr &&
      schedule.status === 'approved'
    );
  };

  // Format time for display
  const formatTime = (timeString) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const period = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes} ${period}`;
    } catch (e) {
      return timeString;
    }
  };

  // Get summary stats
  const getTotalScheduledShifts = () => {
    return schedules.length;
  };

  const getEmployeesWithShifts = () => {
    const employeeIds = new Set(schedules.map(s => s.employee_id));
    return employeeIds.size;
  };

  // Handle shift cancellation
  const handleCancelShift = async (schedule) => {
    // Check if user can cancel this shift
    const userEmployee = employees.find(emp => emp.user_id === currentUser.id);
    
    if (!isAdmin && (!userEmployee || userEmployee.id !== schedule.employee_id)) {
      alert('You can only cancel your own shifts');
      return;
    }

    // Check if shift is in the future
    const shiftDateTime = new Date(`${schedule.date}T${schedule.start_time}`);
    if (shiftDateTime <= new Date()) {
      alert('Cannot cancel a shift that has already started or passed');
      return;
    }

    const reason = prompt('Please provide a reason for cancellation (optional):');
    if (reason === null) return; // User cancelled the prompt

    try {
      const response = await axios.post('/shift-cancellations', {
        schedule_id: schedule.id,
        reason: reason || 'No reason provided'
      });

      if (response.data.success) {
        alert('Cancellation request submitted successfully! Other employees will be notified.');
        // Refresh schedules to show any updates
        window.location.reload();
      }
    } catch (error) {
      console.error('Error cancelling shift:', error);
      const message = error.response?.data?.message || 'Failed to cancel shift';
      alert(`Error: ${message}`);
    }
  };

  if (loading && employees.length === 0) {
    return <div className="loading">Loading roster data...</div>;
  }

  return (
    <div className="roster-container">
      <div className="roster-header">
        <div className="header-top">
          <h1><FaCalendarAlt /> Weekly Roster</h1>
          {isAdmin && (
            <Link to="/schedules/bulk" className="bulk-schedule-btn">
              <FaCog /> Bulk Schedule
            </Link>
          )}
        </div>
        
        <div className="week-navigation">
          <button 
            className="nav-btn prev" 
            onClick={goToPreviousWeek}
            title="Previous Week"
          >
            <FaChevronLeft />
          </button>
          
          <div className="week-info">
            <div className="current-week">
              Week of: {weekDates[0]?.toLocaleDateString()} - {weekDates[6]?.toLocaleDateString()}
            </div>
            {!isCurrentWeek() && (
              <button className="current-week-btn" onClick={goToCurrentWeek}>
                Go to Current Week
              </button>
            )}
          </div>
          
          <button 
            className="nav-btn next" 
            onClick={goToNextWeek}
            title="Next Week"
          >
            <FaChevronRight />
          </button>
        </div>
        
        <div className="roster-stats">
          <span className="stat">
            <FaUser /> {getEmployeesWithShifts()} employees scheduled
          </span>
          <span className="stat">
            <FaClock /> {getTotalScheduledShifts()} total shifts
          </span>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="roster-grid-container">
        <div className="roster-grid">
          {/* Header row with days */}
          <div className="roster-header-row">
            <div className="employee-header">Employee</div>
            {dayNames.map((dayName, index) => (
              <div key={index} className="day-header">
                <div className="day-name">{dayName}</div>
                <div className="day-date">{weekDates[index]?.getDate()}</div>
              </div>
            ))}
          </div>
          
          {/* Employee rows */}
          {employees.map(employee => (
            <div key={employee.id} className="roster-row">
              <div className="employee-cell">
                <div className="employee-name">{employee.name}</div>
                <div className="employee-title">{employee.position || 'Employee'}</div>
              </div>
              
              {weekDates.map((date, dayIndex) => {
                const daySchedules = getSchedulesForEmployeeAndDay(employee.id, dayIndex);
                
                return (
                  <div key={dayIndex} className="day-cell">
                    {daySchedules.length === 0 ? (
                      <div className="no-shift">-</div>
                    ) : (
                      <div className="shifts">
                        {daySchedules.map((schedule, index) => {
                          const userEmployee = employees.find(emp => emp.user_id === currentUser.id);
                          const canCancel = isAdmin || (userEmployee && userEmployee.id === schedule.employee_id);
                          const shiftDateTime = new Date(`${schedule.date}T${schedule.start_time}`);
                          const isFuture = shiftDateTime > new Date();
                          
                          return (
                            <div key={index} className="shift-block">
                              <div className="shift-content">
                                <div className="shift-time">
                                  {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                </div>
                                {schedule.time_slot?.name && (
                                  <div className="shift-name">{schedule.time_slot.name}</div>
                                )}
                              </div>
                              {canCancel && isFuture && (
                                <button 
                                  className="cancel-shift-btn"
                                  onClick={() => handleCancelShift(schedule)}
                                  title="Cancel this shift"
                                >
                                  <FaTimes />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {employees.length === 0 && !loading && (
        <div className="no-data-message">
          <p>No employees found. Please add employees to see the roster.</p>
        </div>
      )}
      
      {employees.length > 0 && schedules.length === 0 && !loading && (
        <div className="no-schedules-message">
          <p>No approved schedules found for this week.</p>
        </div>
      )}
    </div>
  );
};

export default RosterView;
