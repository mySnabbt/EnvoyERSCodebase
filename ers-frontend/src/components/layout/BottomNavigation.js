import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { 
  MdDashboard, 
  MdCalendarMonth, 
  MdQueryStats, 
  MdPsychology
} from 'react-icons/md';
import './BottomNavigation.css';

const BottomNavigation = () => {
  const { currentUser } = useContext(AuthContext);
  const location = useLocation();

  if (!currentUser) return null;

  const navItems = [
    { to: '/dashboard', icon: MdDashboard, label: 'Dashboard' },
    { to: '/schedules', icon: MdCalendarMonth, label: 'Roster' },
    { to: '/timesheets', icon: MdQueryStats, label: 'Timesheet' },
    { to: '/envoyai', icon: MdPsychology, label: 'AI' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bottom-navigation">
      <div className="bottom-nav-container">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`bottom-nav-item ${isActive(item.to) ? 'active' : ''}`}
            >
              <Icon className="bottom-nav-icon" />
              <span className="bottom-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation; 