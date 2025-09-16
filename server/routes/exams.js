const express = require('express');
const { body } = require('express-validator');
const { 
  getExams, 
  getExam, 
  createExam, 
  updateExam, 
  deleteExam, 
  getExamsByGroup,
  submitExam,
  getReviewExam,
  submitReviewExam,
  getStudentReviewExams,
  repeatExam,
  getStudentMistakes,
  getStudentSubmission,
  getMySubmission,
  getPublicExam,
  getFreeExams,
  getFreeExamsForManagement,
  setExamAsFree,
  removeExamFromFree
} = require('../controllers/examController');
const { protect, isTeacher, isStudent } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// All routes are protected
router.use(protect);

// Validation rules
const createExamValidation = [
  body('title')
    .trim()
    .isLength({ min: 1 })
    .withMessage('عنوان الامتحان مطلوب'),
  body('examGroup')
    .isInt({ min: 0, max: 8 })
    .withMessage('المجموعة يجب أن تكون بين 0 و 8'),
  body('order')
    .isInt({ min: 1 })
    .withMessage('الترتيب يجب أن يكون رقماً موجباً'),
  body('timeLimit')
    .isInt({ min: 1 })
    .withMessage('الوقت المحدد يجب أن يكون دقيقة واحدة على الأقل'),
  body('questions')
    .custom((value) => {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error('يجب أن يحتوي الامتحان على سؤال واحد على الأقل');
        }
        // Validate each question
        parsed.forEach((question, index) => {
          if (!question.correctAnswer || !['A', 'B', 'C', 'D'].includes(question.correctAnswer)) {
            throw new Error(`الإجابة الصحيحة للسؤال ${index + 1} يجب أن تكون A, B, C, أو D`);
          }
        });
        return true;
      } catch (error) {
        throw new Error(error.message);
      }
    })
];

const updateExamValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('عنوان الامتحان لا يمكن أن يكون فارغاً'),
  body('examGroup')
    .optional()
    .isInt({ min: 0, max: 8 })
    .withMessage('المجموعة يجب أن تكون بين 0 و 8'),
  body('order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('الترتيب يجب أن يكون رقماً موجباً'),
  body('timeLimit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('الوقت المحدد يجب أن يكون دقيقة واحدة على الأقل'),
  body('questions')
    .optional()
    .custom((value) => {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (!Array.isArray(parsed) || parsed.length < 1) {
          throw new Error('يجب أن يحتوي الامتحان على سؤال واحد على الأقل');
        }
        return true;
      } catch (error) {
        throw new Error('يجب أن يحتوي الامتحان على سؤال واحد على الأقل');
      }
    }),
  body('questions')
    .optional()
    .custom((value) => {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (Array.isArray(parsed)) {
          for (const question of parsed) {
            if (!question.correctAnswer || !['A', 'B', 'C', 'D'].includes(question.correctAnswer)) {
              throw new Error('الإجابة الصحيحة يجب أن تكون A, B, C, أو D');
            }
          }
        }
        return true;
      } catch (error) {
        throw new Error('الإجابة الصحيحة يجب أن تكون A, B, C, أو D');
      }
    }),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('حالة النشاط يجب أن تكون true أو false')
];

const submitExamValidation = [
  body('answers')
    .isArray({ min: 1 })
    .withMessage('يجب أن تحتوي على إجابة واحدة على الأقل'),
  body('answers.*.selectedAnswer')
    .isIn(['A', 'B', 'C', 'D'])
    .withMessage('الإجابة المختارة يجب أن تكون A, B, C, أو D')
];

// @route   POST /api/exams/upload-image
// @desc    Upload question image
// @access  Private (Teacher only)
router.post('/upload-image', isTeacher, (req, res) => {
  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم رفع أي ملف'
      });
    }

    // Validate base64 format
    if (!imageData.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        message: 'تنسيق الصورة غير صحيح'
      });
    }
    
    res.json({
      success: true,
      message: 'تم رفع الصورة بنجاح',
      imageUrl: imageData // Return the base64 data directly
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء رفع الصورة'
    });
  }
});

// @route   GET /api/exams
// @desc    Get all exams
// @access  Private
router.get('/', getExams);

// @route   GET /api/exams/group/:groupNumber
// @desc    Get exams by group
// @access  Private
router.get('/group/:groupNumber', getExamsByGroup);

// Review Exam Routes (must come before /:id routes to avoid conflicts)
// @route   GET /api/exams/review
// @desc    Get student's review exams
// @access  Private (Student only)
router.get('/review', isStudent, getStudentReviewExams);

// Public Exam Routes
// @route   GET /api/exams/public/:id
// @desc    Get single exam by ID (public for free exams)
// @access  Public
router.get('/public/:id', getPublicExam);

// Free Exam Routes
// @route   GET /api/exams/free
// @desc    Get free exams for home page
// @access  Public
router.get('/free', getFreeExams);

// @route   GET /api/exams/free/manage
// @desc    Get free exams for teacher management
// @access  Private (Teacher only)
router.get('/free/manage', isTeacher, getFreeExamsForManagement);

// @route   PUT /api/exams/:id/set-free
// @desc    Set exam as free exam
// @access  Private (Teacher only)
router.put('/:id/set-free', isTeacher, setExamAsFree);

// @route   PUT /api/exams/:id/remove-free
// @desc    Remove exam from free exams
// @access  Private (Teacher only)
router.put('/:id/remove-free', isTeacher, removeExamFromFree);

// @route   GET /api/exams/review/:reviewExamId
// @desc    Get review exam
// @access  Private (Student only)
router.get('/review/:reviewExamId', isStudent, getReviewExam);

// @route   POST /api/exams/review/:reviewExamId/submit
// @desc    Submit review exam answers
// @access  Private (Student only)
router.post('/review/:reviewExamId/submit', isStudent, submitExamValidation, submitReviewExam);

// @route   GET /api/exams/:examId/student-mistakes/:studentId
// @desc    Get student mistakes for a specific exam
// @access  Private (Teacher only)
router.get('/:examId/student-mistakes/:studentId', isTeacher, getStudentMistakes);

// @route   GET /api/exams/:examId/student-submission/:studentId
// @desc    Get student submission for a specific exam
// @access  Private (Teacher only)
router.get('/:examId/student-submission/:studentId', isTeacher, getStudentSubmission);

// @route   GET /api/exams/:examId/student-submission
// @desc    Get current student's submission for a specific exam
// @access  Private (Student only)
router.get('/:examId/student-submission', isStudent, getMySubmission);

// Regular Exam Routes
// @route   GET /api/exams/:id
// @desc    Get single exam
// @access  Private
router.get('/:id', getExam);

// @route   POST /api/exams
// @desc    Create new exam
// @access  Private (Teacher only)
router.post('/', isTeacher, createExamValidation, createExam);

// @route   PUT /api/exams/:id
// @desc    Update exam
// @access  Private (Teacher only)
router.put('/:id', isTeacher, updateExamValidation, updateExam);

// @route   DELETE /api/exams/:id
// @desc    Delete exam
// @access  Private (Teacher only)
router.delete('/:id', isTeacher, deleteExam);

// @route   POST /api/exams/:id/submit
// @desc    Submit exam answers
// @access  Private (Student only)
router.post('/:id/submit', isStudent, submitExamValidation, submitExam);

// @route   POST /api/exams/:id/repeat
// @desc    Repeat exam for student (Teacher only)
// @access  Private (Teacher only)
router.post('/:id/repeat', isTeacher, [
  body('studentId')
    .isMongoId()
    .withMessage('يرجى إدخال معرف طالب صحيح')
], repeatExam);

module.exports = router;
