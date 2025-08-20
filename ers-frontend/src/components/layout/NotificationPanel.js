import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  FaBell, 
  FaTimes, 
  FaCheck, 
  FaTrash, 
  FaUsers, 
  FaClock,
  FaCheckDouble
} from 'react-icons/fa';
import './NotificationPanel.css';

const NotificationPanel = ({ isOpen, onClose }) => {
  const { currentUser, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedCancellation, setSelectedCancellation] = useState(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/notifications?include_read=${showAll}`);
      if (response.data.success) {
        setNotifications(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees for admin reassignment
  const fetchEmployees = async () => {
    if (isAdmin) {
      try {
        const response = await axios.get('/employees');
        if (response.data.success) {
          setEmployees(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      fetchEmployees();
    }
  }, [isOpen, showAll]);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await axios.put('/notifications/read-all');
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`/notifications/${notificationId}`);
      setNotifications(prev => 
        prev.filter(notif => notif.id !== notificationId)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Accept shift cancellation
  const acceptCancellation = async (cancellationRequestId, notificationId) => {
    // Validate we have the cancellation request ID
    if (!cancellationRequestId || cancellationRequestId === 'undefined') {
      alert('Error: Invalid cancellation request. Please refresh and try again.');
      return;
    }

    try {
      const response = await axios.post(`/shift-cancellations/${cancellationRequestId}/accept`);
      if (response.data.success) {
        // ✅ Instant UI update: Remove all related notifications immediately
        setNotifications(prev => 
          prev.filter(notif => 
            notif.data?.cancellation_request_id !== cancellationRequestId
          )
        );
        
        // Also refresh to ensure consistency
        fetchNotifications();
        alert('Shift accepted successfully! You are now scheduled for this shift.');
      }
    } catch (error) {
      console.error('Error accepting cancellation:', error);
      const message = error.response?.data?.message || 'Failed to accept shift';
      alert(`Error: ${message}`);
    }
  };

  // Admin reassign shift
  const adminReassignShift = async () => {
    if (!selectedEmployee || !selectedCancellation) return;

    // Validate we have the cancellation request ID
    const cancellationRequestId = selectedCancellation.data?.cancellation_request_id;
    if (!cancellationRequestId) {
      alert('Error: Missing cancellation request ID. Please refresh and try again.');
      return;
    }

    try {
      const response = await axios.post(
        `/shift-cancellations/${cancellationRequestId}/admin-reassign`,
        { employee_id: selectedEmployee }
      );
      
      if (response.data.success) {
        // ✅ Instant UI update: Remove all related notifications immediately
        setNotifications(prev => 
          prev.filter(notif => 
            notif.data?.cancellation_request_id !== cancellationRequestId
          )
        );
        
        // Close modal and refresh
        setShowReassignModal(false);
        setSelectedEmployee('');
        setSelectedCancellation(null);
        fetchNotifications();
        alert('Shift reassigned successfully!');
      }
    } catch (error) {
      console.error('Error reassigning shift:', error);
      const message = error.response?.data?.message || 'Failed to reassign shift';
      alert(`Error: ${message}`);
    }
  };

  // Open admin reassign modal
  const openReassignModal = (notification) => {
    console.log('🔍 Debug: Opening reassign modal with notification:', notification);
    console.log('🔍 Debug: Cancellation request ID:', notification.data?.cancellation_request_id);
    setSelectedCancellation(notification);
    setShowReassignModal(true);
  };

  // Format time for display
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'shift_cancellation':
        return <FaClock className="notification-icon shift" />;
      case 'system':
        return <FaBell className="notification-icon system" />;
      default:
        return <FaBell className="notification-icon" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <>
      <div className="notification-panel-overlay" onClick={onClose} />
      <div className="notification-panel">
        <div className="notification-header">
          <div className="header-left">
            <FaBell />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount}</span>
            )}
          </div>
          <div className="header-actions">
            {unreadCount > 0 && (
              <button 
                className="mark-all-read-btn"
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                <FaCheckDouble />
              </button>
            )}
            <button 
              className="toggle-view-btn"
              onClick={() => setShowAll(!showAll)}
              title={showAll ? 'Show unread only' : 'Show all'}
            >
              {showAll ? 'Unread Only' : 'Show All'}
            </button>
            <button className="close-btn" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="notification-content">
          {loading && (
            <div className="notification-loading">Loading notifications...</div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="no-notifications">
              No {showAll ? '' : 'unread '}notifications
            </div>
          )}

          {!loading && notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-item ${notification.read ? 'read' : 'unread'}`}
            >
              <div className="notification-main">
                {getNotificationIcon(notification.type)}
                <div className="notification-body">
                  <div className="notification-title">{notification.title}</div>
                  <div className="notification-message">{notification.message}</div>
                  <div className="notification-time">
                    {formatTime(notification.created_at)}
                  </div>
                </div>
                <div className="notification-actions">
                  {!notification.read && (
                    <button 
                      className="action-btn read-btn"
                      onClick={() => markAsRead(notification.id)}
                      title="Mark as read"
                    >
                      <FaCheck />
                    </button>
                  )}
                  <button 
                    className="action-btn delete-btn"
                    onClick={() => deleteNotification(notification.id)}
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              {/* Shift cancellation specific actions */}
              {notification.type === 'shift_cancellation' && 
               notification.data?.cancellation_request_id && 
               !notification.data?.action && (
                <div className="cancellation-actions">
                  <button 
                    className="accept-btn"
                    onClick={() => acceptCancellation(
                      notification.data.cancellation_request_id, 
                      notification.id
                    )}
                  >
                    <FaCheck /> Accept Shift
                  </button>
                  
                  {isAdmin && (
                    <button 
                      className="reassign-btn"
                      onClick={() => openReassignModal(notification)}
                    >
                      <FaUsers /> Reassign to Employee
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Admin Reassign Modal */}
        {showReassignModal && (
          <div className="modal-overlay">
            <div className="reassign-modal">
              <div className="modal-header">
                <h3>Reassign Shift</h3>
                <button onClick={() => setShowReassignModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="modal-body">
                <p>Select an employee to assign this shift to:</p>
                <select 
                  value={selectedEmployee} 
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="employee-select"
                >
                  <option value="">Select Employee...</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} - {employee.position}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button 
                  className="cancel-btn"
                  onClick={() => setShowReassignModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="confirm-btn"
                  onClick={adminReassignShift}
                  disabled={!selectedEmployee}
                >
                  Reassign Shift
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationPanel;
