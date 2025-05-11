import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Employees.css';

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department_id: '',
    hire_date: '',
    status: 'Active',
    user_id: ''
  });
  
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    const fetchEmployee = async () => {
      if (isEditMode) {
        try {
          const response = await axios.get(`/employees/${id}`);
          console.log('Employee data response:', response.data);
          
          if (response.data && response.data.data) {
            const employeeData = response.data.data;
            
            // Split the name into firstName and lastName if it's available
            let firstName = '';
            let lastName = '';
            if (employeeData.name) {
              const nameParts = employeeData.name.split(' ');
              firstName = nameParts[0] || '';
              lastName = nameParts.slice(1).join(' ') || '';
            }
            
            setFormData({
              firstName: firstName,
              lastName: lastName,
              email: employeeData.email || '',
              phone: employeeData.phone || '',
              position: employeeData.position || '',
              department_id: employeeData.department_id || '',
              hire_date: employeeData.hire_date ? employeeData.hire_date.substring(0, 10) : '',
              status: employeeData.status || 'Active',
              user_id: employeeData.user_id || ''
            });
          }
          setLoading(false);
        } catch (err) {
          console.error('Failed to fetch employee:', err);
          setError('Failed to fetch employee data. Please try again.');
          setLoading(false);
        }
      }
    };

    fetchEmployee();
  }, [id, isEditMode]);

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get('/departments');
        console.log('Departments response:', response.data);
        if (response.data && response.data.data) {
          setDepartments(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        setDepartments([]);
      }
    };
    
    fetchDepartments();
  }, []);

  // Fetch available users (users without employee profiles)
  useEffect(() => {
    if (!isEditMode) { // Only load available users when creating new employee
      const fetchAvailableUsers = async () => {
        setLoadingUsers(true);
        try {
          const response = await axios.get('/auth/users/without-employee');
          console.log('Available users response:', response.data);
          if (response.data && response.data.data) {
            setAvailableUsers(response.data.data);
          }
        } catch (error) {
          console.error('Failed to fetch available users:', error);
          setAvailableUsers([]);
        } finally {
          setLoadingUsers(false);
        }
      };
      
      fetchAvailableUsers();
    }
  }, [isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If user_id is changed, update email from selected user
    if (name === 'user_id' && value) {
      const selectedUser = availableUsers.find(user => user.id === value);
      if (selectedUser) {
        setFormData(prevData => ({
          ...prevData,
          [name]: value,
          email: selectedUser.email || prevData.email,
          firstName: selectedUser.first_name || '',
          lastName: selectedUser.last_name || '',
          phone: selectedUser.phone || prevData.phone
        }));
        return;
      }
    }
    
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    try {
      // Create the data object based on the database schema
      const employeeData = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone,
        position: formData.position,
        status: formData.status,
        user_id: formData.user_id || null // Include user_id if selected
      };
      
      // Only add department_id if selected
      if (formData.department_id) {
        employeeData.department_id = formData.department_id;
      }
      
      // Always include hire_date - either the selected date or null
      // This ensures the field is always sent to the backend
      employeeData.hire_date = formData.hire_date || null;
      
      console.log('Submitting employee data with hire_date:', employeeData.hire_date);
      console.log('Raw hire_date from form:', formData.hire_date);
      console.log('Complete employee data being submitted:', employeeData);
      
      let response;
      if (isEditMode) {
        response = await axios.put(`/employees/${id}`, employeeData);
        console.log('Update response:', response.data);
      } else {
        response = await axios.post('/employees', employeeData);
        console.log('Create response:', response.data);
      }
      
      navigate('/employees');
    } catch (err) {
      console.error('Error saving employee:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to save employee data. Please try again.');
    }
  };

  if (loading) return <div className="loading">Loading employee data...</div>;

  return (
    <div className="employee-form-container">
      <div className="employee-detail-header">
        <h1>{isEditMode ? 'Edit Employee' : 'Add New Employee'}</h1>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="employee-form">
        <form onSubmit={handleSubmit}>
          {!isEditMode && (
            <div className="form-section">
              <h2>User Account</h2>
              <div className="form-group">
                <label htmlFor="user_id">Select User Account</label>
                <select
                  id="user_id"
                  name="user_id"
                  value={formData.user_id || ''}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a User</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email}) - {user.role}
                    </option>
                  ))}
                </select>
                {loadingUsers && <div className="loading-inline">Loading available users...</div>}
                {!loadingUsers && availableUsers.length === 0 && (
                  <div className="info-message">All users already have employee profiles.</div>
                )}
              </div>
            </div>
          )}
          
          <h2>Personal Information</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                readOnly={!!formData.user_id} // Make read-only if linked to a user
              />
              {!!formData.user_id && (
                <div className="info-message">Email is synced with the selected user account.</div>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <h2>Employment Information</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="position">Position</label>
              <input
                type="text"
                id="position"
                name="position"
                value={formData.position}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="department_id">Department</label>
              <select
                id="department_id"
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="hire_date">Hire Date</label>
              <input
                type="date"
                id="hire_date"
                name="hire_date"
                value={formData.hire_date}
                onChange={handleChange}
              />
              <div className="info-message">
                {formData.hire_date ? `Selected date: ${formData.hire_date}` : 'No date selected'}
              </div>
            </div>
          </div>
          
          <div className="form-buttons">
            <button type="submit" className="save-button">{isEditMode ? 'Update Employee' : 'Add Employee'}</button>
            <Link to="/employees" className="cancel-button">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm; 