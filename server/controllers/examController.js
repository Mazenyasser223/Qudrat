const Exam = require('../models/Exam');
const User = require('../models/User');
const ReviewExam = require('../models/ReviewExam');
const { validationResult } = require('express-validator');
const path = require('path');

// @desc    Get all exams
// @route   GET /api/exams
// @access  Private
const getExams = async (req, res) => {
  try {
    const exams = await Exam.find({ isActive: true })
      .populate('createdBy', 'name email')
      .sort({ examGroup: 1, order: 1 });

    res.json({
      success: true,
      count: exams.length,
      data: exams
    });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching exams'
    });
  }
};

// @desc    Get single exam
// @route   GET /api/exams/:id
// @access  Private
const getExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    res.json({
      success: true,
      data: exam
    });
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching exam'
    });
  }
};

// @desc    Create new exam
// @route   POST /api/exams
// @access  Private (Teacher only)
const createExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { title, description, examGroup, order, timeLimit, questions } = req.body;

    // Check if exam with same group and order exists
    const existingExam = await Exam.findOne({ 
      examGroup, 
      order, 
      isActive: true 
    });

    if (existingExam) {
      return res.status(400).json({
        success: false,
        message: 'Exam with this group and order already exists'
      });
    }

    // Parse questions if it's a string
    const parsedQuestions = typeof questions === 'string' ? JSON.parse(questions) : questions;

    // Questions already contain Base64 image data, no need to map files
    const questionsWithImages = parsedQuestions.map((question) => {
      return {
        ...question,
        questionImage: question.questionImage || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' // 1x1 transparent pixel
      };
    });

    // Create exam
    const exam = await Exam.create({
      title,
      description,
      examGroup,
      order,
      timeLimit,
      questions: questionsWithImages,
      totalQuestions: questionsWithImages.length,
      createdBy: req.user.id
    });

    // Update all students' exam progress
    await updateStudentsExamProgress();

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: exam
    });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating exam'
    });
  }
};

// @desc    Update exam
// @route   PUT /api/exams/:id
// @access  Private (Teacher only)
const updateExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { title, description, examGroup, order, timeLimit, questions, isActive } = req.body;

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check if exam with same group and order exists (excluding current exam)
    if (examGroup !== exam.examGroup || order !== exam.order) {
      const existingExam = await Exam.findOne({
        _id: { $ne: req.params.id },
        examGroup,
        order,
        isActive: true
      });

      if (existingExam) {
        return res.status(400).json({
          success: false,
          message: 'Exam with this group and order already exists'
        });
      }
    }

    // Parse questions if it's a string
    let parsedQuestions;
    try {
      parsedQuestions = typeof questions === 'string' ? JSON.parse(questions) : questions;
    } catch (parseError) {
      console.error('Error parsing questions:', parseError);
      return res.status(400).json({
        success: false,
        message: 'Invalid questions format'
      });
    }

    // Questions already contain Base64 image data, no need to map files
    const questionsWithImages = parsedQuestions.map((question) => {
      return {
        ...question,
        questionImage: question.questionImage || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' // 1x1 transparent pixel
      };
    });

    // Update exam
    const updatedExam = await Exam.findByIdAndUpdate(
      req.params.id,
      { 
        title, 
        description, 
        examGroup, 
        order, 
        timeLimit, 
        questions: questionsWithImages, 
        totalQuestions: questionsWithImages.length,
        isActive 
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Exam updated successfully',
      data: updatedExam
    });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating exam'
    });
  }
};

// @desc    Delete exam
// @route   DELETE /api/exams/:id
// @access  Private (Teacher only)
const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Soft delete by setting isActive to false
    exam.isActive = false;
    await exam.save();

    // Clean up orphaned progress data from all students
    await User.updateMany(
      { 'examProgress.examId': exam._id },
      { $pull: { examProgress: { examId: exam._id } } }
    );

    res.json({
      success: true,
      message: 'Exam deleted successfully and progress data cleaned up'
    });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting exam'
    });
  }
};

