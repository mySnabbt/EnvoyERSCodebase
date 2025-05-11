import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Admin.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ message: '', type: '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users from API...');
      const response = await axios.get('/auth/users');
      
      console.log('User management - API response:', response.data);
      
      if (response.data && response.data.data) {
        setUsers(response.data.data);
      } else {
        console.warn('API returned unexpected format:', response.data);
        setError('Received unexpected data format from server');
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      // Check if the error is due to auth issue
      if (err.response && err.response.status === 401) {
        setError('Authentication error: Please ensure you are logged in with admin privileges');
      } else {
        setError('Failed to load users. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, currentRole) => {
    try {
      // Toggle between admin and employee
      const newRole = currentRole === 'admin' ? 'employee' : 'admin';
      
      setStatusMessage({ message: `Updating user to ${newRole}...`, type: 'info' });
      
      // Make API call to update role
      const response = await axios.patch(`/auth/users/${userId}/role`, { role: newRole });
      console.log('Role update response:', response.data);
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      setStatusMessage({ message: `User role updated to ${newRole} successfully!`, type: 'success' });
      
      // Clear status message after a few seconds
      setTimeout(() => {
        setStatusMessage({ message: '', type: '' });
      }, 3000);
    } catch (err) {
      console.error('Failed to update role:', err);
      setStatusMessage({ 
        message: err.response?.data?.message || 'Failed to update role', 
        type: 'error' 
      });
    }
  };

  const createEmployeeRecord = async (userId, userName, userEmail) => {
    try {
      // Check if user already has an employee record
      const checkResponse = await axios.get(`/employees?user_id=${userId}`);
      
      if (checkResponse.data && checkResponse.data.data && checkResponse.data.data.length > 0) {
        alert('This user already has an employee record');
        return;
      }
      
      // Create employee record
      const employeeData = {
        user_id: userId,
        name: userName,
        email: userEmail,
        position: 'Employee' // Default position
      };
      
      const response = await axios.post('/employees', employeeData);
      
      if (response.data && response.data.success) {
        setStatusMessage({ message: 'Employee record created successfully!', type: 'success' });
        // Refresh the page to show updated status
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to create employee record:', err);
      setStatusMessage({ 
        message: err.response?.data?.message || 'Failed to create employee record',
        type: 'error'
      });
    }
  };

  const hasEmployeeRecord = async (userId) => {
    try {
      const response = await axios.get(`/employees?user_id=${userId}`);
      return response.data && response.data.data && response.data.data.length > 0;
    } catch (err) {
      console.error('Error checking employee record:', err);
      return false;
    }
  };

  if (loading) {
    return <div className="loading">Loading user data...</div>;
  }

  return (
    <div className="user-management-container">
      <div className="user-management-header">
        <h1>User Management</h1>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {statusMessage.message && (
        <div className={`status-message ${statusMessage.type}`}>
          {statusMessage.message}
        </div>
      )}
      
      <button className="refresh-button" onClick={fetchUsers}>
        Refresh Users
      </button>
      
      <div className="user-list">
        <div className="user-table-header">
          <div className="user-name">Name</div>
          <div className="user-email">Email</div>
          <div className="user-role">Role</div>
          <div className="user-employee-status">Employee Status</div>
          <div className="user-actions">Actions</div>
        </div>
        
        {users.length === 0 ? (
          <div className="no-data-message">No users found</div>
        ) : (
          users.map(user => (
            <div key={user.id} className="user-item">
              <div className="user-name">{user.name || `${user.first_name} ${user.last_name}`}</div>
              <div className="user-email">{user.email}</div>
              <div className="user-role">
                <span className={`role-badge ${user.role}`}>{user.role}</span>
                <button 
                  className="role-toggle-btn"
                  onClick={() => handleRoleChange(user.id, user.role)}
                >
                  {user.role === 'admin' ? 'Make Employee' : 'Make Admin'}
                </button>
              </div>
              <div className="user-employee-status">
                <EmployeeStatus userId={user.id} />
              </div>
              <div className="user-actions">
                <button 
                  className="create-employee-btn"
                  onClick={() => createEmployeeRecord(
                    user.id, 
                    user.name || `${user.first_name} ${user.last_name}`, 
                    user.email
                  )}
                >
                  Create Employee Record
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Component to check and display employee status
const EmployeeStatus = ({ userId }) => {
  const [status, setStatus] = useState('Checking...');
  
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await axios.get(`/employees?user_id=${userId}`);
        
        if (response.data && response.data.data && response.data.data.length > 0) {
          setStatus('Employee Record Exists');
        } else {
          setStatus('No Employee Record');
        }
      } catch (err) {
        console.error('Error checking employee status:', err);
        setStatus('Error Checking Status');
      }
    };
    
    checkStatus();
  }, [userId]);
  
  return (
    <span className={`status-badge ${status === 'Employee Record Exists' ? 'success' : 'warning'}`}>
      {status}
    </span>
  );
};

export default UserManagement; 