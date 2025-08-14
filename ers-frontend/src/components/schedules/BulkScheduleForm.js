import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './BulkScheduleForm.css';

const BulkScheduleForm = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  
  // State variables
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [employees, setEmployees] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [systemSettings, setSystemSettings] = useState({ first_day_of_week: 1 });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [currentDate] = useState(new Date());
  
  // Schedule selections: { employeeId: { dayIndex: [timeSlotIds] } }
  const [scheduleSelections, setScheduleSelections] = useState({});
  const [notes, setNotes] = useState('');

  // Fetch system settings
  useEffect(() => {
    const fetchSystemSettings = async () => {
      try {
        const response = await axios.get('/settings');
        if (response.data?.success && response.data.data) {
          setSystemSettings(response.data.data);
        }
        setSettingsLoaded(true);
      } catch (err) {
        console.error('Failed to fetch system settings:', err);
        setError('Failed to load system settings. Default values will be used.');
        setSettingsLoaded(true);
      }
    };
    
    fetchSystemSettings();
  }, []);

  // Fetch employees and time slots
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [employeesResponse, timeSlotsResponse] = await Promise.all([
          axios.get('/employees'),
          axios.get('/time-slots')
        ]);
        
        if (employeesResponse.data?.success) {
          setEmployees(employeesResponse.data.data || []);
        }
        
        if (timeSlotsResponse.data?.success) {
          setTimeSlots(timeSlotsResponse.data.data || []);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load employees or time slots');
        setLoading(false);
      }
    };
    
    if (settingsLoaded) {
      fetchData();
    }
  }, [settingsLoaded]);

  // Calculate week dates based on system settings
  const weekDates = useMemo(() => {
    if (!settingsLoaded) return [];
    
    const today = new Date(currentDate);
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const firstDayOfWeek = systemSettings.first_day_of_week; // 0 = Saturday, 1 = Sunday, etc.
    
    // Convert system setting to JS day format
    const jsFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Convert to JS format
    
    // Calculate days to subtract to get to start of week
    let daysToSubtract = (currentDay - jsFirstDay + 7) % 7;
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysToSubtract);
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  }, [currentDate, systemSettings, settingsLoaded]);

  // Get ordered days based on system settings
  const getOrderedDays = useMemo(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const systemDayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    const orderedDays = [];
    for (let i = 0; i < 7; i++) {
      const systemDay = (systemSettings.first_day_of_week + i) % 7;
      const jsDay = systemDay === 0 ? 6 : systemDay - 1; // Convert to JS format
      
      orderedDays.push({
        value: systemDay,
        name: systemDayNames[systemDay],
        jsDay: jsDay,
        displayName: dayNames[jsDay]
      });
    }
    
    return orderedDays;
  }, [systemSettings]);

  // Group time slots by day
  const timeSlotsByDay = useMemo(() => {
    const slotsByDay = {};
    
    getOrderedDays.forEach((day, index) => {
      slotsByDay[index] = timeSlots.filter(slot => slot.day_of_week === day.value);
    });
    
    return slotsByDay;
  }, [timeSlots, getOrderedDays]);

  // Handle time slot selection for an employee on a specific day
  const handleTimeSlotSelection = (employeeId, dayIndex, timeSlotId, isSelected) => {
    setScheduleSelections(prev => {
      const newSelections = { ...prev };
      
      if (!newSelections[employeeId]) {
        newSelections[employeeId] = {};
      }
      
      if (!newSelections[employeeId][dayIndex]) {
        newSelections[employeeId][dayIndex] = [];
      }
      
      if (isSelected) {
        // Add time slot if not already selected
        if (!newSelections[employeeId][dayIndex].includes(timeSlotId)) {
          newSelections[employeeId][dayIndex] = [...newSelections[employeeId][dayIndex], timeSlotId];
        }
      } else {
        // Remove time slot
        newSelections[employeeId][dayIndex] = newSelections[employeeId][dayIndex].filter(id => id !== timeSlotId);
      }
      
      return newSelections;
    });
  };

  // Check if a time slot is selected for an employee on a day
  const isTimeSlotSelected = (employeeId, dayIndex, timeSlotId) => {
    return scheduleSelections[employeeId]?.[dayIndex]?.includes(timeSlotId) || false;
  };

  // Get selected time slots for an employee on a day
  const getSelectedTimeSlots = (employeeId, dayIndex) => {
    return scheduleSelections[employeeId]?.[dayIndex] || [];
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (Object.keys(scheduleSelections).length === 0) {
      setError('Please select at least one time slot for any employee');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const scheduleRequests = [];
      
      // Build schedule requests
      Object.entries(scheduleSelections).forEach(([employeeId, employeeDays]) => {
        Object.entries(employeeDays).forEach(([dayIndex, timeSlotIds]) => {
          if (timeSlotIds.length > 0) {
            timeSlotIds.forEach(timeSlotId => {
              const date = weekDates[parseInt(dayIndex)];
              const timeSlot = timeSlots.find(ts => ts.id === timeSlotId);
              
              if (timeSlot && date) {
                scheduleRequests.push({
                  employee_id: employeeId,
                  date: date.toISOString().split('T')[0],
                  time_slot_id: timeSlotId,
                  start_time: timeSlot.start_time,
                  end_time: timeSlot.end_time,
                  notes: notes || 'Bulk schedule creation',
                  status: 'pending'
                });
              }
            });
          }
        });
      });
      
      console.log('Submitting schedule requests:', scheduleRequests);
      
      // Submit all schedule requests
      const promises = scheduleRequests.map(request => 
        axios.post('/schedules', request)
      );
      
      const responses = await Promise.all(promises);
      
      const successCount = responses.filter(response => response.data?.success).length;
      const errorCount = responses.length - successCount;
      
      if (errorCount === 0) {
        setSuccess(`Successfully created ${successCount} schedule requests!`);
        // Clear selections after successful submission
        setScheduleSelections({});
        setNotes('');
      } else {
        setError(`Created ${successCount} schedules, but ${errorCount} failed. Please check for conflicts.`);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error submitting schedules:', err);
      setError('Failed to submit schedule requests. Please try again.');
      setLoading(false);
    }
  };

  // Clear all selections
  const clearAllSelections = () => {
    setScheduleSelections({});
  };

  // Get total number of selected slots
  const getTotalSelections = () => {
    let total = 0;
    Object.values(scheduleSelections).forEach(employeeDays => {
      Object.values(employeeDays).forEach(timeSlotIds => {
        total += timeSlotIds.length;
      });
    });
    return total;
  };

  if (loading && employees.length === 0) {
    return <div className="loading">Loading employees and time slots...</div>;
  }

  return (
    <div className="schedule-form-container">
      <div className="form-header">
        <h2>Bulk Schedule Creation</h2>
        <p>Select time slots for multiple employees across the week</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit}>
        {/* Week Display */}
        <div className="form-section">
          <h3>Week of: {weekDates[0]?.toLocaleDateString()} - {weekDates[6]?.toLocaleDateString()}</h3>
          <div className="bulk-form-info">
            <p>Total selections: <strong>{getTotalSelections()}</strong></p>
            <button 
              type="button" 
              onClick={clearAllSelections}
              className="clear-btn"
              style={{ marginLeft: '20px', padding: '5px 10px' }}
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Schedule Matrix */}
        <div className="form-section">
          <div className="bulk-schedule-container">
            <table className="bulk-schedule-table">
              <thead>
                <tr>
                  <th style={{ width: '200px' }}>Employee</th>
                  {getOrderedDays.map((day, index) => (
                    <th key={index} style={{ width: '150px' }}>
                      {day.displayName}
                      <br />
                      <span style={{ fontSize: '0.8em', fontWeight: 'normal' }}>
                        {weekDates[index]?.toLocaleDateString()}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(employee => (
                  <tr key={employee.id}>
                    <td className="employee-cell">
                      <div className="employee-info">
                        <div className="employee-name">{employee.name}</div>
                        <div className="employee-details">
                          {employee.position} | {employee.email}
                        </div>
                      </div>
                    </td>
                    {getOrderedDays.map((day, dayIndex) => (
                      <td key={dayIndex} className="timeslot-cell">
                        <div className="timeslot-selection">
                          {timeSlotsByDay[dayIndex]?.map(timeSlot => (
                            <label key={timeSlot.id} className="timeslot-checkbox">
                              <input
                                type="checkbox"
                                checked={isTimeSlotSelected(employee.id, dayIndex, timeSlot.id)}
                                onChange={(e) => handleTimeSlotSelection(
                                  employee.id, 
                                  dayIndex, 
                                  timeSlot.id, 
                                  e.target.checked
                                )}
                              />
                              <span className="timeslot-label">
                                {timeSlot.name || `${timeSlot.start_time} - ${timeSlot.end_time}`}
                              </span>
                            </label>
                          ))}
                          {timeSlotsByDay[dayIndex]?.length === 0 && (
                            <span className="no-slots">No slots available</span>
                          )}
                        </div>
                        {getSelectedTimeSlots(employee.id, dayIndex).length > 0 && (
                          <div className="selected-count">
                            {getSelectedTimeSlots(employee.id, dayIndex).length} selected
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes Section */}
        <div className="form-section">
          <h3>General Notes</h3>
          <div className="form-group">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add general notes for all schedule requests..."
              rows={3}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-btn" 
            onClick={() => navigate('/schedules')}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-btn" 
            disabled={loading || getTotalSelections() === 0}
          >
            {loading ? 'Creating Schedules...' : `Create ${getTotalSelections()} Schedule Requests`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BulkScheduleForm; 