// @desc    Get exams by group
// @route   GET /api/exams/group/:groupNumber
// @access  Private
const getExamsByGroup = async (req, res) => {
  try {
    const groupNumber = parseInt(req.params.groupNumber);
    
    if (groupNumber < 1 || groupNumber > 8) {
      return res.status(400).json({
        success: false,
        message: 'Group number must be between 1 and 8'
      });
    }

    const exams = await Exam.find({ 
      examGroup: groupNumber, 
      isActive: true 
    }).sort({ order: 1 });

    res.json({
      success: true,
      count: exams.length,
      data: exams
    });
  } catch (error) {
    console.error('Get exams by group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching exams by group'
    });
  }
};

// @desc    Submit exam answers
// @route   POST /api/exams/:id/submit
// @access  Private (Student only)
const submitExam = async (req, res) => {
  try {
    const { answers } = req.body;

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    const student = await User.findById(req.user.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find exam progress
    const examProgress = student.examProgress.find(
      progress => progress.examId.toString() === req.params.id
    );

    if (!examProgress) {
      return res.status(404).json({
        success: false,
        message: 'Exam progress not found'
      });
    }

    if (examProgress.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Exam already completed. You can only take each exam once.'
      });
    }

    // Calculate score and collect wrong questions
    let correctAnswers = 0;
    const detailedAnswers = [];
    const wrongQuestions = [];

    answers.forEach((answer, index) => {
      const question = exam.questions[index];
      const isCorrect = answer.selectedAnswer === question.correctAnswer;
      
      if (isCorrect) {
        correctAnswers++;
      } else {
        // Collect wrong questions
        wrongQuestions.push(question._id);
      }

      detailedAnswers.push({
        questionId: question._id,
        selectedAnswer: answer.selectedAnswer,
        isCorrect
      });
    });

    const score = correctAnswers;
    const percentage = (correctAnswers / exam.questions.length) * 100;

    // Update exam progress
    examProgress.status = 'completed';
    examProgress.score = score;
    examProgress.percentage = percentage;
    examProgress.completedAt = new Date();
    examProgress.answers = detailedAnswers;
    examProgress.wrongQuestions = wrongQuestions;

    // Create review exam if there are wrong questions
    let reviewExam = null;
    if (wrongQuestions.length > 0) {
      reviewExam = await createReviewExam(student._id, req.params.id, wrongQuestions, exam.questions);
      examProgress.reviewExamId = reviewExam._id;
    }

    // Update student's total score and percentage
    const completedExams = student.examProgress.filter(progress => progress.status === 'completed');
    const totalScore = completedExams.reduce((sum, progress) => sum + progress.score, 0);
    const totalQuestions = completedExams.reduce((sum, progress) => {
      return sum + (progress.examId.totalQuestions || 0);
    }, 0);

    student.totalScore = totalScore;
    student.overallPercentage = totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0;

    // Unlock next exam if applicable
    await unlockNextExam(student, exam.examGroup, exam.order);

    await student.save();

    // Update exam statistics
    exam.statistics.totalAttempts += 1;
    if (percentage >= 50) { // Assuming 50% is passing
      exam.statistics.passRate += 1;
    }
    exam.statistics.averageScore = 
      (exam.statistics.averageScore * (exam.statistics.totalAttempts - 1) + percentage) / 
      exam.statistics.totalAttempts;
    
    await exam.save();

    // Emit real-time update to teachers
    const io = req.app.get('io');
    if (io) {
      // Get all teachers to notify them of the exam submission
      const teachers = await User.find({ role: 'teacher' });
      teachers.forEach(teacher => {
        io.to(`teacher-${teacher._id}`).emit('exam-submitted', {
          studentId: student._id,
          studentName: student.name,
          examId: exam._id,
          examTitle: exam.title,
          score,
          percentage,
          examGroup: exam.examGroup,
          timestamp: new Date()
        });
      });
    }

    res.json({
      success: true,
      message: 'Exam submitted successfully',
      data: {
        score,
        percentage,
        correctAnswers,
        totalQuestions: exam.questions.length,
        wrongAnswers: exam.questions.length - correctAnswers,
        hasReviewExam: wrongQuestions.length > 0,
        reviewExamId: reviewExam ? reviewExam._id : null
      }
    });
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting exam'
    });
  }
};

