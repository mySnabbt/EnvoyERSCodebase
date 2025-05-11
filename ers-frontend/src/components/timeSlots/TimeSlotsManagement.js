import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './TimeSlots.css';

const TimeSlotsManagement = () => {
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    day_of_week: ''
  });
  const [systemSettings, setSystemSettings] = useState({ first_day_of_week: 0 });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Fixed day names array (using standard JavaScript convention)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Fetch system settings first
  useEffect(() => {
    async function fetchSystemSettings() {
      try {
        const response = await axios.get('/settings');
        if (response.data && response.data.success) {
          setSystemSettings(response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch system settings:', err);
        // Default to standard first_day_of_week = 0 (Sunday)
      } finally {
        setSettingsLoaded(true);
      }
    }
    
    fetchSystemSettings();
  }, []);

  const fetchTimeSlots = useCallback(async () => {
    if (!settingsLoaded) return;
    
    try {
      let url = '/time-slots';
      
      // Add day of week filter if selected
      if (filter.day_of_week !== '') {
        url += `?day_of_week=${filter.day_of_week}`;
      }
      
      const response = await axios.get(url);
      
      if (response.data && response.data.data) {
        // Sort by day of week and then by start time
        const sortedTimeSlots = response.data.data.sort((a, b) => {
          if (a.day_of_week !== b.day_of_week) {
            return a.day_of_week - b.day_of_week;
          }
          return a.start_time.localeCompare(b.start_time);
        });
        
        setTimeSlots(sortedTimeSlots);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching time slots:', err);
      setError('Failed to load time slots. Please try again.');
      setLoading(false);
    }
  }, [filter, settingsLoaded]);

  useEffect(() => {
    if (settingsLoaded) {
      fetchTimeSlots();
    }
  }, [fetchTimeSlots, settingsLoaded]);

  // Simply get the day name based on the day number (0=Sunday, 1=Monday, etc.)
  const getDayName = (dayNumber) => {
    return dayNames[dayNumber] || 'Unknown';
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="time-slots-container">
      <div className="time-slots-header">
        <h1>Time Slots Management</h1>
        <Link to="/time-slots/new" className="create-button">
          Create New Time Slot
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="filters-container">
        <div className="filter-group">
          <label htmlFor="day_of_week">Filter by Day:</label>
          <select
            id="day_of_week"
            name="day_of_week"
            value={filter.day_of_week}
            onChange={handleFilterChange}
          >
            <option value="">All Days</option>
            <option value="0">Sunday (0)</option>
            <option value="1">Monday (1)</option>
            <option value="2">Tuesday (2)</option>
            <option value="3">Wednesday (3)</option>
            <option value="4">Thursday (4)</option>
            <option value="5">Friday (5)</option>
            <option value="6">Saturday (6)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading time slots...</div>
      ) : timeSlots.length === 0 ? (
        <div className="no-data">
          <p>No time slots found.</p>
          <p>Click "Create New Time Slot" to add your first time slot.</p>
        </div>
      ) : (
        <div className="time-slots-list">
          {timeSlots.map(slot => (
            <div key={slot.id} className="time-slot-card">
              <div className="time-slot-header">
                <h3>{getDayName(slot.day_of_week)}</h3>
                {slot.name && <span className="slot-name">{slot.name}</span>}
              </div>
              
              <div className="time-slot-time">
                {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
              </div>
              
              {slot.description && (
                <div className="time-slot-description">
                  {slot.description}
                </div>
              )}
              
              <div className="time-slot-actions">
                <Link to={`/time-slots/${slot.id}/edit`} className="edit-button">
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimeSlotsManagement;