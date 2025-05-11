import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Employees.css';
import { AuthContext } from '../../context/AuthContext';

const EmployeeList = () => {
  const { isAdmin } = useContext(AuthContext);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const departmentFilter = queryParams.get('department');
  
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDepartment, setActiveDepartment] = useState(null);

  // Fetch employees, with department filter if specified
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        let url = '/employees';
        if (departmentFilter) {
          url = `/employees/department/${departmentFilter}`;
        }
        
        const response = await axios.get(url);
        console.log('Employees API response:', response.data);
        
        if (response.data && response.data.data) {
          setEmployees(response.data.data);
        } else {
          setEmployees([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch employees:', err);
        setError('Failed to fetch employees. Please try again.');
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [departmentFilter]);
  
  // Fetch departments for mapping department_id to names and get active department
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get('/departments');
        console.log('Departments API response:', response.data);
        
        if (response.data && response.data.data) {
          setDepartments(response.data.data);
          
          // Set active department name if filter is applied
          if (departmentFilter) {
            const activeDept = response.data.data.find(d => d.id === departmentFilter);
            if (activeDept) {
              setActiveDepartment(activeDept);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      }
    };

    fetchDepartments();
  }, [departmentFilter]);

  const filteredEmployees = employees.filter(employee => {
    // Use name from database
    const fullName = employee.name ? employee.name.toLowerCase() : '';
    
    // Get department name from department_id if available
    let departmentName = '';
    if (employee.department_id) {
      const department = departments.find(d => d.id === employee.department_id);
      departmentName = department ? department.name.toLowerCase() : '';
    }
    
    const emailLower = employee.email ? employee.email.toLowerCase() : '';
    const positionLower = employee.position ? employee.position.toLowerCase() : '';
    
    return fullName.includes(searchTerm.toLowerCase()) || 
           emailLower.includes(searchTerm.toLowerCase()) ||
           departmentName.includes(searchTerm.toLowerCase()) ||
           positionLower.includes(searchTerm.toLowerCase());
  });

  if (loading) return <div className="loading">Loading employees...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="employee-list-container">
      <div className="employee-list-header">
        <h1>
          {activeDepartment ? `${activeDepartment.name} Department - Employees` : 'Employees'}
        </h1>
        <div className="header-actions">
          {activeDepartment && (
            <Link to="/departments" className="back-button">Back to Departments</Link>
          )}
          {isAdmin && (
            <Link to="/employees/new" className="add-button">Add Employee</Link>
          )}
        </div>
      </div>
      
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {filteredEmployees.length > 0 ? (
        <div className="employee-table-container">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Position</th>
                {!activeDepartment && <th>Department</th>}
                <th>User Account</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(employee => {
                // Find department name if department_id exists
                let departmentName = '';
                if (employee.department_id) {
                  const department = departments.find(d => d.id === employee.department_id);
                  departmentName = department ? department.name : '';
                }
                
                return (
                  <tr key={employee.id}>
                    <td>{employee.name}</td>
                    <td>{employee.email}</td>
                    <td>{employee.position}</td>
                    {!activeDepartment && <td>{departmentName}</td>}
                    <td>
                      {employee.user ? (
                        <span className="user-role-badge">{employee.user.role}</span>
                      ) : (
                        <span className="no-user-badge">No Account</span>
                      )}
                    </td>
                    <td className="action-buttons">
                      <Link to={`/employees/${employee.id}`} className="view-button">View</Link>
                      {isAdmin && (
                        <>
                          <Link to={`/employees/edit/${employee.id}`} className="edit-button">Edit</Link>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-results">
          <p>No employees found matching your search criteria.</p>
        </div>
      )}
    </div>
  );
};

export default EmployeeList; 