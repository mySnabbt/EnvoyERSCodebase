import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import './Schedules.css';

const ScheduleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useContext(AuthContext);
  
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeSlot, setTimeSlot] = useState(null);
  
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const response = await axios.get(`/schedules/${id}`);
        
        if (response.data && response.data.data) {
          setSchedule(response.data.data);
        } else {
          setError('Schedule not found');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching schedule:', err);
        setError('Failed to load schedule details. Please try again.');
        setLoading(false);
      }
    };
    
    fetchSchedule();
  }, [id]);
  
  useEffect(() => {
    if (schedule && schedule.time_slot_id) {
      const fetchTimeSlot = async () => {
        try {
          const response = await axios.get(`/time-slots/${schedule.time_slot_id}`);
          if (response.data && response.data.data) {
            setTimeSlot(response.data.data);
          }
        } catch (err) {
          console.error('Error fetching time slot:', err);
        }
      };
      
      fetchTimeSlot();
    }
  }, [schedule]);
  
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) {
      return;
    }
    
    try {
      await axios.delete(`/schedules/${id}`);
      navigate('/schedules');
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError('Failed to delete schedule');
    }
  };
  
  const handleApprove = async () => {
    try {
      const response = await axios.patch(`/schedules/${id}/approve`);
      
      if (response.data && response.data.data) {
        setSchedule(response.data.data);
      }
    } catch (err) {
      console.error('Error approving schedule:', err);
      setError('Failed to approve schedule');
    }
  };
  
  const handleReject = async () => {
    const reason = window.prompt('Please provide a reason for rejection:');
    
    if (reason === null) {
      return; // User cancelled
    }
    
    try {
      const response = await axios.patch(`/schedules/${id}/reject`, {
        rejection_reason: reason
      });
      
      if (response.data && response.data.data) {
        setSchedule(response.data.data);
      }
    } catch (err) {
      console.error('Error rejecting schedule:', err);
      setError('Failed to reject schedule');
    }
  };
  
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };
  
  const formatTime = (timeString) => {
    try {
      // Parse time string (e.g., "14:30:00")
      const [hours, minutes] = timeString.split(':');
      
      // Format with AM/PM
      const period = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
      
      return `${hour12}:${minutes} ${period}`;
    } catch (e) {
      return timeString;
    }
  };
  
  if (loading) {
    return <div className="loading">Loading schedule details...</div>;
  }
  
  if (error) {
    return <div className="error-container">
      <div className="error-message">{error}</div>
      <Link to="/schedules" className="back-button">Back to Schedules</Link>
    </div>;
  }
  
  if (!schedule) {
    return <div className="not-found">Schedule not found</div>;
  }
  
  const statusColors = {
    pending: '#f39c12', // Orange
    approved: '#27ae60', // Green
    rejected: '#e74c3c'  // Red
  };
  
  const getDayName = (dayNumber) => {
    const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    return days[dayNumber];
  };
  
  return (
    <div className="schedule-detail-container">
      <div className="schedule-detail-header">
        <h1>Schedule Details</h1>
        <div className="schedule-actions">
          <Link to="/schedules" className="back-button">Back to Schedules</Link>
          
          {schedule.status === 'pending' && (
            <>
              <Link to={`/schedules/edit/${schedule.id}`} className="edit-button">
                Edit
              </Link>
              
              {isAdmin && (
                <>
                  <button className="approve-button" onClick={handleApprove}>
                    Approve
                  </button>
                  <button className="reject-button" onClick={handleReject}>
                    Reject
                  </button>
                </>
              )}
            </>
          )}
          
          {isAdmin && (
            <button className="delete-button" onClick={handleDelete}>
              Delete
            </button>
          )}
        </div>
      </div>
      
      <div className="schedule-detail-card">
        <div 
          className="schedule-status-banner"
          style={{ backgroundColor: statusColors[schedule.status] }}
        >
          Status: {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
        </div>
        
        <div className="schedule-detail-content">
          <div className="detail-section">
            <h2>Date & Time</h2>
            <div className="detail-row">
              <span className="detail-label">Date:</span>
              <span className="detail-value">{formatDate(schedule.date)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Time:</span>
              <span className="detail-value">
                {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
              </span>
            </div>
            
            {timeSlot && (
              <div className="detail-row time-slot-info">
                <span className="detail-label">Time Slot:</span>
                <span className="detail-value">
                  {timeSlot.name || `${getDayName(timeSlot.day_of_week)} ${formatTime(timeSlot.start_time)} - ${formatTime(timeSlot.end_time)}`}
                  {timeSlot.description && (
                    <div className="time-slot-description">{timeSlot.description}</div>
                  )}
                </span>
              </div>
            )}
          </div>
          
          <div className="detail-section">
            <h2>Employee Information</h2>
            <div className="detail-row">
              <span className="detail-label">Name:</span>
              <span className="detail-value">
                {schedule.employee?.name || 'Unknown Employee'}
              </span>
            </div>
            {schedule.employee?.email && (
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{schedule.employee.email}</span>
              </div>
            )}
            {schedule.employee?.position && (
              <div className="detail-row">
                <span className="detail-label">Position:</span>
                <span className="detail-value">{schedule.employee.position}</span>
              </div>
            )}
          </div>
          
          {schedule.notes && (
            <div className="detail-section">
              <h2>Notes</h2>
              <div className="detail-notes">{schedule.notes}</div>
            </div>
          )}
          
          <div className="detail-section">
            <h2>Request Details</h2>
            <div className="detail-row">
              <span className="detail-label">Requested:</span>
              <span className="detail-value">
                {new Date(schedule.created_at).toLocaleString()}
              </span>
            </div>
            
            {schedule.status !== 'pending' && (
              <>
                <div className="detail-row">
                  <span className="detail-label">Response Date:</span>
                  <span className="detail-value">
                    {schedule.approval_date 
                      ? new Date(schedule.approval_date).toLocaleString() 
                      : 'N/A'}
                  </span>
                </div>
                
                {schedule.status === 'rejected' && schedule.rejection_reason && (
                  <div className="detail-row">
                    <span className="detail-label">Reason for Rejection:</span>
                    <span className="detail-value rejection-reason">
                      {schedule.rejection_reason}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleDetail; 