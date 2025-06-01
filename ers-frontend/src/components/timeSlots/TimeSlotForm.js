import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './TimeSlots.css';

const TimeSlotForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    day_of_week: '',
    start_time: '',
    end_time: '',
    name: '',
    description: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [capacityLimit, setCapacityLimit] = useState('');
  const [showCapacityForm, setShowCapacityForm] = useState(false);
  const [applyToAllDays, setApplyToAllDays] = useState(false);
  const [systemSettings, setSystemSettings] = useState({ first_day_of_week: 1 });
  
  // Fixed day names array - standard JavaScript order
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Fetch system settings first
  useEffect(() => {
    async function fetchSystemSettings() {
      try {
        const response = await axios.get('/settings');
        if (response.data && response.data.success) {
          setSystemSettings(response.data.data);
          console.log('System settings loaded:', response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch system settings:', err);
        // Default to standard first_day_of_week = 0 (Sunday)
      } finally {
        if (!isEditMode) {
          setLoading(false);
        }
      }
    }
    
    fetchSystemSettings();
  }, [isEditMode]);
  
  // Function to fetch the capacity limit for this time slot
  const fetchCapacityLimit = async () => {
    try {
      const response = await axios.get(`/time-slots/${id}/limit`);
      
      if (response.data && response.data.data) {
        setCapacityLimit(response.data.data.max_employees.toString());
      }
    } catch (err) {
      console.error('Failed to fetch capacity limit:', err);
      // Non-critical, so we don't set form error
    }
  };
  
  // Fetch time slot data if in edit mode
  useEffect(() => {
    if (!isEditMode) return;
    
    const fetchTimeSlot = async () => {
      try {
        const response = await axios.get(`/time-slots/${id}`);
        
        if (response.data && response.data.data) {
          const timeSlot = response.data.data;
          
          // Format the data for the form
          const formattedTimeSlot = {
            day_of_week: timeSlot.day_of_week.toString(),
            start_time: timeSlot.start_time ? timeSlot.start_time.substring(0, 5) : '',
            end_time: timeSlot.end_time ? timeSlot.end_time.substring(0, 5) : '',
            name: timeSlot.name || '',
            description: timeSlot.description || ''
          };
          
          setFormData(formattedTimeSlot);
          
          // If there's a capacity limit saved, fetch it
          fetchCapacityLimit();
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch time slot:', err);
        setError('Failed to load time slot data');
        setLoading(false);
      }
    };
    
    fetchTimeSlot();
  }, [id, isEditMode]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Create a time slot for a single day
  const createTimeSlotForDay = async (dayOfWeek) => {
    // Format data for API
    const timeSlotData = {
      ...formData,
      day_of_week: parseInt(dayOfWeek),
      // Ensure times are properly formatted (HH:MM:SS)
      start_time: formData.start_time + ':00',
      end_time: formData.end_time + ':00'
    };
    
    const response = await axios.post('/time-slots', timeSlotData);
    
    // If capacity limit is set, save it for the new slot
    if (capacityLimit && showCapacityForm && response.data.data && response.data.data.id) {
      const newId = response.data.data.id;
      await axios.post(`/time-slots/${newId}/limit`, {
        max_employees: parseInt(capacityLimit)
      });
    }
    
    return response.data;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      if (isEditMode) {
        // Edit mode - just update the current time slot
        // Format data for API
        const timeSlotData = {
          ...formData,
          day_of_week: parseInt(formData.day_of_week),
          // Ensure times are properly formatted (HH:MM:SS)
          start_time: formData.start_time + ':00',
          end_time: formData.end_time + ':00'
        };
        
        const response = await axios.put(`/time-slots/${id}`, timeSlotData);
        
        // If capacity limit is set, save it
        if (capacityLimit && showCapacityForm) {
          try {
            await axios.post(`/time-slots/${id}/limit`, {
              max_employees: parseInt(capacityLimit)
            });
          } catch (err) {
            console.error('Failed to set capacity limit:', err);
            // Non-critical, so we continue
          }
        }
        
        if (response.data && response.data.success) {
          navigate('/time-slots');
        } else {
          setError('Failed to update time slot');
        }
      } else {
        // Create mode - check if we're applying to all days
        if (applyToAllDays) {
          // Apply to all days
          const results = [];
          const errors = [];
          setLoading(true);
          
          // Create a time slot for each day (0-6)
          for (let day = 0; day <= 6; day++) {
            try {
              const result = await createTimeSlotForDay(day.toString());
              results.push(result);
            } catch (err) {
              console.error(`Failed to create time slot for day ${day}:`, err);
              errors.push(`Day ${dayNames[day]}: ${err.response?.data?.message || 'Unknown error'}`);
            }
          }
          
          setLoading(false);
          
          if (errors.length > 0) {
            setError(`Created ${results.length} time slots with ${errors.length} errors:\n${errors.join('\n')}`);
          } else {
            setSuccess(`Successfully created time slots for all 7 days of the week.`);
            // Delay navigation to show success message
            setTimeout(() => navigate('/time-slots'), 2000);
          }
        } else {
          // Apply to just one day
          if (!formData.day_of_week) {
            setError('Please select a day of the week');
            return;
          }
          
          const result = await createTimeSlotForDay(formData.day_of_week);
          
          if (result && result.success) {
            navigate('/time-slots');
          } else {
            setError('Failed to create time slot');
          }
        }
      }
    } catch (err) {
      console.error('Error saving time slot:', err);
      setError(err.response?.data?.message || 'Failed to save time slot. Please check your inputs.');
      setLoading(false);
    }
  };
  
  // Simple function to get day name from day number
  const getDayName = (dayNumber) => {
    return dayNames[parseInt(dayNumber)] || '';
  };
  
  if (loading) {
    return <div className="loading">Loading time slot data...</div>;
  }
  
  return (
    <div className="time-slot-form-container">
      <div className="time-slot-form-header">
        <h1>{isEditMode ? 'Edit Time Slot' : 'Create New Time Slot'}</h1>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit} className="time-slot-form">
        {/* Day of Week Selection */}
        <div className="form-group">
          <label htmlFor="day_of_week">Day of Week</label>
          <div className="help-text">
            Fixed system: 0=Sunday, 1=Monday, ..., 6=Saturday
          </div>
          {!isEditMode && (
            <div className="apply-to-all-days">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  id="apply_all_days"
                  checked={applyToAllDays}
                  onChange={() => setApplyToAllDays(!applyToAllDays)}
                />
                <span className="checkbox-label">Apply to all days of the week</span>
              </label>
              {applyToAllDays && (
                <div className="info-message">
                  This will create the same time slot for all 7 days of the week with the same start/end times.
                </div>
              )}
            </div>
          )}
          
          {!applyToAllDays && (
            <select
              id="day_of_week"
              name="day_of_week"
              value={formData.day_of_week}
              onChange={handleChange}
              required={!applyToAllDays}
              disabled={applyToAllDays}
            >
              <option value="">Select a Day</option>
              <option value="0">Sunday (0)</option>
              <option value="1">Monday (1)</option>
              <option value="2">Tuesday (2)</option>
              <option value="3">Wednesday (3)</option>
              <option value="4">Thursday (4)</option>
              <option value="5">Friday (5)</option>
              <option value="6">Saturday (6)</option>
            </select>
          )}
        </div>
        
        {/* Time Selection */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="start_time">Start Time</label>
            <input
              type="time"
              id="start_time"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="end_time">End Time</label>
            <input
              type="time"
              id="end_time"
              name="end_time"
              value={formData.end_time}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        {/* Name (Optional) */}
        <div className="form-group">
          <label htmlFor="name">Name (Optional)</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Morning Shift, Lunch Shift"
          />
        </div>
        
        {/* Description (Optional) */}
        <div className="form-group">
          <label htmlFor="description">Description (Optional)</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Add any details about this time slot"
          />
        </div>
        
        {/* Capacity Limit */}
        <div className="form-group">
          <div className="capacity-section-header">
            <label>Capacity Limit</label>
            <button 
              type="button" 
              className="toggle-capacity-button"
              onClick={() => setShowCapacityForm(!showCapacityForm)}
            >
              {showCapacityForm ? 'Hide Capacity Form' : 'Set Capacity Limit'}
            </button>
          </div>
          
          {showCapacityForm && (
            <div className="capacity-form">
              <label htmlFor="capacity">Maximum Employees</label>
              <input
                type="number"
                id="capacity"
                value={capacityLimit}
                onChange={(e) => setCapacityLimit(e.target.value)}
                min="1"
                placeholder="Enter maximum number of employees"
              />
              <div className="capacity-help">
                Set the maximum number of employees that can be scheduled for this time slot.
                {applyToAllDays && !isEditMode && (
                  <strong> This limit will apply to all days.</strong>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="form-actions">
          <button type="button" className="cancel-button" onClick={() => navigate('/time-slots')}>
            Cancel
          </button>
          <button 
            type="submit" 
            className={`submit-button ${!isEditMode && applyToAllDays ? 'all-days' : ''}`}
          >
            {isEditMode 
              ? 'Update Time Slot' 
              : (applyToAllDays 
                ? 'Create Time Slots for All Days' 
                : 'Create Time Slot')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TimeSlotForm; 