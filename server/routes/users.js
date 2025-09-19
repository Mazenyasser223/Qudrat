const express = require('express');
const { body, query } = require('express-validator');
const {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  unlockExamForStudent,
  lockExamForStudent,
  toggleMultipleExams,
  toggleGroupForStudent,
  searchStudents,
  assignSpecificExams,
  assignCategory,
  assignMultipleCategories,
  getAllStudentAnswers,
  getDashboardStats,
  getAnalytics
} = require('../controllers/userController');
const { protect, isTeacher } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Validation rules
const createStudentValidation = [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('الاسم يجب أن يكون حرفين على الأقل'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('يرجى إدخال بريد إلكتروني صحيح'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  body('studentId')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('رقم الطالب لا يمكن أن يكون فارغاً'),
  body('phoneNumber')
    .trim()
    .isLength({ min: 10 })
    .withMessage('رقم الجوال مطلوب ويجب أن يكون 10 أرقام على الأقل')
];

const updateStudentValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('الاسم يجب أن يكون حرفين على الأقل'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('يرجى إدخال بريد إلكتروني صحيح'),
  body('studentId')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('رقم الطالب لا يمكن أن يكون فارغاً'),
  body('phoneNumber')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('رقم الجوال يجب أن يكون 10 أرقام على الأقل'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('حالة النشاط يجب أن تكون true أو false')
];

const unlockExamValidation = [
  body('examId')
    .isMongoId()
    .withMessage('يرجى إدخال معرف امتحان صحيح')
];

const lockExamValidation = [
  body('examId')
    .isMongoId()
    .withMessage('يرجى إدخال معرف امتحان صحيح')
];

const toggleExamsValidation = [
  body('examIds')
    .isArray({ min: 1 })
    .withMessage('يرجى إدخال قائمة معرفات الامتحانات'),
  body('examIds.*')
    .isMongoId()
    .withMessage('يرجى إدخال معرفات امتحانات صحيحة'),
  body('action')
    .isIn(['lock', 'unlock'])
    .withMessage('الإجراء يجب أن يكون lock أو unlock')
];

const toggleGroupValidation = [
  body('groupNumber')
    .isInt({ min: 1, max: 8 })
    .withMessage('رقم المجموعة يجب أن يكون بين 1 و 8'),
  body('action')
    .isIn(['lock', 'unlock'])
    .withMessage('الإجراء يجب أن يكون lock أو unlock')
];

const assignExamsValidation = [
  body('examIds')
    .isArray({ min: 1 })
    .withMessage('يرجى اختيار امتحان واحد على الأقل'),
  body('examIds.*')
    .isMongoId()
    .withMessage('يرجى إدخال معرفات امتحانات صحيحة')
];

const assignCategoryValidation = [
  body('category')
    .isInt({ min: 1, max: 8 })
    .withMessage('يرجى اختيار مجموعة صحيحة (1-8)')
];

const assignMultipleCategoriesValidation = [
  body('categories')
    .isArray({ min: 1 })
    .withMessage('يرجى اختيار مجموعة واحدة على الأقل'),
  body('categories.*')
    .isInt({ min: 1, max: 8 })
    .withMessage('يرجى اختيار مجموعات صحيحة (1-8)')
];

// @route   GET /api/users/students
// @desc    Get all students
// @access  Private (Teacher only)
router.get('/students', isTeacher, getStudents);

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
router.post('/students', isTeacher, createStudentValidation, createStudent);

// @route   PUT /api/users/students/:id
// @desc    Update student
// @access  Private (Teacher only)
router.put('/students/:id', isTeacher, updateStudentValidation, updateStudent);

// @route   DELETE /api/users/students/:id
// @desc    Delete student
// @access  Private (Teacher only)
router.delete('/students/:id', isTeacher, deleteStudent);

// @route   PUT /api/users/students/:id/unlock-exam
// @desc    Unlock exam for student
// @access  Private (Teacher only)
router.put('/students/:id/unlock-exam', isTeacher, (req, res, next) => {
  console.log('=== UNLOCK EXAM VALIDATION MIDDLEWARE ===');
  console.log('Request body:', req.body);
  console.log('Request params:', req.params);
  console.log('User:', req.user);
  next();
}, unlockExamValidation, (req, res, next) => {
  console.log('=== AFTER UNLOCK EXAM VALIDATION ===');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  console.log('Validation passed, proceeding to controller');
  next();
}, unlockExamForStudent);

// @route   PUT /api/users/students/:id/lock-exam
// @desc    Lock exam for student
// @access  Private (Teacher only)
router.put('/students/:id/lock-exam', isTeacher, (req, res, next) => {
  console.log('=== LOCK EXAM VALIDATION MIDDLEWARE ===');
  console.log('Request body:', req.body);
  console.log('Request params:', req.params);
  console.log('User:', req.user);
  next();
}, lockExamValidation, (req, res, next) => {
  console.log('=== AFTER LOCK EXAM VALIDATION ===');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  console.log('Validation passed, proceeding to controller');
  next();
}, lockExamForStudent);

// @route   PUT /api/users/students/:id/toggle-exams
// @desc    Lock/Unlock multiple exams for student
// @access  Private (Teacher only)
router.put('/students/:id/toggle-exams', isTeacher, (req, res, next) => {
  console.log('=== TOGGLE EXAMS MIDDLEWARE ===');
  console.log('Request body:', req.body);
  console.log('Request params:', req.params);
  console.log('User:', req.user);
  next();
}, (req, res, next) => {
  console.log('=== VALIDATION MIDDLEWARE ===');
  console.log('Validating request body:', req.body);
  next();
}, toggleExamsValidation, (req, res, next) => {
  console.log('=== AFTER VALIDATION ===');
  console.log('Validation passed, proceeding to controller');
  next();
}, toggleMultipleExams);

// @route   PUT /api/users/students/:id/toggle-group
// @desc    Lock/Unlock entire group for student
// @access  Private (Teacher only)
router.put('/students/:id/toggle-group', isTeacher, toggleGroupValidation, toggleGroupForStudent);

// @route   POST /api/users/students/:id/assign-exams
// @desc    Assign specific exams to student
// @access  Private (Teacher only)
router.post('/students/:id/assign-exams', isTeacher, assignExamsValidation, assignSpecificExams);

// @route   POST /api/users/students/:id/assign-category
// @desc    Assign specific category to student
// @access  Private (Teacher only)
router.post('/students/:id/assign-category', isTeacher, assignCategoryValidation, assignCategory);

// @route   POST /api/users/students/:id/assign-categories
// @desc    Assign multiple categories to student
// @access  Private (Teacher only)
router.post('/students/:id/assign-categories', isTeacher, assignMultipleCategoriesValidation, assignMultipleCategories);

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

module.exports = router;
