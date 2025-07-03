import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);
    
    // Get the API URL with fallback
    const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/forgot-password`;
    console.log('Making forgot password request to:', apiUrl);
    console.log('Email:', email);
    
    try {
      const response = await axios.post(
        apiUrl,
        { email },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          withCredentials: false
        }
      );
      
      console.log('Forgot password response:', response.data);
      setMessage(response.data.message);
      setEmail(''); // Clear the form
    } catch (err) {
      console.error('Forgot password error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Forgot Password</h2>
        
        {message && (
          <div className="alert alert-success">
            {message}
          </div>
        )}
        
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        
        <div className="auth-links">
          <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword; 