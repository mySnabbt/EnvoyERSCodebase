import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Admin.css';
import UserManagement from './UserManagement';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [updateStatus, setUpdateStatus] = useState({ message: '', type: '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/auth/users');
      console.log('Users API response:', response.data);
      setUsers(response.data.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      if (err.response && err.response.status === 401) {
        setError('Authentication error: Please make sure you are logged in as an admin.');
      } else {
        setError('Failed to fetch users. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      setUpdateStatus({ message: 'Updating role...', type: 'info' });
      
      // Make actual API call to update role - changed from PUT to PATCH
      const response = await axios.patch(`/auth/users/${userId}/role`, { role: newRole });
      console.log('Role update response:', response.data);
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      setUpdateStatus({ message: `Role updated to ${newRole} successfully!`, type: 'success' });
      
      // Clear status message after a few seconds
      setTimeout(() => {
        setUpdateStatus({ message: '', type: '' });
      }, 3000);
    } catch (err) {
      console.error('Failed to update role:', err);
      setUpdateStatus({ 
        message: err.response?.data?.message || 'Failed to update role', 
        type: 'error' 
      });
    }
  };

  const handleResetPassword = async (userId, email) => {
    // In a real app, this would send a password reset email
    try {
      setUpdateStatus({ message: 'Sending password reset email...', type: 'info' });
      
      // This would be an actual API call in a complete implementation
      // await axios.post(`/auth/reset-password`, { userId, email });
      
      alert(`In a real app, a password reset email would be sent to ${email}`);
      setUpdateStatus({ message: 'Password reset email sent!', type: 'success' });
      
      setTimeout(() => {
        setUpdateStatus({ message: '', type: '' });
      }, 3000);
    } catch (err) {
      console.error('Failed to send reset email:', err);
      setUpdateStatus({ 
        message: 'Failed to send password reset email', 
        type: 'error' 
      });
    }
  };

  const createEmployeeRecord = async (userId, userName, userEmail) => {
    try {
      // Check if user already has an employee record
      const checkResponse = await axios.get(`/employees?user_id=${userId}`);
      
      if (checkResponse.data && checkResponse.data.data && checkResponse.data.data.length > 0) {
        setUpdateStatus({ 
          message: 'This user already has an employee record', 
          type: 'warning' 
        });
        return;
      }
      
      // Create employee record
      const employeeData = {
        user_id: userId,
        name: userName,
        email: userEmail,
        position: 'Employee' // Default position
      };
      
      setUpdateStatus({ message: 'Creating employee record...', type: 'info' });
      
      const response = await axios.post('/employees', employeeData);
      
      if (response.data && response.data.success) {
        setUpdateStatus({ 
          message: 'Employee record created successfully!', 
          type: 'success' 
        });
        
        // Refresh users after a successful creation
        fetchUsers();
      }
    } catch (err) {
      console.error('Failed to create employee record:', err);
      setUpdateStatus({ 
        message: err.response?.data?.message || 'Failed to create employee record', 
        type: 'error' 
      });
    }
  };

  const renderUsersTab = () => {
    if (loading) return <div className="loading">Loading users...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
      <div className="admin-table-container">
        {updateStatus.message && (
          <div className={`status-message ${updateStatus.type}`}>
            {updateStatus.message}
          </div>
        )}
        
        <button 
          className="refresh-button"
          onClick={fetchUsers}
        >
          Refresh Users
        </button>
        
        {users.length === 0 ? (
          <div className="no-data-message">No users found</div>
        ) : (
          <UserManagement />
        )}
      </div>
    );
  };

  const renderSystemSettingsTab = () => {
    return (
      <div className="settings-container">
        <div className="settings-card">
          <h3>System Settings</h3>
          <p>Configure global system settings like first day of week.</p>
          <Link to="/admin/settings" className="btn">
            Manage Settings
          </Link>
        </div>
        
        <div className="settings-card">
          <h3>Time Slot Settings</h3>
          <div className="settings-action-buttons">
            <Link to="/time-slots" className="action-button">
              Manage Time Slots
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-panel-container">
      <h1>Admin Panel</h1>
      
      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
        <button 
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          System Settings
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'settings' && renderSystemSettingsTab()}
      </div>
    </div>
  );
};

export default AdminPanel; 