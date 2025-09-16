const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionImage: {
    type: String, // URL or path to the image
    required: true
  },
  correctAnswer: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D']
  },
  explanation: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Exam title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  examGroup: {
    type: Number,
    required: [true, 'Exam group is required'],
    min: 0,
    max: 8
  },
  order: {
    type: Number,
    required: true,
    default: 1
  },
  questions: [questionSchema],
  timeLimit: {
    type: Number, // in minutes
    required: true,
    default: 60
  },
  totalQuestions: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFreeExam: {
    type: Boolean,
    default: false
  },
  freeExamOrder: {
    type: Number,
    min: 1,
    max: 3
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Update totalQuestions when questions are modified
examSchema.pre('save', function(next) {
  this.totalQuestions = this.questions.length;
  next();
});

// Virtual for pass rate calculation
examSchema.virtual('passRatePercentage').get(function() {
  if (this.statistics.totalAttempts === 0) return 0;
  return (this.statistics.passRate / this.statistics.totalAttempts) * 100;
});

module.exports = mongoose.model('Exam', examSchema);
