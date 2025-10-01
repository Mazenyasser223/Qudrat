const express = require('express');
const { body, query } = require('express-validator');
const {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  toggleMultipleExams,
  toggleGroupForStudent,
  searchStudents,
  assignSpecificExams,
  assignCategory,
  assignMultipleCategories,
  getAllStudentAnswers,
  getDashboardStats,
  getAnalytics,
  toggleExamAccess,
  toggleGroupAccess,
  openAllExams,
  closeAllExams,
  reopenExamForStudent
} = require('../controllers/userController');
const { protect, isTeacher } = require('../middleware/auth');

const router = express.Router();

// Public test endpoint (before protect middleware)
// @route   GET /api/users/test-public/:studentId/:examId
// @desc    Public test for specific student and exam lookup (no auth required)
// @access  Public
router.get('/test-public/:studentId/:examId', async (req, res) => {
  try {
    console.log('=== PUBLIC TESTING SPECIFIC STUDENT AND EXAM ===');
    console.log('Student ID:', req.params.studentId);
    console.log('Exam ID:', req.params.examId);
    
    const User = require('../models/User');
    const Exam = require('../models/Exam');
    
    // Test finding the specific student
    const student = await User.findById(req.params.studentId);
    console.log('Student found:', !!student);
    console.log('Student role:', student?.role);
    console.log('Student name:', student?.name);
    
    // Test finding the specific exam
    const exam = await Exam.findById(req.params.examId);
    console.log('Exam found:', !!exam);
    console.log('Exam title:', exam?.title);
    console.log('Exam group:', exam?.examGroup);
    console.log('Exam isActive:', exam?.isActive);
    
    // Test if student has progress for this exam
    const existingProgress = student?.examProgress?.find(
      progress => progress.examId.toString() === req.params.examId
    );
    console.log('Existing progress:', !!existingProgress);
    console.log('Progress status:', existingProgress?.status);
    
    res.json({
      success: true,
      message: 'Public test completed',
      data: {
        student: student ? {
          id: student._id,
          name: student.name,
          role: student.role,
          examProgressCount: student.examProgress?.length || 0
        } : null,
        exam: exam ? {
          id: exam._id,
          title: exam.title,
          examGroup: exam.examGroup,
          isActive: exam.isActive
        } : null,
        existingProgress: existingProgress ? {
          status: existingProgress.status,
          examGroup: existingProgress.examGroup
        } : null
      }
    });
  } catch (error) {
    console.error('Public test error:', error);
    res.status(500).json({
      success: false,
      message: 'Public test failed',
      error: error.message
    });
  }
});

// All other routes are protected
router.use(protect);

// Validation rules removed for flexibility

// @route   GET /api/users/students
// @desc    Get all students
// @access  Private (Teacher only)
router.get('/students', isTeacher, require('../middleware/cache').cacheMiddleware(300), getStudents);

// @route   GET /api/users/students/search
// @desc    Search students
// @access  Private (Teacher only)
router.get('/students/search', isTeacher, searchStudents);

// @route   GET /api/users/students/:id
// @desc    Get single student
// @access  Private (Teacher only)
router.get('/students/:id', isTeacher, getStudent);

// @route   GET /api/users/students/:id/all-answers
// @desc    Get all student answers across all exams
// @access  Private (Teacher only)
router.get('/students/:id/all-answers', isTeacher, getAllStudentAnswers);

// @route   POST /api/users/students
// @desc    Create new student
// @access  Private (Teacher only)
router.post('/students', isTeacher, createStudent);

// @route   PUT /api/users/students/:id
// @desc    Update student
// @access  Private (Teacher only)
router.put('/students/:id', isTeacher, updateStudent);

// @route   DELETE /api/users/students/:id
// @desc    Delete student
// @access  Private (Teacher only)
router.delete('/students/:id', isTeacher, deleteStudent);


// @route   PUT /api/users/students/:id/toggle-exams
// @desc    Lock/Unlock multiple exams for student
// @access  Private (Teacher only)
router.put('/students/:id/toggle-exams', isTeacher, toggleMultipleExams);

// @route   PUT /api/users/students/:id/toggle-group
// @desc    Lock/Unlock entire group for student
// @access  Private (Teacher only)
router.put('/students/:id/toggle-group', isTeacher, toggleGroupForStudent);

// @route   POST /api/users/students/:id/assign-exams
// @desc    Assign specific exams to student
// @access  Private (Teacher only)
router.post('/students/:id/assign-exams', isTeacher, assignSpecificExams);

// @route   POST /api/users/students/:id/assign-category
// @desc    Assign specific category to student
// @access  Private (Teacher only)
router.post('/students/:id/assign-category', isTeacher, assignCategory);

