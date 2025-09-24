const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\u0600-\u06FF\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phoneNumber')
    .optional()
    .isMobilePhone('ar-SA')
    .withMessage('Please provide a valid Saudi phone number'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('role')
    .optional()
    .isIn(['student', 'teacher', 'admin'])
    .withMessage('Role must be student, teacher, or admin'),
  
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Exam creation validation
const validateExamCreation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Exam title must be between 3 and 100 characters')
    .escape(),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
    .escape(),
  
  body('examGroup')
    .isInt({ min: 0, max: 8 })
    .withMessage('Exam group must be between 0 and 8'),
  
  body('order')
    .isInt({ min: 1 })
    .withMessage('Order must be a positive integer'),
  
  body('timeLimit')
    .isInt({ min: 1, max: 300 })
    .withMessage('Time limit must be between 1 and 300 minutes'),
  
  body('isFreeExam')
    .isBoolean()
    .withMessage('isFreeExam must be a boolean value'),
  
  body('questions')
    .isArray({ min: 1 })
    .withMessage('At least one question is required'),
  
  body('questions.*.questionImage')
    .notEmpty()
    .withMessage('Question image is required')
    .isURL()
    .withMessage('Question image must be a valid URL'),
  
  body('questions.*.options')
    .isArray({ min: 2, max: 5 })
    .withMessage('Each question must have between 2 and 5 options'),
  
  body('questions.*.correctAnswer')
    .isInt({ min: 0, max: 4 })
    .withMessage('Correct answer must be between 0 and 4'),
  
  handleValidationErrors
];

// Exam update validation
const validateExamUpdate = [
  param('id')
    .isMongoId()
    .withMessage('Invalid exam ID'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Exam title must be between 3 and 100 characters')
    .escape(),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
    .escape(),
  
  body('examGroup')
    .optional()
    .isInt({ min: 0, max: 8 })
    .withMessage('Exam group must be between 0 and 8'),
  
  body('order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Order must be a positive integer'),
  
  body('timeLimit')
    .optional()
    .isInt({ min: 1, max: 300 })
    .withMessage('Time limit must be between 1 and 300 minutes'),
  
  body('isFreeExam')
    .optional()
    .isBoolean()
    .withMessage('isFreeExam must be a boolean value'),
  
  body('questions')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one question is required'),
  
  body('questions.*.questionImage')
    .optional()
    .notEmpty()
    .withMessage('Question image is required')
    .isURL()
    .withMessage('Question image must be a valid URL'),
  
  body('questions.*.options')
    .optional()
    .isArray({ min: 2, max: 5 })
    .withMessage('Each question must have between 2 and 5 options'),
  
  body('questions.*.correctAnswer')
    .optional()
    .isInt({ min: 0, max: 4 })
    .withMessage('Correct answer must be between 0 and 4'),
  
  handleValidationErrors
];

// Exam submission validation
const validateExamSubmission = [
  param('id')
    .isMongoId()
    .withMessage('Invalid exam ID'),
  
  body('answers')
    .isArray()
    .withMessage('Answers must be an array'),
  
  body('answers.*.questionId')
    .isMongoId()
    .withMessage('Invalid question ID'),
  
  body('answers.*.selectedAnswer')
    .optional()
    .isInt({ min: 0, max: 4 })
    .withMessage('Selected answer must be between 0 and 4'),
  
  body('timeSpent')
    .isInt({ min: 0 })
    .withMessage('Time spent must be a non-negative integer'),
  
  handleValidationErrors
];

// User ID validation
const validateUserId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  handleValidationErrors
];

// Exam ID validation
const validateExamId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid exam ID'),
  
  handleValidationErrors
];

// Review creation validation
const validateReviewCreation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Review title must be between 3 and 100 characters')
    .escape(),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters')
    .escape(),
  
  body('questions')
    .isArray({ min: 1 })
    .withMessage('At least one question is required'),
  
  body('questions.*.questionImage')
    .notEmpty()
    .withMessage('Question image is required')
    .isURL()
    .withMessage('Question image must be a valid URL'),
  
  body('questions.*.options')
    .isArray({ min: 2, max: 5 })
    .withMessage('Each question must have between 2 and 5 options'),
  
  body('questions.*.correctAnswer')
    .isInt({ min: 0, max: 4 })
    .withMessage('Correct answer must be between 0 and 4'),
  
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

// Search validation
const validateSearch = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
    .escape(),
  
  handleValidationErrors
];

// Sanitize input middleware
const sanitizeInput = (req, res, next) => {
  // Remove any potential XSS attempts
  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        obj[key] = sanitizeObject(obj[key]);
      }
    }
    return obj;
  };
  
  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);
  
  next();
};

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateExamCreation,
  validateExamUpdate,
  validateExamSubmission,
  validateUserId,
  validateExamId,
  validateReviewCreation,
  validatePagination,
  validateSearch,
  sanitizeInput,
  handleValidationErrors
};
