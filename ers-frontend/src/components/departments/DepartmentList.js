import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Departments.css';
import { AuthContext } from '../../context/AuthContext';

const DepartmentList = () => {
  const { isAdmin } = useContext(AuthContext);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get('/departments');
        console.log('Departments response:', response.data);
        
        if (response.data && response.data.data) {
          setDepartments(response.data.data);
        } else {
          setDepartments([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch departments:', err);
        setError('Failed to fetch departments. Please try again.');
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  if (loading) return <div className="loading">Loading departments...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="department-list-container">
      <div className="department-list-header">
        <h1>Departments</h1>
        {isAdmin && (
          <Link to="/departments/new" className="add-button">Add Department</Link>
        )}
      </div>
      
      <div className="department-grid">
        {departments.map(department => (
          <div key={department.id} className="department-card">
            <h2>{department.name}</h2>
            <div className="department-info">
              <div className="info-item">
                <span className="info-label">Employees:</span>
                <span className="info-value">{department.employeeCount || 0}</span>
              </div>
              {department.description && (
                <div className="info-item">
                  <span className="info-label">Description:</span>
                  <span className="info-value">{department.description}</span>
                </div>
              )}
            </div>
            <div className="department-actions">
              <Link to={`/employees?department=${department.id}`} className="view-button">View Employees</Link>
              {isAdmin && (
                <Link to={`/departments/edit/${department.id}`} className="edit-button">Edit</Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DepartmentList; 