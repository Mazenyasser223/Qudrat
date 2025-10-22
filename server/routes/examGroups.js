const express = require('express');
const router = express.Router();
const {
  getExamGroups,
  getExamGroup,
  createExamGroup,
  updateExamGroup,
  deleteExamGroup,
  getGroupStatistics
} = require('../controllers/examGroupController');
// Public route for getting groups (for homepage)
router.get('/', getExamGroups);

// All other routes - temporarily removing authentication middleware
// router.use(protect);
// router.use(isTeacher);

// @route   GET /api/exam-groups/:id
// @desc    Get single exam group
// @access  Private (Teacher only)
router.get('/:id', getExamGroup);

// @route   POST /api/exam-groups
// @desc    Create new exam group
// @access  Private (Teacher only)
router.post('/', createExamGroup);

// @route   PUT /api/exam-groups/:id
// @desc    Update exam group
// @access  Private (Teacher only)
router.put('/:id', updateExamGroup);

// @route   DELETE /api/exam-groups/:id
// @desc    Delete exam group
// @access  Private (Teacher only)
router.delete('/:id', deleteExamGroup);

// @route   GET /api/exam-groups/:id/statistics
// @desc    Get group statistics
// @access  Private (Teacher only)
router.get('/:id/statistics', getGroupStatistics);

module.exports = router;