// Helper function to create review exam
const createReviewExam = async (studentId, originalExamId, wrongQuestions, allQuestions) => {
  try {
    // Get the original exam to get its details
    const originalExam = await Exam.findById(originalExamId);
    
    // Create questions array with randomized order
    const reviewQuestions = wrongQuestions.map((questionId, index) => {
      const originalQuestion = allQuestions.find(q => q._id.toString() === questionId.toString());
      return {
        questionId: questionId,
        originalQuestionIndex: allQuestions.findIndex(q => q._id.toString() === questionId.toString())
      };
    });

    // Shuffle the questions for randomization
    for (let i = reviewQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [reviewQuestions[i], reviewQuestions[j]] = [reviewQuestions[j], reviewQuestions[i]];
    }

    const reviewExam = new ReviewExam({
      studentId: studentId,
      originalExamId: originalExamId,
      title: `امتحان مراجعة - ${originalExam.title}`,
      description: `امتحان مراجعة للأسئلة الخاطئة من ${originalExam.title}`,
      questions: reviewQuestions,
      timeLimit: Math.max(15, Math.ceil(wrongQuestions.length * 2)) // 2 minutes per question, minimum 15 minutes
    });

    await reviewExam.save();
    return reviewExam;
  } catch (error) {
    console.error('Error creating review exam:', error);
    throw error;
  }
};

// Helper function to unlock next exam
const unlockNextExam = async (student, currentGroup, currentOrder) => {
  try {
    // Find next exam in same group
    const nextExam = await Exam.findOne({
      examGroup: currentGroup,
      order: currentOrder + 1,
      isActive: true
    });

    if (nextExam) {
      const nextProgress = student.examProgress.find(
        progress => progress.examId.toString() === nextExam._id.toString()
      );
      
      if (nextProgress && nextProgress.status === 'locked') {
        nextProgress.status = 'unlocked';
      }
    } else {
      // If no next exam in current group, unlock first exam of next group
      const nextGroupExam = await Exam.findOne({
        examGroup: currentGroup + 1,
        order: 1,
        isActive: true
      });

      if (nextGroupExam) {
        const nextGroupProgress = student.examProgress.find(
          progress => progress.examId.toString() === nextGroupExam._id.toString()
        );
        
        if (nextGroupProgress && nextGroupProgress.status === 'locked') {
          nextGroupProgress.status = 'unlocked';
        }
      }
    }
  } catch (error) {
    console.error('Error unlocking next exam:', error);
  }
};

// Helper function to update all students' exam progress when new exam is created
const updateStudentsExamProgress = async () => {
  try {
    const students = await User.find({ role: 'student' });
    const exams = await Exam.find({ isActive: true }).sort({ examGroup: 1, order: 1 });

    for (const student of students) {
      const existingExamIds = student.examProgress.map(progress => progress.examId.toString());
      
      for (const exam of exams) {
        if (!existingExamIds.includes(exam._id.toString())) {
          const isFirstExam = exam.examGroup === 1 && exam.order === 1;
          student.examProgress.push({
            examGroup: exam.examGroup,
            examId: exam._id,
            status: isFirstExam ? 'unlocked' : 'locked'
          });
        }
      }
      
      await student.save();
    }
  } catch (error) {
    console.error('Error updating students exam progress:', error);
  }
};

