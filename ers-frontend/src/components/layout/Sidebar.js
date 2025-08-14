import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { 
  MdDashboard, 
  MdPeople, 
  MdBusiness, 
  MdCalendarMonth, 
  MdQueryStats, 
  MdAdminPanelSettings,
  MdLogout,
  MdClose,
  MdPsychology
} from 'react-icons/md';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const { currentUser, isAdmin, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
    onClose();
  };

  const getUserDisplayName = () => {
    if (!currentUser) return 'User';
    
    if (currentUser.first_name) {
      return currentUser.first_name;
    }
    
    if (currentUser.name) {
      const nameParts = currentUser.name.split(' ');
      return nameParts[0] || 'User';
    }
    
    if (currentUser.email) {
      return currentUser.email.split('@')[0];
    }
    
    return 'User';
  };

  const navItems = [
    { to: '/dashboard', icon: MdDashboard, label: 'Dashboard' },
    { to: '/envoyai', icon: MdPsychology, label: 'EnvoyAI', special: true },
    { to: '/employees', icon: MdPeople, label: 'Employees' },
    { to: '/departments', icon: MdBusiness, label: 'Departments' },
    { to: '/schedules', icon: MdCalendarMonth, label: 'Roster' },
    { to: '/timesheets', icon: MdQueryStats, label: 'Timesheets' },
  ];

  const adminItems = [
    { to: '/time-slots', icon: MdCalendarMonth, label: 'Time Slots' },
    { to: '/admin', icon: MdAdminPanelSettings, label: 'Admin Panel' },
  ];

  const isActive = (path) => location.pathname === path;

  const handleNavClick = () => {
    onClose();
  };

  if (!currentUser) return null;

  return (
    <>
      {/* Sidebar overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Close button for mobile */}
        <div className="sidebar-close">
          <button className="sidebar-close-btn" onClick={onClose}>
            <MdClose />
          </button>
        </div>

        {/* Logo */}
        <div className="sidebar-header">
          <Link to="/dashboard" className="sidebar-logo" onClick={handleNavClick}>
            EnvoyERS
          </Link>
        </div>

        {/* User info */}
        <div className="sidebar-user">
          <div className="user-avatar">
            {getUserDisplayName().charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <span className="user-name">{getUserDisplayName()}</span>
            <span className="user-role">{isAdmin ? 'Admin' : 'Employee'}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to} className="nav-item">
                  <Link
                    to={item.to}
                    className={`nav-link ${isActive(item.to) ? 'active' : ''} ${item.special ? 'special' : ''}`}
                    onClick={handleNavClick}
                  >
                    <Icon className="nav-icon" />
                    <span className="nav-label">{item.label}</span>
                    {isActive(item.to) && <div className="nav-indicator" />}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Admin section */}
          {isAdmin && (
            <>
              <div className="nav-divider">Admin</div>
              <ul className="nav-list">
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to} className="nav-item">
                      <Link
                        to={item.to}
                        className={`nav-link ${isActive(item.to) ? 'active' : ''}`}
                        onClick={handleNavClick}
                      >
                        <Icon className="nav-icon" />
                        <span className="nav-label">{item.label}</span>
                        {isActive(item.to) && <div className="nav-indicator" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </nav>

        {/* Logout button */}
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-button">
            <MdLogout className="nav-icon" />
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar; 