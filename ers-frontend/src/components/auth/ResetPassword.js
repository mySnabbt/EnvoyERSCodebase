import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cleanToken, setCleanToken] = useState('');
  
  useEffect(() => {
    // Validate token exists and clean it
    if (!token) {
      setError('Invalid password reset link');
    } else {
      // Remove any URL encoding or extra characters
      const processedToken = decodeURIComponent(token).trim();
      setCleanToken(processedToken);
      console.log('Token from URL:', token);
      console.log('Processed token:', processedToken);
    }
  }, [token]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset states
    setError('');
    setMessage('');
    
    // Validate passwords
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setIsSubmitting(true);
    
    // Log the API URL and request data
    const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/reset-password`;
    console.log('Making API request to:', apiUrl);
    console.log('Request data:', { token: cleanToken.substring(0, 10) + '...', password: '****' });
    
    try {
      const response = await axios.post(
        apiUrl,
        { token: cleanToken, password }
      );
      
      console.log('API response:', response.data);
      setMessage(response.data.message);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('API error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Reset Password</h2>
        
        {message && (
          <div className="alert alert-success">
            {message}
            <div className="mt-2">
              Redirecting to login page...
            </div>
          </div>
        )}
        
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}
        
        {!message && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <input
                type="password"
                id="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                minLength="6"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isSubmitting}
                minLength="6"
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary btn-block"
              disabled={isSubmitting || !cleanToken}
            >
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
        
        <div className="auth-links">
          <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword; 