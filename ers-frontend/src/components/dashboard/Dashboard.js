import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalDepartments: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Log user data to debug
    if (currentUser) {
      console.log('User data in Dashboard:', currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch employee count
        const employeesPromise = axios.get('/employees');
        // Fetch department count
        const departmentsPromise = axios.get('/departments');
        
        const [employeesResponse, departmentsResponse] = await Promise.all([
          employeesPromise,
          departmentsPromise
        ]);
        
        console.log('Dashboard data:', {
          employees: employeesResponse.data,
          departments: departmentsResponse.data
        });
        
        const totalEmployees = employeesResponse.data?.data?.length || 0;
        const totalDepartments = departmentsResponse.data?.data?.length || 0;
        
        // Recent activity would come from a real API in production
        // This is mocked for now
        const recentActivity = [
          { id: 1, type: 'employee_added', message: 'New employee added', date: new Date().toLocaleDateString() },
          { id: 2, type: 'department_updated', message: 'Department updated', date: new Date().toLocaleDateString() }
        ];
        
        setStats({
          totalEmployees,
          totalDepartments,
          recentActivity
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Function to get user's display name
  const getUserDisplayName = () => {
    if (!currentUser) return 'User';
    
    // Try first_name if available
    if (currentUser.first_name) {
      return currentUser.first_name;
    }
    
    // Try to split the name field (full name)
    if (currentUser.name) {
      const nameParts = currentUser.name.split(' ');
      return nameParts[0] || 'User';
    }
    
    // Return email as fallback
    if (currentUser.email) {
      return currentUser.email.split('@')[0];
    }
    
    return 'User';
  };

  if (loading) {
    return <div className="loading">Loading dashboard data...</div>;
  }

  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>
      <p>Welcome back, {getUserDisplayName()}!</p>
      
      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Employees</h3>
          <p className="stat-number">{stats.totalEmployees}</p>
          <Link to="/employees" className="stat-link">View All</Link>
        </div>
        
        <div className="stat-card">
          <h3>Departments</h3>
          <p className="stat-number">{stats.totalDepartments}</p>
          <Link to="/departments" className="stat-link">View All</Link>
        </div>
        
        <div className="stat-card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <Link to="/employees/new" className="action-button">Add Employee</Link>
          </div>
        </div>
      </div>
      
      <div className="recent-activity">
        <h2>Recent Activity</h2>
        {stats.recentActivity.length > 0 ? (
          <ul className="activity-list">
            {stats.recentActivity.map(activity => (
              <li key={activity.id} className={`activity-item ${activity.type}`}>
                <span className="activity-date">{activity.date}</span>
                <span className="activity-message">{activity.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No recent activity</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 