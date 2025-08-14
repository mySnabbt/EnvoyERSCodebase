import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { MdMenu, MdPerson, MdLogout, MdSettings } from 'react-icons/md';
import './MobileHeader.css';

const MobileHeader = ({ onMenuClick }) => {
  const { currentUser, isAdmin, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setShowProfileMenu(false);
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

  const handleProfileClick = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const handleProfileMenuClick = (action) => {
    setShowProfileMenu(false);
    if (action === 'profile') {
      // Navigate to profile page (you can implement this)
      console.log('Navigate to profile');
    } else if (action === 'settings' && isAdmin) {
      navigate('/admin/settings');
    } else if (action === 'logout') {
      handleLogout();
    }
  };

  if (!currentUser) return null;

  return (
    <>
      <header className="mobile-header">
        <div className="mobile-header-content">
          {/* Menu button */}
          <button className="mobile-menu-btn" onClick={onMenuClick}>
            <MdMenu />
          </button>

          {/* Logo/Title */}
          <div className="mobile-logo">
            <span>EnvoyERS</span>
          </div>

          {/* Profile button */}
          <div className="mobile-profile-container">
            <button className="mobile-profile-btn" onClick={handleProfileClick}>
              <div className="mobile-avatar">
                {getUserDisplayName().charAt(0).toUpperCase()}
              </div>
            </button>

            {/* Profile dropdown menu */}
            {showProfileMenu && (
              <>
                <div className="profile-overlay" onClick={() => setShowProfileMenu(false)} />
                <div className="profile-menu">
                  <div className="profile-menu-header">
                    <div className="profile-menu-avatar">
                      {getUserDisplayName().charAt(0).toUpperCase()}
                    </div>
                    <div className="profile-menu-info">
                      <span className="profile-menu-name">{getUserDisplayName()}</span>
                      <span className="profile-menu-role">{isAdmin ? 'Admin' : 'Employee'}</span>
                    </div>
                  </div>
                  
                  <div className="profile-menu-items">
                    <button 
                      className="profile-menu-item"
                      onClick={() => handleProfileMenuClick('profile')}
                    >
                      <MdPerson />
                      <span>Profile</span>
                    </button>
                    
                    {isAdmin && (
                      <button 
                        className="profile-menu-item"
                        onClick={() => handleProfileMenuClick('settings')}
                      >
                        <MdSettings />
                        <span>Settings</span>
                      </button>
                    )}
                    
                    <button 
                      className="profile-menu-item logout"
                      onClick={() => handleProfileMenuClick('logout')}
                    >
                      <MdLogout />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default MobileHeader; 