// @desc    Get review exam
// @route   GET /api/exams/review/:reviewExamId
// @access  Private (Student only)
const getReviewExam = async (req, res) => {
  try {
    const reviewExam = await ReviewExam.findById(req.params.reviewExamId)
      .populate('originalExamId', 'title examGroup order');

    if (!reviewExam) {
      return res.status(404).json({
        success: false,
        message: 'Review exam not found'
      });
    }

    // Check if the review exam belongs to the current student
    if (reviewExam.studentId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This review exam does not belong to you.'
      });
    }

    // Get the original exam to access the questions
    const originalExam = await Exam.findById(reviewExam.originalExamId._id);
    
    // Map the review exam questions with the actual question data
    const questionsWithData = reviewExam.questions.map(reviewQuestion => {
      const originalQuestion = originalExam.questions[reviewQuestion.originalQuestionIndex];
      return {
        _id: reviewQuestion.questionId,
        questionImage: originalQuestion.questionImage,
        options: originalQuestion.options,
        correctAnswer: originalQuestion.correctAnswer,
        explanation: originalQuestion.explanation
      };
    });

    // Create a response object with populated questions
    const reviewExamWithQuestions = {
      ...reviewExam.toObject(),
      questions: questionsWithData
    };

    res.json({
      success: true,
      data: reviewExamWithQuestions
    });
  } catch (error) {
    console.error('Get review exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching review exam'
    });
  }
};

// @desc    Submit review exam answers
// @route   POST /api/exams/review/:reviewExamId/submit
// @access  Private (Student only)
const submitReviewExam = async (req, res) => {
  try {
    const { answers } = req.body;

    const reviewExam = await ReviewExam.findById(req.params.reviewExamId)
      .populate('originalExamId', 'title examGroup order');

    if (!reviewExam) {
      return res.status(404).json({
        success: false,
        message: 'Review exam not found'
      });
    }

    // Check if the review exam belongs to the current student
    if (reviewExam.studentId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This review exam does not belong to you.'
      });
    }

    // Get the original exam to access the questions
    const originalExam = await Exam.findById(reviewExam.originalExamId._id);

    // Calculate score
    let correctAnswers = 0;
    const detailedAnswers = [];

    answers.forEach((answer, index) => {
      const reviewQuestion = reviewExam.questions[index];
      const originalQuestion = originalExam.questions[reviewQuestion.originalQuestionIndex];
      const isCorrect = answer.selectedAnswer === originalQuestion.correctAnswer;
      
      if (isCorrect) {
        correctAnswers++;
      }

      detailedAnswers.push({
        questionId: reviewQuestion.questionId,
        selectedAnswer: answer.selectedAnswer,
        isCorrect
      });
    });

    const score = correctAnswers;
    const percentage = (correctAnswers / reviewExam.questions.length) * 100;

    // Create new attempt
    const newAttempt = {
      attemptNumber: reviewExam.currentAttemptNumber,
      answers: detailedAnswers,
      score: score,
      percentage: percentage,
      completedAt: new Date()
    };

    reviewExam.attempts.push(newAttempt);
    reviewExam.totalAttempts += 1;

    // Update best score if this is better
    if (percentage > reviewExam.bestPercentage) {
      reviewExam.bestScore = score;
      reviewExam.bestPercentage = percentage;
    }

    await reviewExam.save();

    res.json({
      success: true,
      message: 'Review exam submitted successfully',
      data: {
        score,
        percentage,
        correctAnswers,
        totalQuestions: reviewExam.questions.length,
        wrongAnswers: reviewExam.questions.length - correctAnswers,
        attemptNumber: newAttempt.attemptNumber,
        isBestScore: percentage === reviewExam.bestPercentage
      }
    });
  } catch (error) {
    console.error('Submit review exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting review exam'
    });
  }
};

// @desc    Get student's review exams
// @route   GET /api/exams/review
// @access  Private (Student only)
const getStudentReviewExams = async (req, res) => {
  try {
    const reviewExams = await ReviewExam.find({ 
      studentId: req.user.id,
      isActive: true 
    })
      .populate('originalExamId', 'title examGroup order')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reviewExams.length,
      data: reviewExams
    });
  } catch (error) {
    console.error('Get student review exams error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching review exams'
    });
  }
};

