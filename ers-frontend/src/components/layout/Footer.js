import React from 'react';
import './Layout.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="main-footer">
      <div className="container">
        <p>&copy; {currentYear} Snabbt Envoy. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer; 