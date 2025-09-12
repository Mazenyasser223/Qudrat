const mongoose = require('mongoose');

const reviewExamSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalExamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  title: {
    type: String,
    required: true,
    default: 'امتحان المراجعة'
  },
  description: {
    type: String,
    default: 'امتحان مراجعة للأسئلة الخاطئة'
  },
  questions: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    originalQuestionIndex: {
      type: Number,
      required: true
    }
  }],
  timeLimit: {
    type: Number,
    default: 30 // 30 minutes for review exam
  },
  isActive: {
    type: Boolean,
    default: true
  },
  attempts: [{
    attemptNumber: {
      type: Number,
      required: true
    },
    answers: [{
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
      },
      selectedAnswer: String,
      isCorrect: Boolean
    }],
    score: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    completedAt: {
      type: Date,
      default: Date.now
    }
  }],
  bestScore: {
    type: Number,
    default: 0
  },
  bestPercentage: {
    type: Number,
    default: 0
  },
  totalAttempts: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for better performance
reviewExamSchema.index({ studentId: 1, originalExamId: 1 });

// Virtual for current attempt number
reviewExamSchema.virtual('currentAttemptNumber').get(function() {
  return this.totalAttempts + 1;
});

module.exports = mongoose.model('ReviewExam', reviewExamSchema);