// @desc    Repeat exam for student (Teacher only)
// @route   POST /api/exams/:id/repeat
// @access  Private (Teacher only)
const repeatExam = async (req, res) => {
  try {
    const { studentId } = req.body;
    const examId = req.params.id;

    // Find the student
    const User = require('../models/User');
    const student = await User.findById(studentId);
    
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find the exam
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Find the student's progress for this exam
    const progressIndex = student.examProgress.findIndex(
      progress => progress.examId.toString() === examId
    );

    if (progressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Student has no progress for this exam'
      });
    }

    // Reset the exam progress
    student.examProgress[progressIndex] = {
      examId: examId,
      status: 'not_started',
      correctAnswers: 0,
      totalQuestions: exam.questions.length,
      wrongQuestions: [],
      reviewExamId: null
    };

    // Remove any existing review exam for this student and exam
    const ReviewExam = require('../models/ReviewExam');
    await ReviewExam.deleteOne({
      studentId: studentId,
      originalExamId: examId
    });

    await student.save();

    res.json({
      success: true,
      message: 'Exam reset successfully for student',
      data: {
        examId: examId,
        examTitle: exam.title,
        studentId: studentId,
        studentName: student.name
      }
    });
  } catch (error) {
    console.error('Repeat exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while repeating exam'
    });
  }
};

// @desc    Get student mistakes for a specific exam
// @route   GET /api/exams/:examId/student-mistakes/:studentId
// @access  Private (Teacher only)
const getStudentMistakes = async (req, res) => {
  try {
    const { examId, studentId } = req.params;

    // Get the exam with questions
    const exam = await Exam.findById(examId).populate('questions');
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Get student's exam progress
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const examProgress = student.examProgress.find(progress => 
      progress.examId.toString() === examId
    );

    if (!examProgress || (examProgress.status !== 'completed' && examProgress.status !== 'in_progress')) {
      return res.json({
        success: true,
        data: [],
        message: 'Student has not attempted this exam yet'
      });
    }

    // Find mistakes (wrong answers)
    const mistakes = [];
    
    examProgress.answers.forEach((answer, index) => {
      const question = exam.questions.find(q => q._id.toString() === answer.questionId.toString());
      if (question && answer.selectedAnswer !== question.correctAnswer) {
        mistakes.push({
          question: question,
          studentAnswer: answer.selectedAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect: answer.isCorrect
        });
      }
    });

    res.json({
      success: true,
      data: mistakes,
      count: mistakes.length
    });

  } catch (error) {
    console.error('Get student mistakes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student mistakes'
    });
  }
};

// @desc    Get student submission for a specific exam
// @route   GET /api/exams/:examId/student-submission/:studentId
// @access  Private (Teacher only)
const getStudentSubmission = async (req, res) => {
  try {
    const { examId, studentId } = req.params;

    // Get the exam with questions
    const exam = await Exam.findById(examId).populate('questions');
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Get student's exam progress
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const examProgress = student.examProgress.find(progress => 
      progress.examId.toString() === examId
    );

    if (!examProgress || (examProgress.status !== 'completed' && examProgress.status !== 'in_progress')) {
      return res.status(404).json({
        success: false,
        message: 'Student has not attempted this exam yet'
      });
    }

    // Prepare submission data
    const submission = {
      exam: {
        _id: exam._id,
        title: exam.title,
        examGroup: exam.examGroup,
        order: exam.order,
        questions: exam.questions
      },
      status: examProgress.status,
      score: examProgress.score || 0,
      totalQuestions: examProgress.totalQuestions || exam.questions.length,
      percentage: examProgress.percentage || 0,
      answers: examProgress.answers || [],
      startTime: examProgress.startTime,
      endTime: examProgress.endTime
    };

    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error('Get student submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student submission'
    });
  }
};

module.exports = {
  getExams,
  getExam,
  createExam,
  updateExam,
  deleteExam,
  getExamsByGroup,
  submitExam,
  getReviewExam,
  submitReviewExam,
  getStudentReviewExams,
  repeatExam,
  getStudentMistakes,
  getStudentSubmission
};
