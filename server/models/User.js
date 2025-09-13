const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  role: {
    type: String,
    enum: ['teacher', 'student', 'admin'],
    default: 'student'
  },
  studentId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  },
  phoneNumber: {
    type: String,
    required: function() {
      return this.role === 'student';
    },
    unique: true,
    sparse: true // Allows multiple null values for teachers
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  examProgress: [{
    examGroup: {
      type: Number,
      required: true
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true
    },
    status: {
      type: String,
      enum: ['locked', 'unlocked', 'in_progress', 'completed'],
      default: 'locked'
    },
    score: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    startTime: {
      type: Date
    },
    endTime: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    answers: [{
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
      },
      selectedAnswer: String,
      isCorrect: Boolean
    }],
    wrongQuestions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    }],
    reviewExamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReviewExam'
    }
  }],
  totalScore: {
    type: Number,
    default: 0
  },
  overallPercentage: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
