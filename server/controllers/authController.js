const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { debugLog } = require('../debugLog');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @desc    Register teacher
// @route   POST /api/auth/register
// @access  Public
const registerTeacher = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create teacher
    const teacher = await User.create({
      name,
      email,
      password,
      role: 'teacher'
    });

    // Generate token
    const token = generateToken(teacher._id);

    res.status(201).json({
      success: true,
      message: 'Teacher registered successfully',
      token,
      user: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role
      }
    });
  } catch (error) {
    console.error('Register teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  // #region agent log
  (function(p){debugLog(p);fetch('http://127.0.0.1:7914/ingest/5963aa55-001a-43d9-a9b3-abb9b2119b35',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'97296c'},body:JSON.stringify(p)}).catch(()=>{});})({sessionId:'97296c',location:'authController.js:login',message:'login_entry',data:{hasEmail:!!req.body?.email,hasPassword:!!req.body?.password},timestamp:Date.now(),hypothesisId:'login_fail'});
  // #endregion
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      // #region agent log
      (function(p){debugLog(p);fetch('http://127.0.0.1:7914/ingest/5963aa55-001a-43d9-a9b3-abb9b2119b35',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'97296c'},body:JSON.stringify(p)}).catch(()=>{});})({sessionId:'97296c',location:'authController.js:login',message:'login_validation_fail',data:{},timestamp:Date.now(),hypothesisId:'login_fail'});
      // #endregion
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      // #region agent log
      (function(p){debugLog(p);fetch('http://127.0.0.1:7914/ingest/5963aa55-001a-43d9-a9b3-abb9b2119b35',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'97296c'},body:JSON.stringify(p)}).catch(()=>{});})({sessionId:'97296c',location:'authController.js:login',message:'login_user_not_found',data:{},timestamp:Date.now(),hypothesisId:'login_fail'});
      // #endregion
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // #region agent log
      (function(p){debugLog(p);fetch('http://127.0.0.1:7914/ingest/5963aa55-001a-43d9-a9b3-abb9b2119b35',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'97296c'},body:JSON.stringify(p)}).catch(()=>{});})({sessionId:'97296c',location:'authController.js:login',message:'login_password_mismatch',data:{},timestamp:Date.now(),hypothesisId:'login_fail'});
      // #endregion
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      // #region agent log
      (function(p){debugLog(p);fetch('http://127.0.0.1:7914/ingest/5963aa55-001a-43d9-a9b3-abb9b2119b35',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'97296c'},body:JSON.stringify(p)}).catch(()=>{});})({sessionId:'97296c',location:'authController.js:login',message:'login_account_deactivated',data:{},timestamp:Date.now(),hypothesisId:'login_fail'});
      // #endregion
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate token
    const token = generateToken(user._id);

    // #region agent log
    (function(p){debugLog(p);fetch('http://127.0.0.1:7914/ingest/5963aa55-001a-43d9-a9b3-abb9b2119b35',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'97296c'},body:JSON.stringify(p)}).catch(()=>{});})({sessionId:'97296c',location:'authController.js:login',message:'login_success',data:{role:user.role},timestamp:Date.now(),hypothesisId:'login_fail'});
    // #endregion
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId
      }
    });
  } catch (error) {
    // #region agent log
    (function(p){debugLog(p);fetch('http://127.0.0.1:7914/ingest/5963aa55-001a-43d9-a9b3-abb9b2119b35',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'97296c'},body:JSON.stringify(p)}).catch(()=>{});})({sessionId:'97296c',location:'authController.js:login',message:'login_server_error',data:{errName:error?.name,errMessage:error?.message},timestamp:Date.now(),hypothesisId:'login_fail'});
    // #endregion
    if (process.env.NODE_ENV === 'development') {
      console.error('Login error:', error);
    }
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').lean();
    
    // Add best review score for each exam progress if user is a student
    if (user.role === 'student' && user.examProgress && user.examProgress.length > 0) {
      const ReviewExam = require('../models/ReviewExam');
      
      // Collect all review exam IDs
      const reviewExamIds = user.examProgress
        .filter(p => p.reviewExamId)
        .map(p => p.reviewExamId);
      
      // Fetch all review exams in ONE query instead of 222 separate queries
      const reviewExams = await ReviewExam.find({
        _id: { $in: reviewExamIds }
      }).select('_id bestPercentage').lean();
      
      // Create a map for O(1) lookup
      const reviewExamMap = {};
      reviewExams.forEach(re => {
        reviewExamMap[re._id.toString()] = re.bestPercentage || 0;
      });
      
      // Assign best review scores
      user.examProgress.forEach(progress => {
        progress.bestReviewScore = progress.reviewExamId 
          ? (reviewExamMap[progress.reviewExamId.toString()] || 0)
          : 0;
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

module.exports = {
  registerTeacher,
  login,
  getMe,
  logout
};
