import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Employees.css';
import { AuthContext } from '../../context/AuthContext';

const EmployeeDetail = () => {
  const { isAdmin } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [employee, setEmployee] = useState(null);
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const response = await axios.get(`/employees/${id}`);
        console.log('Employee detail response:', response.data);
        
        if (response.data && response.data.data) {
          setEmployee(response.data.data);
          
          // Fetch department if department_id exists
          if (response.data.data.department_id) {
            try {
              const deptResponse = await axios.get(`/departments/${response.data.data.department_id}`);
              if (deptResponse.data && deptResponse.data.data) {
                setDepartment(deptResponse.data.data);
              }
            } catch (deptErr) {
              console.error('Failed to fetch department details:', deptErr);
            }
          }
        } else {
          setError('Employee data not found');
        }
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch employee details:', err);
        setError('Failed to fetch employee details. Please try again.');
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await axios.delete(`/employees/${id}`);
        console.log('Employee deleted successfully');
        navigate('/employees');
      } catch (err) {
        console.error('Failed to delete employee:', err);
        setError(err.response?.data?.message || 'Failed to delete employee. Please try again.');
      }
    }
  };

  if (loading) return <div className="loading">Loading employee details...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!employee) return <div className="error-message">Employee not found</div>;

  return (
    <div className="employee-detail-container">
      <div className="employee-detail-header">
        <h1>{employee.name}</h1>
        <div className="employee-actions">
          <Link to="/employees" className="cancel-button">Back to List</Link>
          {isAdmin && (
            <>
              <Link to={`/employees/edit/${employee.id}`} className="edit-button">Edit</Link>
              <button onClick={handleDelete} className="delete-button">Delete</button>
            </>
          )}
        </div>
      </div>
      
      <div className="employee-detail-card">
        <div className="employee-info-section">
          <h2>Personal Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Name</div>
              <div className="info-value">{employee.name}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Email</div>
              <div className="info-value">{employee.email}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Phone</div>
              <div className="info-value">{employee.phone || 'N/A'}</div>
            </div>
          </div>
        </div>
        
        <div className="employee-info-section">
          <h2>Employment Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Position</div>
              <div className="info-value">{employee.position}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Department</div>
              <div className="info-value">{department ? department.name : 'N/A'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Hire Date</div>
              <div className="info-value">{employee.hire_date || 'N/A'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Status</div>
              <div className="info-value">{employee.status || 'Active'}</div>
            </div>
          </div>
        </div>
        
        {employee.user && (
          <div className="employee-info-section">
            <h2>User Account</h2>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">User Name</div>
                <div className="info-value">{employee.user.name}</div>
              </div>
              <div className="info-item">
                <div className="info-label">User Email</div>
                <div className="info-value">{employee.user.email}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Role</div>
                <div className="info-value">
                  <span className={`user-role-badge ${employee.user.role}`}>{employee.user.role}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDetail; 