// @route   POST /api/users/students/:id/assign-categories
// @desc    Assign multiple categories to student
// @access  Private (Teacher only)
router.post('/students/:id/assign-categories', isTeacher, assignMultipleCategories);

// @route   GET /api/users/dashboard-stats
// @desc    Get dashboard statistics
// @access  Private (Teacher/Admin only)
router.get('/dashboard-stats', isTeacher, getDashboardStats);

// @route   GET /api/users/analytics
// @desc    Get analytics data
// @access  Private (Teacher/Admin only)
router.get('/analytics', isTeacher, getAnalytics);

// @route   GET /api/users/test-db
// @desc    Test database connection
// @access  Private (Teacher only)
router.get('/test-db', isTeacher, async (req, res) => {
  try {
    console.log('=== TESTING DATABASE CONNECTION ===');
    
    // Test User model
    const userCount = await require('../models/User').countDocuments();
    console.log('User count:', userCount);
    
    // Test Exam model
    const examCount = await require('../models/Exam').countDocuments();
    console.log('Exam count:', examCount);
    
    // Test finding a specific exam
    const exam = await require('../models/Exam').findOne();
    console.log('Sample exam:', exam ? { id: exam._id, title: exam.title, examGroup: exam.examGroup } : 'No exams found');
    
    res.json({
      success: true,
      message: 'Database connection working',
      data: {
        userCount,
        examCount,
        sampleExam: exam ? { id: exam._id, title: exam.title, examGroup: exam.examGroup } : null
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// @route   GET /api/users/test-specific/:studentId/:examId
// @desc    Test specific student and exam lookup
// @access  Private (Teacher only)
router.get('/test-specific/:studentId/:examId', isTeacher, async (req, res) => {
  try {
    console.log('=== TESTING SPECIFIC STUDENT AND EXAM ===');
    console.log('Student ID:', req.params.studentId);
    console.log('Exam ID:', req.params.examId);
    
    const User = require('../models/User');
    const Exam = require('../models/Exam');
    
    // Test finding the specific student
    const student = await User.findById(req.params.studentId);
    console.log('Student found:', !!student);
    console.log('Student role:', student?.role);
    console.log('Student name:', student?.name);
    
    // Test finding the specific exam
    const exam = await Exam.findById(req.params.examId);
    console.log('Exam found:', !!exam);
    console.log('Exam title:', exam?.title);
    console.log('Exam group:', exam?.examGroup);
    console.log('Exam isActive:', exam?.isActive);
    
    // Test if student has progress for this exam
    const existingProgress = student?.examProgress?.find(
      progress => progress.examId.toString() === req.params.examId
    );
    console.log('Existing progress:', !!existingProgress);
    console.log('Progress status:', existingProgress?.status);
    
    res.json({
      success: true,
      message: 'Specific test completed',
      data: {
        student: student ? {
          id: student._id,
          name: student.name,
          role: student.role,
          examProgressCount: student.examProgress?.length || 0
        } : null,
        exam: exam ? {
          id: exam._id,
          title: exam.title,
          examGroup: exam.examGroup,
          isActive: exam.isActive
        } : null,
        existingProgress: existingProgress ? {
          status: existingProgress.status,
          examGroup: existingProgress.examGroup
        } : null
      }
    });
  } catch (error) {
    console.error('Specific test error:', error);
    res.status(500).json({
      success: false,
      message: 'Specific test failed',
      error: error.message
    });
  }
});

// @route   PUT /api/users/students/:id/toggle-exam/:examId
// @desc    Toggle individual exam access for student (open/close single exam)
// @access  Private (Teacher only)
router.put('/students/:id/toggle-exam/:examId', isTeacher, [
  body('action').isIn(['open', 'close']).withMessage('Action must be "open" or "close"')
], toggleExamAccess);

// @route   PUT /api/users/students/:id/toggle-group/:groupId
// @desc    Toggle group exam access for student (open/close all exams in a group)
// @access  Private (Teacher only)
router.put('/students/:id/toggle-group/:groupId', isTeacher, [
  body('action').isIn(['open', 'close']).withMessage('Action must be "open" or "close"')
], toggleGroupAccess);

// @route   PUT /api/users/students/:id/open-all-exams
// @desc    Open all exams for student
// @access  Private (Teacher only)
router.put('/students/:id/open-all-exams', isTeacher, openAllExams);

// @route   PUT /api/users/students/:id/close-all-exams
// @desc    Close all exams for student
// @access  Private (Teacher only)
router.put('/students/:id/close-all-exams', isTeacher, closeAllExams);

// @route   PUT /api/users/students/:id/reopen-exam/:examId
// @desc    Reopen completed exam for student (allow retake while keeping previous scores)
// @access  Private (Teacher only)
router.put('/students/:id/reopen-exam/:examId', isTeacher, reopenExamForStudent);

module.exports = router;
