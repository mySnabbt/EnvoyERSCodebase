const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    console.log('Authenticating token:', token.substring(0, 10) + '...');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token payload:', decoded);
    
    // Ensure user_id is available in the request
    req.user = decoded;
    
    // For backward compatibility, ensure both id and user_id are available
    if (decoded.id && !decoded.user_id) {
      req.user.user_id = decoded.id;
    } else if (decoded.user_id && !decoded.id) {
      req.user.id = decoded.user_id;
    }
    
    console.log('Final user object in request:', req.user);
    next();
  } catch (error) {
    console.error('Token authentication error:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
};

module.exports = { authenticateToken, authorizeAdmin }; 