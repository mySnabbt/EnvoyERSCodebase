import React from 'react';
import './Layout.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="main-footer">
      <div className="container">
        <p>&copy; {currentYear} Employee Records System. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer; 