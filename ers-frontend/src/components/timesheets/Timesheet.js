import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Timesheet.css';

const Timesheet = () => {
  const navigate = useNavigate();
  const { token, isAdmin } = useAuth();
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scheduleData, setScheduleData] = useState([]);
  const [systemSettings, setSystemSettings] = useState({ first_day_of_week: 1 });
  const [viewType, setViewType] = useState('weekly'); // 'weekly' or 'monthly'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  // New state for modal
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState([]);
  const [modalTitle, setModalTitle] = useState('');
  
  // Fetch system settings
  useEffect(() => {
    const fetchSystemSettings = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/settings`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
        const data = await response.json();
        if (data && data.success && data.data) {
          setSystemSettings(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch system settings:', err);
        setError('Failed to load system settings. Default values will be used.');
      }
    };
    
    fetchSystemSettings();
  }, [token]);
  
  // Calculate start and end dates based on view type
  const dateRange = useMemo(() => {
    const result = { start: null, end: null, dates: [] };
    
    if (viewType === 'weekly') {
      // Calculate the start of the week based on first_day_of_week setting
      const dayOfWeek = currentDate.getDay();
      const firstDayOfWeek = systemSettings.first_day_of_week;
      const daysToSubtract = (dayOfWeek - firstDayOfWeek + 7) % 7;
      
      const startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - daysToSubtract);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      
      result.start = startDate;
      result.end = endDate;
      
      // Generate array of dates in the week
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        dates.push(date);
      }
      result.dates = dates;
    } else if (viewType === 'monthly') {
      // For monthly view, get the first and last day of the month
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      
      result.start = startDate;
      result.end = endDate;
      
      // Generate array of all dates in the month
      const dates = [];
      const daysInMonth = endDate.getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i);
        dates.push(date);
      }
      result.dates = dates;
    }
    
    return result;
  }, [currentDate, viewType, systemSettings.first_day_of_week]);
  
  // Fetch departments (for filtering)
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/departments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
        const data = await response.json();
        if (data && data.success && data.data) {
          setDepartments(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch departments:', err);
        setError('Failed to load departments data.');
      }
    };
    
    fetchDepartments();
  }, [token]);
  
  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/employees`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
        const data = await response.json();
        if (data && data.success && data.data) {
          setEmployees(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch employees:', err);
        setError('Failed to load employee data.');
      }
    };
    
    fetchEmployees();
  }, [token]);
  
  // Fetch schedule data
  useEffect(() => {
    const fetchScheduleData = async () => {
      if (!dateRange.start || !dateRange.end) return;
      
      setLoading(true);
      setError('');
      
      try {
        const startDateStr = dateRange.start.toISOString().split('T')[0];
        const endDateStr = dateRange.end.toISOString().split('T')[0];
        
        let url = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/roster/date-range?startDate=${startDateStr}&endDate=${endDateStr}`;
        
        if (selectedDepartment !== 'all') {
          url += `&departmentId=${selectedDepartment}`;
        }
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
        const data = await response.json();
        if (data && data.success && data.data) {
          setScheduleData(data.data);
        } else {
          setScheduleData([]);
        }
      } catch (err) {
        console.error('Failed to fetch schedule data:', err);
        setError('Failed to load schedule data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchScheduleData();
  }, [token, dateRange.start, dateRange.end, selectedDepartment]);
  
  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short', 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // Format date range for display
  const formatDateRange = () => {
    if (!dateRange.start || !dateRange.end) return '';
    
    if (viewType === 'weekly') {
      const options = { month: 'short', day: 'numeric', year: 'numeric' };
      return `${dateRange.start.toLocaleDateString('en-US', options)} - ${dateRange.end.toLocaleDateString('en-US', options)}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };
  
  // Navigate to previous period
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewType === 'weekly') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };
  
  // Navigate to next period
  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewType === 'weekly') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };
  
  // Reset to current period
  const goToCurrent = () => {
    setCurrentDate(new Date());
  };
  
  // Time slots for the timesheet grid
  const timeSlots = useMemo(() => {
    // Get unique time slots from the schedule data
    const uniqueTimeSlots = new Set();
    
    scheduleData.forEach(schedule => {
      const timeKey = `${schedule.start_time}-${schedule.end_time}`;
      uniqueTimeSlots.add(timeKey);
    });
    
    // Convert to array and sort
    return Array.from(uniqueTimeSlots).sort();
  }, [scheduleData]);
  
  // Create a map of schedules by date and time with timezone correction
  const scheduleMap = useMemo(() => {
    const map = {};
    
    scheduleData.forEach(schedule => {
      // Fix timezone issue by ensuring consistent date handling
      // Create a date object from the schedule date and force it to be treated as UTC
      // to prevent any timezone shifts when we format it back to a string
      const dateObj = new Date(schedule.date + 'T00:00:00Z');
      
      // Format the date consistently as YYYY-MM-DD
      const year = dateObj.getUTCFullYear();
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getUTCDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      console.log(`Original date: ${schedule.date}, Corrected date: ${dateStr}`);
      
      const timeKey = `${schedule.start_time}-${schedule.end_time}`;
      
      if (!map[dateStr]) {
        map[dateStr] = {};
      }
      
      if (!map[dateStr][timeKey]) {
        map[dateStr][timeKey] = [];
      }
      
      map[dateStr][timeKey].push(schedule);
    });
    
    return map;
  }, [scheduleData]);
  
  // Render weekly view
  const renderWeeklyView = () => {
    // Check if there are any time slots
    if (timeSlots.length === 0) {
      return (
        <div className="no-data-message">
          No schedules found for this time period.
        </div>
      );
    }
    
    return (
      <div className="timesheet-weekly">
        <table className="timesheet-table">
          <thead>
            <tr>
              <th className="time-column">
                <span className="horizontal-text">Time Slot</span>
              </th>
              {dateRange.dates.map((date, index) => (
                <th key={index} className="day-column">
                  <span className="horizontal-text">
                    {formatDate(date)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((timeSlot, timeIndex) => (
              <tr key={timeIndex}>
                <td className="time-cell">{timeSlot}</td>
                {dateRange.dates.map((date, dateIndex) => {
                  // Create a timezone-safe date string that won't shift days
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const dateStr = `${year}-${month}-${day}`;
                  
                  // Log for debugging
                  console.log(`Checking schedules for date: ${dateStr}`);
                  
                  const employees = scheduleMap[dateStr]?.[timeSlot] || [];
                  
                  return (
                    <td key={dateIndex} className="schedule-cell">
                      {employees.map((schedule, empIndex) => (
                        <div key={empIndex} className="employee-tag">
                          {schedule.employees?.name || 'Unknown'}
                          {schedule.employees?.departments && (
                            <span className="department-tag">
                              {schedule.employees.departments.name}
                            </span>
                          )}
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  // Function to show all employees in a modal
  const showAllEmployees = (dateStr, daySchedules, date) => {
    setModalTitle(`All Schedules for ${formatDate(date)}`);
    setModalContent(daySchedules);
    setShowModal(true);
  };

  // Modal component
  const ScheduleModal = () => {
    if (!showModal) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{modalTitle}</h3>
            <button className="close-button" onClick={() => setShowModal(false)}>×</button>
          </div>
          <div className="modal-body">
            {modalContent.map((schedule, index) => (
              <div key={index} className="modal-schedule-item">
                <div className="employee-name">{schedule.employee}</div>
                <div className="schedule-time">{schedule.time}</div>
                {schedule.department && (
                  <div className="department-name">{schedule.department}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  // Render monthly view
  const renderMonthlyView = () => {
    // Calculate the day index for the first day of the month
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const firstDayIndex = firstDay.getDay();
    const firstDayWeekOffset = (firstDayIndex - systemSettings.first_day_of_week + 7) % 7;
    
    // Number of days in the month
    const daysInMonth = dateRange.dates.length;
    
    // Calculate number of weeks needed to display the month
    const weeksInMonth = Math.ceil((daysInMonth + firstDayWeekOffset) / 7);
    
    // Create calendar grid
    const calendarGrid = [];
    let dayCounter = 1;
    
    for (let i = 0; i < weeksInMonth; i++) {
      const week = [];
      for (let j = 0; j < 7; j++) {
        if ((i === 0 && j < firstDayWeekOffset) || dayCounter > daysInMonth) {
          // Empty cell
          week.push(null);
        } else {
          // Valid day
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayCounter);
          week.push(date);
          dayCounter++;
        }
      }
      calendarGrid.push(week);
    }
    
    // Get days of week names based on first_day_of_week setting
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const orderedDayNames = [];
    for (let i = 0; i < 7; i++) {
      const dayIndex = (i + systemSettings.first_day_of_week) % 7;
      orderedDayNames.push(dayNames[dayIndex]);
    }
    
    return (
      <div className="timesheet-monthly">
        <table className="calendar-table">
          <thead>
            <tr>
              {orderedDayNames.map((day, index) => (
                <th key={index}>{day.substring(0, 3)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calendarGrid.map((week, weekIndex) => (
              <tr key={weekIndex}>
                {week.map((date, dayIndex) => (
                  <td key={dayIndex} className={date ? 'day-cell' : 'empty-cell'}>
                    {date && (
                      <div className="day-content">
                        <div className="day-number">{date.getDate()}</div>
                        <div className="day-schedule">
                          {(() => {
                            const dateStr = date.toISOString().split('T')[0];
                            const daySchedules = [];
                            
                            // Fix date handling to prevent timezone issues
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const correctedDateStr = `${year}-${month}-${day}`;
                            
                            console.log(`Monthly view date: Original=${dateStr}, Corrected=${correctedDateStr}`);
                            
                            // Collect all employee schedules for this day
                            for (const timeSlot in scheduleMap[correctedDateStr] || {}) {
                              scheduleMap[correctedDateStr][timeSlot].forEach(schedule => {
                                daySchedules.push({
                                  time: timeSlot,
                                  employee: schedule.employees?.name || 'Unknown',
                                  department: schedule.employees?.departments?.name || ''
                                });
                              });
                            }
                            
                            // Display up to 3 schedules per day cell with a "+X more" indicator if needed
                            const maxToShow = 3;
                            return (
                              <>
                                {daySchedules.slice(0, maxToShow).map((schedule, index) => (
                                  <div key={index} className="mini-schedule">
                                    {schedule.employee} ({schedule.time.split('-')[0]})
                                  </div>
                                ))}
                                {daySchedules.length > maxToShow && (
                                  <div 
                                    className="more-indicator clickable"
                                    onClick={() => showAllEmployees(dateStr, daySchedules, date)}
                                  >
                                    +{daySchedules.length - maxToShow} more
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  return (
    <div className="timesheet-container">
      <h1>Employee Timesheet</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="timesheet-controls">
        <div className="view-toggle">
          <button 
            className={viewType === 'weekly' ? 'active' : ''} 
            onClick={() => setViewType('weekly')}
          >
            Weekly View
          </button>
          <button 
            className={viewType === 'monthly' ? 'active' : ''} 
            onClick={() => setViewType('monthly')}
          >
            Monthly View
          </button>
        </div>
        
        <div className="date-navigation">
          <button onClick={goToPrevious}>&lt; Previous</button>
          <span className="date-range">{formatDateRange()}</span>
          <button onClick={goToNext}>Next &gt;</button>
          <button onClick={goToCurrent} className="current-btn">Today</button>
        </div>
        
        <div className="department-filter">
          <label htmlFor="department-select">Department:</label>
          <select 
            id="department-select" 
            value={selectedDepartment} 
            onChange={(e) => setSelectedDepartment(e.target.value)}
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      {loading ? (
        <div className="loading">Loading timesheet data...</div>
      ) : (
        viewType === 'weekly' ? renderWeeklyView() : renderMonthlyView()
      )}

      {/* Add the modal component */}
      <ScheduleModal />
    </div>
  );
};

export default Timesheet; 