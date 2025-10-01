const express = require('express');
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
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes (no authentication required)
// @route   GET /api/exams/public/:id
// @desc    Get single exam by ID (public for free exams)
// @access  Public
router.get('/public/:id', getPublicExam);

// @route   GET /api/exams/free
// @desc    Get free exams for home page
// @access  Public
router.get('/free', getFreeExams);

// All other routes are protected
router.use(protect);

// Routes now use centralized validation middleware

// @route   POST /api/exams/upload-image
// @desc    Upload question image to Cloudinary
// @access  Private (Teacher only)
router.post('/upload-image', isTeacher, async (req, res) => {
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

    // Upload to Cloudinary
    const cloudinary = require('../config/cloudinary');
    const result = await cloudinary.uploader.upload(imageData, {
      folder: 'qudrat/questions',
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto'
    });
    
    res.json({
      success: true,
      message: 'تم رفع الصورة بنجاح',
      imageUrl: result.secure_url // Return Cloudinary URL instead of Base64
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
router.get('/', protect, cacheMiddleware(300), getExams);

// @route   GET /api/exams/group/:groupNumber
// @desc    Get exams by group
// @access  Private
router.get('/group/:groupNumber', protect, cacheMiddleware(300), getExamsByGroup);

// Review Exam Routes (must come before /:id routes to avoid conflicts)
// @route   GET /api/exams/review
// @desc    Get student's review exams
// @access  Private (Student only)
router.get('/review', isStudent, getStudentReviewExams);

// Free Exam Management Routes (protected)

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
router.post('/review/:reviewExamId/submit', isStudent, submitReviewExam);

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
router.post('/', isTeacher, createExam);

// @route   PUT /api/exams/:id
// @desc    Update exam
// @access  Private (Teacher only)
router.put('/:id', isTeacher, updateExam);

// @route   DELETE /api/exams/:id
// @desc    Delete exam
// @access  Private (Teacher only)
router.delete('/:id', isTeacher, deleteExam);

// @route   POST /api/exams/:id/submit
// @desc    Submit exam answers
// @access  Private (Student only)
router.post('/:id/submit', isStudent, submitExam);

// @route   POST /api/exams/:id/repeat
// @desc    Repeat exam for student (Teacher only)
// @access  Private (Teacher only)
router.post('/:id/repeat', isTeacher, repeatExam);

module.exports = router;
