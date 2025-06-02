import React, { useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './Layout.css';

const Header = () => {
  const { currentUser, isAdmin, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Debug user data
    if (currentUser) {
      console.log('User data in Header:', currentUser);
    }
  }, [currentUser]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Format user display name based on available fields
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

  return (
    <header className="main-header">
      <div className="container header-container">
        <div className="logo">
          <Link to="/">EnvoyERS</Link>
        </div>
        
        <nav className="main-nav">
          {currentUser ? (
            <>
              <ul className="nav-links">
                <li><Link to="/envoyai" className="envoyai-link">EnvoyAI</Link></li>
                <li><Link to="/dashboard">Dashboard</Link></li>
                <li><Link to="/employees">Employees</Link></li>
                <li><Link to="/departments">Departments</Link></li>
                <li><Link to="/schedules">Roster</Link></li>
                <li><Link to="/timesheets">Timesheets</Link></li>
                {isAdmin && (
                  <>
                    <li><Link to="/time-slots">Time Slots</Link></li>
                    <li><Link to="/admin">Admin Panel</Link></li>
                  </>
                )}
              </ul>
              
              <div className="user-menu">
                <span className="user-name">
                  Hello, {getUserDisplayName()}
                </span>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
              </div>
            </>
          ) : (
            <ul className="nav-links">
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </ul>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header; 