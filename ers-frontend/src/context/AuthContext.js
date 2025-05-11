import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Create context
export const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('userRole') === 'admin');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Configure axios defaults
  axios.defaults.baseURL = 'http://localhost:5000/api';
  
  // Debug authentication state
  useEffect(() => {
    console.log('Auth state loaded from localStorage:', {
      token: !!token,
      userRole: localStorage.getItem('userRole'),
      isAdmin: isAdmin
    });
  }, [token, isAdmin]);

  // Set up axios interceptor for auth token
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      config => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, [token]);

  // Load user data if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          console.log('Attempting to load user data with token:', token.substring(0, 10) + '...');
          const res = await axios.get('/auth/me');
          console.log('loadUser response:', res.data);
          console.log('User data from /auth/me:', res.data.data);
          
          // Ensure user_id is properly set - server might return id or user_id
          const userData = res.data.data;
          if (userData && !userData.user_id && userData.id) {
            userData.user_id = userData.id;
          }
          
          setCurrentUser(userData);
          setIsAdmin(userData.role === 'admin');
          localStorage.setItem('userRole', userData.role); // Ensure role is saved in localStorage
          setLoading(false);
        } catch (err) {
          console.error('Error loading user:', err);
          logout();
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  // Register user
  const register = async (firstName, lastName, email, password, phone = '') => {
    setError(null);
    try {
      const userData = {
        firstName,
        lastName,
        email,
        password,
        phone
      };
      console.log('Registering with data:', userData);
      const res = await axios.post('/auth/register', userData);
      return res.data;
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed');
      throw err;
    }
  };

  // Login user
  const login = async (email, password) => {
    setError(null);
    try {
      const res = await axios.post('/auth/login', { email, password });
      console.log('Login response:', res.data);
      
      const { token, user } = res.data.data;
      console.log('User data from login:', user);
      
      // Ensure user_id is properly set
      if (user && !user.user_id && user.id) {
        user.user_id = user.id;
      }
      
      // Save to state
      setToken(token);
      setCurrentUser(user);
      setIsAdmin(user.role === 'admin');
      
      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('userId', user.id || user.user_id);
      
      console.log('Authentication data saved:', {
        token: !!token, 
        userRole: user.role,
        isAdmin: user.role === 'admin'
      });
      
      return res.data;
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err.response?.data?.message || 'Authentication failed');
      throw err;
    }
  };

  // Logout user
  const logout = () => {
    console.log('Logging out, clearing auth state');
    // Clear state
    setToken(null);
    setCurrentUser(null);
    setIsAdmin(false);
    
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        currentUser,
        isAdmin,
        loading,
        error,
        register,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 