import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { FaPlus, FaCheck, FaTimes, FaClock } from 'react-icons/fa';
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
  const [existingBookings, setExistingBookings] = useState({});
  
  // Schedule selections: { employeeId: { dayIndex: [timeSlotIds] } }
  const [scheduleSelections, setScheduleSelections] = useState({});
  // Track bookings to be canceled: { employeeId: { dayIndex: [timeSlotIds] } }
  const [bookingsToCancel, setBookingsToCancel] = useState({});
  const [notes, setNotes] = useState('');
  
  // Modal state for time slot selection
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [modalContext, setModalContext] = useState({ employeeId: null, dayIndex: null, employeeName: '', dayName: '' });

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

  // Fetch employees, time slots, and existing bookings
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
          const timeSlotData = timeSlotsResponse.data.data || [];
          setTimeSlots(timeSlotData);
        }
        
        // Note: fetchExistingBookings will be called separately when weekDates are ready
        
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
      const slotsForDay = timeSlots.filter(slot => slot.day_of_week === day.value);
      slotsByDay[index] = slotsForDay;
    });
    
    return slotsByDay;
  }, [timeSlots, getOrderedDays]);

  // Fetch existing bookings when week dates are ready
  useEffect(() => {
    if (weekDates.length > 0 && employees.length > 0) {
      fetchExistingBookings();
    }
  }, [weekDates, employees]);

  // Handle time slot selection for an employee on a specific day
  const handleTimeSlotSelection = (employeeId, dayIndex, timeSlotId, isSelected) => {
    const isAlreadyBooked = isTimeSlotAlreadyBooked(employeeId, dayIndex, timeSlotId);
    
    if (isSelected) {
      // If checking a time slot
      if (isAlreadyBooked) {
        // If it's already booked and we're checking it, remove it from cancellations
        setBookingsToCancel(prev => {
          const newCancellations = { ...prev };
          if (newCancellations[employeeId]?.[dayIndex]) {
            newCancellations[employeeId][dayIndex] = newCancellations[employeeId][dayIndex].filter(id => id !== timeSlotId);
          }
          return newCancellations;
        });
      } else {
        // If it's not already booked, add it to new selections
        setScheduleSelections(prev => {
          const newSelections = { ...prev };
          if (!newSelections[employeeId]) {
            newSelections[employeeId] = {};
          }
          if (!newSelections[employeeId][dayIndex]) {
            newSelections[employeeId][dayIndex] = [];
          }
          if (!newSelections[employeeId][dayIndex].includes(timeSlotId)) {
            newSelections[employeeId][dayIndex] = [...newSelections[employeeId][dayIndex], timeSlotId];
          }
          return newSelections;
        });
      }
    } else {
      // If unchecking a time slot
      if (isAlreadyBooked) {
        // If it's already booked and we're unchecking it, add it to cancellations
        setBookingsToCancel(prev => {
          const newCancellations = { ...prev };
          if (!newCancellations[employeeId]) {
            newCancellations[employeeId] = {};
          }
          if (!newCancellations[employeeId][dayIndex]) {
            newCancellations[employeeId][dayIndex] = [];
          }
          if (!newCancellations[employeeId][dayIndex].includes(timeSlotId)) {
            newCancellations[employeeId][dayIndex] = [...newCancellations[employeeId][dayIndex], timeSlotId];
          }
          return newCancellations;
        });
      } else {
        // If it's not already booked, remove it from new selections
        setScheduleSelections(prev => {
          const newSelections = { ...prev };
          if (newSelections[employeeId]?.[dayIndex]) {
            newSelections[employeeId][dayIndex] = newSelections[employeeId][dayIndex].filter(id => id !== timeSlotId);
          }
          return newSelections;
        });
      }
    }
  };

  // Check if a time slot is selected for an employee on a day (including existing bookings)
  const isTimeSlotSelected = (employeeId, dayIndex, timeSlotId) => {
    // Check if it's in current selections
    const isSelected = scheduleSelections[employeeId]?.[dayIndex]?.includes(timeSlotId) || false;
    
    // Check if it's already booked in the database
    const isAlreadyBooked = existingBookings[employeeId]?.[dayIndex]?.includes(timeSlotId) || false;
    
    // Check if it's marked for cancellation
    const isMarkedForCancellation = bookingsToCancel[employeeId]?.[dayIndex]?.includes(timeSlotId) || false;
    
    // Return true if it's selected OR (already booked AND not marked for cancellation)
    return isSelected || (isAlreadyBooked && !isMarkedForCancellation);
  };

  // Check if a time slot is already booked in the database (not just selected)
  const isTimeSlotAlreadyBooked = (employeeId, dayIndex, timeSlotId) => {
    return existingBookings[employeeId]?.[dayIndex]?.includes(timeSlotId) || false;
  };

  // Open time slot selection modal
  const openTimeSlotModal = (employeeId, dayIndex) => {
    const employee = employees.find(emp => emp.id === employeeId);
    const day = getOrderedDays[dayIndex];
    
    setModalContext({
      employeeId,
      dayIndex,
      employeeName: employee?.name || 'Unknown Employee',
      dayName: day?.displayName || 'Unknown Day'
    });
    setShowTimeSlotModal(true);
  };

  // Close time slot selection modal
  const closeTimeSlotModal = () => {
    setShowTimeSlotModal(false);
    setModalContext({ employeeId: null, dayIndex: null, employeeName: '', dayName: '' });
  };

  // Store full booking data for cancellation
  const [existingBookingsData, setExistingBookingsData] = useState([]);

  // Fetch existing bookings for the current week
  const fetchExistingBookings = async () => {
    try {
      if (weekDates.length === 0) return;
      
      const weekStart = weekDates[0].toISOString().split('T')[0];
      const weekEnd = weekDates[6].toISOString().split('T')[0];
      
      const response = await axios.get(`/schedules?start_date=${weekStart}&end_date=${weekEnd}`);
      
      if (response.data?.success) {
        const bookings = response.data.data || [];
        const bookingMap = {};
        
        // Store full booking data for cancellation
        setExistingBookingsData(bookings);
        
        bookings.forEach(booking => {
          const employeeId = booking.employee_id;
          const timeSlotId = booking.time_slot_id;
          
          if (!bookingMap[employeeId]) {
            bookingMap[employeeId] = {};
          }
          
          // Find which day this booking belongs to
          const bookingDate = new Date(booking.date);
          const dayIndex = weekDates.findIndex(date => 
            date.toDateString() === bookingDate.toDateString()
          );
          
          if (dayIndex !== -1) {
            if (!bookingMap[employeeId][dayIndex]) {
              bookingMap[employeeId][dayIndex] = [];
            }
            bookingMap[employeeId][dayIndex].push(timeSlotId);
          }
        });
        
        setExistingBookings(bookingMap);
      }
    } catch (err) {
      console.error('Error fetching existing bookings:', err);
      // Don't show error to user, just log it
    }
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
      
      // Build schedule requests (only for new bookings, not existing ones)
      Object.entries(scheduleSelections).forEach(([employeeId, employeeDays]) => {
        Object.entries(employeeDays).forEach(([dayIndex, timeSlotIds]) => {
          if (timeSlotIds.length > 0) {
            timeSlotIds.forEach(timeSlotId => {
              // Only add to schedule requests if it's not already booked
              if (!isTimeSlotAlreadyBooked(employeeId, parseInt(dayIndex), timeSlotId)) {
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
              }
            });
          }
        });
      });
      
      // Handle cancellations
      const cancellationPromises = [];
      Object.entries(bookingsToCancel).forEach(([employeeId, employeeDays]) => {
        Object.entries(employeeDays).forEach(([dayIndex, timeSlotIds]) => {
          if (timeSlotIds.length > 0) {
            timeSlotIds.forEach(timeSlotId => {
              // Find the existing booking to cancel
              const bookingToCancel = existingBookingsData.find(booking => 
                booking.employee_id === employeeId && 
                booking.time_slot_id === timeSlotId &&
                new Date(booking.date).toDateString() === weekDates[parseInt(dayIndex)].toDateString()
              );
              
              if (bookingToCancel) {
                cancellationPromises.push(
                  axios.delete(`/schedules/${bookingToCancel.id}`)
                );
              }
            });
          }
        });
      });

      console.log('Submitting schedule requests:', scheduleRequests);
      console.log('Cancelling bookings:', cancellationPromises.length);
      
      // Submit all requests (both new bookings and cancellations)
      const newBookingPromises = scheduleRequests.map(request => 
        axios.post('/schedules', request)
      );
      
      const allPromises = [...newBookingPromises, ...cancellationPromises];
      const responses = await Promise.all(allPromises);
      
      const successCount = responses.filter(response => response.data?.success || response.status === 200).length;
      const errorCount = responses.length - successCount;
      
      if (errorCount === 0) {
        setSuccess(`Successfully processed ${newBookingPromises.length} new bookings and ${cancellationPromises.length} cancellations!`);
        // Clear selections after successful submission
        setScheduleSelections({});
        setBookingsToCancel({});
        setNotes('');
        // Refresh existing bookings
        await fetchExistingBookings();
      } else {
        setError(`Processed ${successCount} requests, but ${errorCount} failed. Please check for conflicts.`);
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
    setBookingsToCancel({});
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
                        {(() => {
                          const availableSlots = timeSlotsByDay[dayIndex] || [];
                          const selectedSlots = getSelectedTimeSlots(employee.id, dayIndex);
                          const hasSlots = availableSlots.length > 0;
                          
                          return (
                            <div 
                              className={`timeslot-cell-content ${hasSlots ? 'clickable' : 'no-slots'} ${selectedSlots.length > 0 ? 'has-selections' : ''}`}
                              onClick={() => hasSlots && openTimeSlotModal(employee.id, dayIndex)}
                              title={hasSlots ? `${availableSlots.length} slots available${selectedSlots.length > 0 ? `, ${selectedSlots.length} selected` : ''}` : 'No time slots available'}
                            >
                              {!hasSlots ? (
                                <FaTimes className="slot-icon disabled" />
                              ) : selectedSlots.length > 0 ? (
                                <div className="slot-icon-container">
                                  <FaCheck className="slot-icon selected" />
                                  <span className="slot-count">{selectedSlots.length}</span>
                                </div>
                              ) : (
                                <div className="slot-icon-container">
                                  <FaPlus className="slot-icon available" />
                                  <span className="slot-count">{availableSlots.length}</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
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

      {/* Time Slot Selection Modal */}
      {showTimeSlotModal && (
        <div className="modal-overlay" onClick={closeTimeSlotModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Time Slots</h4>
              <span className="modal-subtitle">
                {modalContext.employeeName} • {modalContext.dayName}
              </span>
              <button className="btn-close" onClick={closeTimeSlotModal}>×</button>
            </div>
            
            <div className="modal-body">
              {timeSlotsByDay[modalContext.dayIndex]?.map(timeSlot => {
                const isAlreadyBooked = isTimeSlotAlreadyBooked(modalContext.employeeId, modalContext.dayIndex, timeSlot.id);
                const isSelected = isTimeSlotSelected(modalContext.employeeId, modalContext.dayIndex, timeSlot.id);
                const isMarkedForCancellation = bookingsToCancel[modalContext.employeeId]?.[modalContext.dayIndex]?.includes(timeSlot.id) || false;
                
                return (
                  <div key={timeSlot.id} className="timeslot-option">
                    <label className={`form-check ${isAlreadyBooked ? 'already-booked' : ''} ${isMarkedForCancellation ? 'marked-for-cancellation' : ''}`}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={isSelected}
                        onChange={(e) => handleTimeSlotSelection(
                          modalContext.employeeId, 
                          modalContext.dayIndex, 
                          timeSlot.id, 
                          e.target.checked
                        )}
                      />
                      <div className="timeslot-info">
                        <div className="timeslot-name">
                          <FaClock className="time-icon" />
                          {timeSlot.name || 'Time Slot'}
                          {isAlreadyBooked && !isMarkedForCancellation && <span className="booked-badge">Already Booked</span>}
                          {isMarkedForCancellation && <span className="cancel-badge">Will Cancel</span>}
                        </div>
                        <div className="timeslot-time">
                          {timeSlot.start_time?.substring(0,5)} - {timeSlot.end_time?.substring(0,5)}
                        </div>
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeTimeSlotModal}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={closeTimeSlotModal}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkScheduleForm; 