import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import '../schedules/Schedules.css';

const TimeSlotManager = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Time slot states
  const [timeSlots, setTimeSlots] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState(null);
  
  // New time slot form
  const [newTimeSlot, setNewTimeSlot] = useState({
    day_of_week: 0,
    start_time: '',
    end_time: ''
  });
  
  // Time slot limit states
  const [slotLimits, setSlotLimits] = useState({});
  const [editingLimits, setEditingLimits] = useState({});
  
  // Days of the week for display
  const daysOfWeek = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
  // Fetch time slots on component mount
  useEffect(() => {
    if (user.role !== 'admin') {
      setError('Access denied. Admin privileges required.');
      return;
    }
    
    fetchTimeSlots();
  }, [user]);
  
  // Fetch time slots from API
  const fetchTimeSlots = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/time-slots');
      setTimeSlots(response.data.data);
      
      // Fetch limits for each time slot
      const limits = {};
      for (const slot of response.data.data) {
        try {
          const limitResponse = await axios.get(`/api/time-slots/${slot.id}/limit`);
          limits[slot.id] = limitResponse.data.data.max_employees;
        } catch (err) {
          console.error(`Failed to fetch limit for time slot ${slot.id}:`, err);
          limits[slot.id] = 1; // Default to 1 if fetch fails
        }
      }
      
      setSlotLimits(limits);
      setEditingLimits(limits);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch time slots');
      setLoading(false);
    }
  };
  
  // Handle input change for new time slot form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTimeSlot(prev => ({
      ...prev,
      [name]: name === 'day_of_week' ? parseInt(value) : value
    }));
  };
  
  // Handle limit change
  const handleLimitChange = (slotId, value) => {
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 1) return;
    
    setEditingLimits(prev => ({
      ...prev,
      [slotId]: numValue
    }));
  };
  
  // Save limit change
  const saveLimit = async (slotId) => {
    try {
      setLoading(true);
      await axios.post(`/api/time-slots/${slotId}/limit`, {
        max_employees: editingLimits[slotId]
      });
      
      setSlotLimits(prev => ({
        ...prev,
        [slotId]: editingLimits[slotId]
      }));
      
      setSuccess('Time slot limit updated successfully');
      setLoading(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update time slot limit');
      setLoading(false);
    }
  };
  
  // Create new time slot
  const createTimeSlot = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (newTimeSlot.day_of_week < 0 || newTimeSlot.day_of_week > 6) {
      setError('Invalid day of week');
      return;
    }
    
    if (!newTimeSlot.start_time || !newTimeSlot.end_time) {
      setError('Please provide start and end times');
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.post('/api/time-slots', newTimeSlot);
      
      // Add new time slot to the list
      setTimeSlots(prev => [...prev, response.data.data]);
      
      // Set default limit for new slot
      setSlotLimits(prev => ({
        ...prev,
        [response.data.data.id]: 1
      }));
      
      setEditingLimits(prev => ({
        ...prev,
        [response.data.data.id]: 1
      }));
      
      // Reset form and hide it
      setNewTimeSlot({
        day_of_week: 0,
        start_time: '',
        end_time: ''
      });
      setShowAddForm(false);
      
      setSuccess('Time slot created successfully');
      setLoading(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create time slot');
      setLoading(false);
    }
  };
  
  // Delete time slot
  const deleteTimeSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to delete this time slot?')) {
      return;
    }
    
    try {
      setLoading(true);
      await axios.delete(`/api/time-slots/${slotId}`);
      
      // Remove slot from the list
      setTimeSlots(prev => prev.filter(slot => slot.id !== slotId));
      
      // Remove from limits
      const newLimits = { ...slotLimits };
      delete newLimits[slotId];
      setSlotLimits(newLimits);
      
      const newEditingLimits = { ...editingLimits };
      delete newEditingLimits[slotId];
      setEditingLimits(newEditingLimits);
      
      setSuccess('Time slot deleted successfully');
      setLoading(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete time slot');
      setLoading(false);
    }
  };
  
  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    
    return `${displayHour}:${minutes} ${ampm}`;
  };
  
  // Group time slots by day of week for easier display
  const timeSlotsByDay = timeSlots.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) {
      acc[slot.day_of_week] = [];
    }
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {});
  
  return (
    <div className="time-slot-manager">
      <h2>Manage Time Slots</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div className="action-buttons">
        <button 
          className="primary-button"
          onClick={() => setShowAddForm(!showAddForm)}
          disabled={loading}
        >
          {showAddForm ? 'Cancel' : 'Add New Time Slot'}
        </button>
      </div>
      
      {showAddForm && (
        <form className="form-container" onSubmit={createTimeSlot}>
          <h3>Add New Time Slot</h3>
          
          <div className="form-group">
            <label htmlFor="day_of_week">Day of Week:</label>
            <select
              id="day_of_week"
              name="day_of_week"
              value={newTimeSlot.day_of_week}
              onChange={handleInputChange}
              disabled={loading}
            >
              {daysOfWeek.map((day, index) => (
                <option key={index} value={index}>{day}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="start_time">Start Time:</label>
            <input
              type="time"
              id="start_time"
              name="start_time"
              value={newTimeSlot.start_time}
              onChange={handleInputChange}
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="end_time">End Time:</label>
            <input
              type="time"
              id="end_time"
              name="end_time"
              value={newTimeSlot.end_time}
              onChange={handleInputChange}
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-button" 
              onClick={() => setShowAddForm(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-button" 
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Time Slot'}
            </button>
          </div>
        </form>
      )}
      
      <div className="time-slots-by-day">
        {daysOfWeek.map((day, dayIndex) => (
          <div key={dayIndex} className="day-section">
            <h3>{day}</h3>
            
            <div className="time-slot-list">
              {timeSlotsByDay[dayIndex]?.map(slot => (
                <div key={slot.id} className="time-slot-card">
                  <div className="time-slot-header">
                    <span className="time-slot-day">{daysOfWeek[slot.day_of_week]}</span>
                    <div className="time-slot-actions">
                      <button 
                        className="delete-button"
                        onClick={() => deleteTimeSlot(slot.id)}
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  <div className="time-slot-details">
                    <p><strong>Time:</strong> {formatTime(slot.start_time)} - {formatTime(slot.end_time)}</p>
                  </div>
                  
                  <div className="time-slot-limit">
                    <span>Max Employees:</span>
                    <input
                      type="number"
                      className="time-slot-limit-input"
                      value={editingLimits[slot.id] || 1}
                      onChange={(e) => handleLimitChange(slot.id, e.target.value)}
                      min="1"
                      disabled={loading}
                    />
                    <button
                      className="save-button"
                      onClick={() => saveLimit(slot.id)}
                      disabled={loading || editingLimits[slot.id] === slotLimits[slot.id]}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ))}
              
              {!timeSlotsByDay[dayIndex] && (
                <p>No time slots for {day}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimeSlotManager; 