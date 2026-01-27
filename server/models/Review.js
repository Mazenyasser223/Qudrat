const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  // Legacy fields for backward compatibility
  imageUrl: {
    type: String,
    required: false
  },
  imagePath: {
    type: String,
    required: false
  },
  // New approval system
  isApproved: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Performance indexes
reviewSchema.index({ isActive: 1 });
reviewSchema.index({ isApproved: 1 });
reviewSchema.index({ order: 1 });
reviewSchema.index({ createdAt: -1 });
// Compound index for common queries
reviewSchema.index({ isActive: 1, isApproved: 1 });

module.exports = mongoose.model('Review', reviewSchema);
