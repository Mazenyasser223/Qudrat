const express = require('express');
const router = express.Router();
const {
  getReviews,
  getAllReviews,
  createReview,
  updateReview,
  deleteReview
} = require('../controllers/reviewController');
const { protect, isTeacher } = require('../middleware/auth');
const upload = require('../middleware/uploadReviews');

// Public route - get active reviews for home page
router.get('/', getReviews);

// Protected routes - admin only
router.use(protect);
router.use(isTeacher);

// Get all reviews (admin)
router.get('/admin', getAllReviews);

// Create new review
router.post('/', upload.single('image'), createReview);

// Update review
router.put('/:id', upload.single('image'), updateReview);

// Delete review
router.delete('/:id', deleteReview);

module.exports = router;
