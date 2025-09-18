const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    console.log('=== PROTECT MIDDLEWARE ===');
    console.log('Request URL:', req.originalUrl);
    console.log('Request method:', req.method);
    console.log('Authorization header:', req.headers.authorization);
    
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token extracted:', !!token);
    }

    // Make sure token exists
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      console.log('Token decoded:', decoded);
      
      // Get user from token
      const user = await User.findById(decoded.id).select('-password');
      console.log('User found:', !!user);
      console.log('User role:', user?.role);
      
      if (!user) {
        console.log('No user found with this token');
        return res.status(401).json({
          success: false,
          message: 'No user found with this token'
        });
      }

      if (!user.isActive) {
        console.log('User account is deactivated');
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated'
        });
      }

      req.user = user;
      console.log('User set in request:', req.user.id, req.user.role);
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    console.error('=== PROTECT MIDDLEWARE ERROR ===');
    console.error('Error object:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user is teacher or admin
const isTeacher = (req, res, next) => {
  console.log('=== IS TEACHER MIDDLEWARE ===');
  console.log('User:', req.user);
  console.log('User role:', req.user?.role);
  
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    console.log('Access denied - not teacher or admin');
    return res.status(403).json({
      success: false,
      message: 'Access denied. Teacher or admin role required.'
    });
  }
  
  console.log('Access granted - user is teacher or admin');
  next();
};

// Check if user is student
const isStudent = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Student role required.'
    });
  }
  next();
};

module.exports = {
  protect,
  authorize,
  isTeacher,
  isStudent
};
