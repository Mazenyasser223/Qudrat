const express = require('express');
const router = express.Router();
const {
  getReviews,
  getAllReviews,
  createReview,
  updateReview,
  deleteReview,
  approveReview,
  rejectReview
} = require('../controllers/reviewController');
const { protect, isTeacher } = require('../middleware/auth');
const upload = require('../middleware/uploadReviews');

// Public routes
router.get('/', getReviews); // Get approved reviews for home page
router.post('/submit', createReview); // Submit new review (no auth required)

// Protected routes - admin only
router.use(protect);
router.use(isTeacher);

// Get all reviews (admin)
router.get('/admin', getAllReviews);

// Create new review (admin - with image upload)
router.post('/admin', upload.single('image'), createReview);

// Update review
router.put('/:id', upload.single('image'), updateReview);

// Approve review
router.patch('/:id/approve', approveReview);

// Reject review
router.patch('/:id/reject', rejectReview);

// Delete review
router.delete('/:id', deleteReview);

module.exports = router;
