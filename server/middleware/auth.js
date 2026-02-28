const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { debugLog } = require('../debugLog');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
      // #region agent log
      (function(p){debugLog(p);require('http').request({hostname:'127.0.0.1',port:7914,path:'/ingest/5963aa55-001a-43d9-a9b3-abb9b2119b35',method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'97296c'}}, (r) => { r.resume(); }).end(JSON.stringify(p));})({sessionId:'97296c',location:'auth.js:protect',message:'protect_no_token',data:{path:req.path},timestamp:Date.now(),hypothesisId:'token_invalid'});
      // #endregion
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      
      // Get user from token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        // #region agent log
        (function(p){debugLog(p);require('http').request({hostname:'127.0.0.1',port:7914,path:'/ingest/5963aa55-001a-43d9-a9b3-abb9b2119b35',method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'97296c'}}, (r) => { r.resume(); }).end(JSON.stringify(p));})({sessionId:'97296c',location:'auth.js:protect',message:'protect_user_not_found',data:{path:req.path},timestamp:Date.now(),hypothesisId:'token_invalid'});
        // #endregion
        return res.status(401).json({
          success: false,
          message: 'No user found with this token'
        });
      }

      if (!user.isActive) {
        // #region agent log
        (function(p){debugLog(p);require('http').request({hostname:'127.0.0.1',port:7914,path:'/ingest/5963aa55-001a-43d9-a9b3-abb9b2119b35',method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'97296c'}}, (r) => { r.resume(); }).end(JSON.stringify(p));})({sessionId:'97296c',location:'auth.js:protect',message:'protect_user_deactivated',data:{path:req.path},timestamp:Date.now(),hypothesisId:'token_invalid'});
        // #endregion
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated'
        });
      }

      // #region agent log
      (function(p){debugLog(p);require('http').request({hostname:'127.0.0.1',port:7914,path:'/ingest/5963aa55-001a-43d9-a9b3-abb9b2119b35',method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'97296c'}}, (r) => { r.resume(); }).end(JSON.stringify(p));})({sessionId:'97296c',location:'auth.js:protect',message:'protect_success',data:{path:req.path},timestamp:Date.now(),hypothesisId:'jwt_verify_fail'});
      // #endregion
      req.user = user;
      next();
    } catch (error) {
      // #region agent log
      (function(p){debugLog(p);require('http').request({hostname:'127.0.0.1',port:7914,path:'/ingest/5963aa55-001a-43d9-a9b3-abb9b2119b35',method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'97296c'}}, (r) => { r.resume(); }).end(JSON.stringify(p));})({sessionId:'97296c',location:'auth.js:protect',message:'protect_jwt_verify_fail',data:{path:req.path,errName:error?.name,errMessage:error?.message},timestamp:Date.now(),hypothesisId:'jwt_verify_fail'});
      // #endregion
      if (process.env.NODE_ENV === 'development') {
        console.error('Token verification error:', error.message);
      }
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Protect middleware error:', error);
    }
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
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Teacher or admin role required.'
    });
  }
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
