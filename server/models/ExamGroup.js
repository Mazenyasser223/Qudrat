const mongoose = require('mongoose');

const examGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  groupNumber: {
    type: Number,
    required: [true, 'Group number is required'],
    unique: true,
    min: 9 // Start from 9 to avoid conflicts with existing groups 0-8
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPremium: {
    type: Boolean,
    default: true // New groups are premium by default
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  examCount: {
    type: Number,
    default: 0
  },
  statistics: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    passRate: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Update examCount when exams are added/removed
examGroupSchema.pre('save', function(next) {
  // This will be updated by the exam controller when exams are created/deleted
  next();
});

// Indexes for performance
examGroupSchema.index({ groupNumber: 1 });
examGroupSchema.index({ isActive: 1 });
examGroupSchema.index({ createdBy: 1 });

module.exports = mongoose.model('ExamGroup', examGroupSchema);
