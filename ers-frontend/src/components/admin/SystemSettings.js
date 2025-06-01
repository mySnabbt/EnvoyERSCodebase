import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import '../schedules/Schedules.css';

const SystemSettings = () => {
  const { currentUser, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // System settings state
  const [firstDayOfWeek, setFirstDayOfWeek] = useState(1);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  
  // Day names for display - fixed order (standard JavaScript)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Fetch current system settings
  useEffect(() => {
    if (!currentUser) {
      // Wait for user to be loaded
      return;
    }
    
    if (!isAdmin) {
      setError('Access denied. Admin privileges required.');
      return;
    }
    
    fetchSystemSettings();
  }, [currentUser, isAdmin]);
  
  const fetchSystemSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/settings');
      
      if (response.data && response.data.success) {
        const settings = response.data.data;
        
        // Set first day of week if available
        if (settings.first_day_of_week !== undefined) {
          setFirstDayOfWeek(settings.first_day_of_week);
        }
        
        setSettingsLoaded(true);
      }
    } catch (err) {
      console.error('Failed to fetch system settings:', err);
      setError('Failed to load system settings. You may need to set them for the first time.');
      // Still mark as loaded if we couldn't fetch existing settings
      setSettingsLoaded(true);
    } finally {
      setLoading(false);
    }
  };
  
  const saveSystemSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await axios.post('/settings', {
        first_day_of_week: firstDayOfWeek
      });
      
      if (response.data && response.data.success) {
        setSuccess('System settings saved successfully.');
        
        // Show warning about needed restart
        setTimeout(() => {
          setSuccess('System settings saved successfully. Please note that some changes might require restarting the application or refreshing your browser to take effect.');
        }, 1000);
      } else {
        setError('Failed to save system settings.');
      }
    } catch (err) {
      console.error('Failed to save system settings:', err);
      setError('Failed to save system settings: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };
  
  // Function to get the display day number based on first day of week
  const getDisplayDayNumber = (dayIndex) => {
    // If firstDayOfWeek is 0 (Sunday), then Sunday is 0, Monday is 1, etc.
    // If firstDayOfWeek is 1 (Monday), then Monday is 0, Tuesday is 1, Sunday is 6, etc.
    return (dayIndex - firstDayOfWeek + 7) % 7;
  };
  
  if (!currentUser) {
    return <div className="loading">Loading user data...</div>;
  }
  
  if (!isAdmin) {
    return <div className="error-message">Access denied. Admin privileges required.</div>;
  }
  
  return (
    <div className="system-settings">
      <h2>System Settings</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      {loading && !settingsLoaded ? (
        <div className="loading">Loading system settings...</div>
      ) : (
        <form className="form-container" onSubmit={saveSystemSettings}>
          <div className="form-section">
            <h3>Calendar Settings</h3>
            
            <div className="form-group">
              <label htmlFor="first_day_of_week">First Day of Week</label>
              <div className="help-text">
                This setting affects how days are numbered throughout the system.
                Day 0 will be the first day of the week, Day 1 the second day, etc.
              </div>
              <select
                id="first_day_of_week"
                value={firstDayOfWeek}
                onChange={(e) => setFirstDayOfWeek(parseInt(e.target.value))}
                disabled={loading}
              >
                {dayNames.map((day, index) => (
                  <option key={index} value={index}>{day}</option>
                ))}
              </select>
            </div>
            
            <div className="day-numbering-info">
              <h4>Day Numbering with Current Setting</h4>
              <p className="help-text">
                Note: These are display numbers only. In the database, days are consistently stored using JavaScript convention: 0=Sunday, 1=Monday, etc.
              </p>
              <table className="day-numbering-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Display Number</th>
                    <th>System Number (Fixed)</th>
                  </tr>
                </thead>
                <tbody>
                  {dayNames.map((day, index) => {
                    // Calculate the display day number based on firstDayOfWeek
                    const displayDayNumber = getDisplayDayNumber(index);
                    return (
                      <tr key={index}>
                        <td>{day}</td>
                        <td>{displayDayNumber}</td>
                        <td>{index}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="form-actions">
            <button 
              type="submit" 
              className="primary-button"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
      
      <div className="settings-info">
        <h3>Important Note</h3>
        <p>
          The "First Day of Week" setting affects the visual presentation of your weekly calendar.
          Throughout the system, we use a consistent day numbering where 0=Sunday, 1=Monday, etc.
        </p>
        <p className="warning">
          It is recommended to make this change before adding any time slots or schedules 
          to the system to avoid confusion. This setting only affects the display, not the underlying data.
        </p>
      </div>
    </div>
  );
};

export default SystemSettings; 