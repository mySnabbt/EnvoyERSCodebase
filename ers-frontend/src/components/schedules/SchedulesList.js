import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import './Schedules.css';

const statusColors = {
  pending: '#f39c12', // Orange
  approved: '#27ae60', // Green
  rejected: '#e74c3c'  // Red
};

const SchedulesList = () => {
  const { currentUser, isAdmin } = useContext(AuthContext);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    employee_id: '',
    status: '',
    start_date: '',
    end_date: ''
  });
  const [employees, setEmployees] = useState([]);

  // Load employees for filter dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await axios.get('/employees');
        if (response.data && response.data.data) {
          setEmployees(response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch employees:', err);
      }
    };

    if (isAdmin) {
      fetchEmployees();
    }
  }, [isAdmin]);

  // Load schedules with filters
  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Build query parameters
        const params = new URLSearchParams();
        
        // If user is not admin, only show their schedules
        if (!isAdmin && currentUser) {
          // Get the employee associated with current user
          const employeeResponse = await axios.get(`/employees?user_id=${currentUser.id}`);
          if (employeeResponse.data && employeeResponse.data.data && employeeResponse.data.data.length > 0) {
            params.append('employee_id', employeeResponse.data.data[0].id);
          } else {
            setSchedules([]);
            setLoading(false);
            return;
          }
        } else {
          // Admin can filter by employee
          if (filters.employee_id) {
            params.append('employee_id', filters.employee_id);
          }
        }
        
        // Add other filters
        if (filters.status) {
          params.append('status', filters.status);
        }
        
        if (filters.start_date) {
          params.append('start_date', filters.start_date);
        }
        
        if (filters.end_date) {
          params.append('end_date', filters.end_date);
        }
        
        const response = await axios.get(`/schedules?${params.toString()}`);
        
        if (response.data && response.data.data) {
          setSchedules(response.data.data);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch schedules:', err);
        setError('Failed to load schedules. Please try again.');
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [isAdmin, currentUser, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
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

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return <div className="loading">Loading schedules...</div>;
  }

  return (
    <div className="schedules-container">
      <div className="schedules-header">
        <h1>Schedules</h1>
        <div className="header-buttons">
          <Link to="/schedules/new" className="new-schedule-button">
            Request New Schedule
          </Link>
          {isAdmin && (
            <Link to="/schedules/bulk" className="bulk-schedule-button">
              Bulk Schedule Creation
            </Link>
          )}
        </div>
      </div>
      
      <div className="filter-section">
        <div className="filter-form">
          {isAdmin && (
            <div className="filter-group">
              <label htmlFor="employee_id">Employee</label>
              <select
                name="employee_id"
                id="employee_id"
                value={filters.employee_id}
                onChange={handleFilterChange}
              >
                <option value="">All Employees</option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="filter-group">
            <label htmlFor="status">Status</label>
            <select
              name="status"
              id="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="start_date">Start Date</label>
            <input
              type="date"
              name="start_date"
              id="start_date"
              value={filters.start_date}
              onChange={handleFilterChange}
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="end_date">End Date</label>
            <input
              type="date"
              name="end_date"
              id="end_date"
              value={filters.end_date}
              onChange={handleFilterChange}
            />
          </div>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {schedules.length === 0 ? (
        <div className="no-schedules-message">
          No schedules found matching your criteria.
        </div>
      ) : (
        <div className="schedules-list">
          {schedules.map(schedule => (
            <div key={schedule.id} className="schedule-card">
              <div className="schedule-header">
                <div className="schedule-date">{formatDate(schedule.date)}</div>
                <div 
                  className="schedule-status"
                  style={{ backgroundColor: statusColors[schedule.status] }}
                >
                  {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                </div>
              </div>
              
              <div className="schedule-details">
                <div className="schedule-time">
                  <span className="schedule-label">Time:</span>
                  <span>{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</span>
                </div>
                
                <div className="schedule-employee">
                  <span className="schedule-label">Employee:</span>
                  <span>{schedule.employee?.name || 'Unknown Employee'}</span>
                </div>
                
                {schedule.notes && (
                  <div className="schedule-notes">
                    <span className="schedule-label">Notes:</span>
                    <span>{schedule.notes}</span>
                  </div>
                )}
                
                {schedule.status === 'rejected' && schedule.rejection_reason && (
                  <div className="rejection-reason">
                    <span className="schedule-label">Reason for Rejection:</span>
                    <span>{schedule.rejection_reason}</span>
                  </div>
                )}
              </div>
              
              <div className="schedule-actions">
                <Link to={`/schedules/${schedule.id}`} className="view-button">
                  View Details
                </Link>
                
                {schedule.status === 'pending' && (
                  <>
                    <Link to={`/schedules/edit/${schedule.id}`} className="edit-button">
                      Edit
                    </Link>
                    
                    {isAdmin && (
                      <>
                        <button 
                          className="approve-button"
                          onClick={async () => {
                            try {
                              await axios.patch(`/schedules/${schedule.id}/approve`);
                              // Refresh schedules after approval
                              setSchedules(prev => 
                                prev.map(s => 
                                  s.id === schedule.id 
                                    ? { ...s, status: 'approved' } 
                                    : s
                                )
                              );
                            } catch (err) {
                              console.error('Failed to approve schedule:', err);
                              setError('Failed to approve schedule');
                            }
                          }}
                        >
                          Approve
                        </button>
                        
                        <button 
                          className="reject-button"
                          onClick={async () => {
                            const reason = prompt('Please enter a reason for rejection:');
                            if (reason !== null) {
                              try {
                                await axios.patch(`/schedules/${schedule.id}/reject`, {
                                  rejection_reason: reason
                                });
                                // Refresh schedules after rejection
                                setSchedules(prev => 
                                  prev.map(s => 
                                    s.id === schedule.id 
                                      ? { ...s, status: 'rejected', rejection_reason: reason } 
                                      : s
                                  )
                                );
                              } catch (err) {
                                console.error('Failed to reject schedule:', err);
                                setError('Failed to reject schedule');
                              }
                            }
                          }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SchedulesList; 