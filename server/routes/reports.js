const express = require('express');
const { generateLiveDuplicateReport } = require('../controllers/reportController');
const { protect, isTeacher } = require('../middleware/auth');

const router = express.Router();

// Generate Arabic duplicate report for active exams using existing DB connection
router.post('/duplicates/live-ar', protect, isTeacher, generateLiveDuplicateReport);

module.exports = router;


