const Exam = require('../models/Exam');
const ExamGroup = require('../models/ExamGroup');
const User = require('../models/User');
const ReviewExam = require('../models/ReviewExam');
const { validationResult } = require('express-validator');
const path = require('path');
const { invalidateCache } = require('../middleware/cache');
const {
  recalculateExamScores,
  scoringRelevantChanges
} = require('../utils/recalculateExamScores');

// @desc    Get all exams
// @route   GET /api/exams
// @access  Private
const getExams = async (req, res) => {
  try {
    // Return ALL active exams (no pagination) - teachers/students need to see full list
    const exams = await Exam.find({ isActive: true })
      .select('title description examGroup order timeLimit isFreeExam totalQuestions createdAt updatedAt')
      .populate('createdBy', 'name email')
      .sort({ examGroup: 1, order: 1 })
      .lean();

    res.json({
      success: true,
      count: exams.length,
      data: exams
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get exams error:', error);
    }
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

    // Questions already contain Cloudinary URLs, no need to map files
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

    // Invalidate cache for exams list
    invalidateCache('/api/exams');

    // Update exam group count asynchronously (don't block response)
    updateExamGroupCount(examGroup).catch(error => {
      console.error('Error updating exam group count:', error);
    });

    // Update all students' exam progress asynchronously (don't block response)
    updateStudentsExamProgress().catch(() => {
      // Silently fail - non-critical operation
    });

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: exam
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Create exam error:', error);
    }
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Error parsing questions:', parseError);
      }
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

    const oldQuestions = exam.questions.map((q) => ({
      _id: q._id,
      correctAnswer: q.correctAnswer
    }));
    const shouldRecalculateScores = scoringRelevantChanges(oldQuestions, questionsWithImages);

    // Update exam with timeout
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
      { 
        new: true, 
        runValidators: true,
        maxTimeMS: 45000 // 45 second timeout for database operation
      }
    );

    // Invalidate cache for exams list
    invalidateCache('/api/exams');

    if (shouldRecalculateScores) {
      recalculateExamScores(updatedExam._id).catch((error) => {
        console.error('Error recalculating student scores after exam update:', error);
      });
    }
    
    res.json({
      success: true,
      message: shouldRecalculateScores
        ? 'Exam updated successfully. Student scores are being recalculated.'
        : 'Exam updated successfully',
      data: updatedExam,
      scoresRecalculating: shouldRecalculateScores
    });
  } catch (error) {
    console.error('=== UPDATE EXAM ERROR ===');
    console.error('Error object:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating exam',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    console.log(`🗑️ Deleting exam: ${exam.title} (ID: ${exam._id})`);
    console.log(`📊 Exam has ${exam.questions?.length || 0} questions`);

    // Delete images from Cloudinary before soft deleting the exam (optimized - parallel deletions)
    if (exam.questions && exam.questions.length > 0) {
      const cloudinary = require('../config/cloudinary');
      console.log('🖼️ Starting Cloudinary image cleanup...');

      // Collect all deletion promises for parallel execution
      const deletionPromises = exam.questions
        .filter(question => question.questionImage && question.questionImage.includes('cloudinary.com'))
        .map(async (question) => {
          try {
            // Extract public_id from Cloudinary URL
            const urlParts = question.questionImage.split('/');
            const publicId = urlParts[urlParts.length - 1].split('.')[0];
            const folderPath = 'qudrat/questions';
            const fullPublicId = `${folderPath}/${publicId}`;

            console.log(`🗑️ Deleting image: ${fullPublicId}`);
            await cloudinary.uploader.destroy(fullPublicId);
            console.log(`✅ Successfully deleted: ${fullPublicId}`);
            return { success: true, publicId: fullPublicId };
          } catch (imageError) {
            console.error(`❌ Failed to delete image: ${question.questionImage}`, imageError.message);
            return { success: false, error: imageError.message };
          }
        });

      // Execute all deletions in parallel
      const results = await Promise.all(deletionPromises);
      const deletedImages = results.filter(r => r.success).length;
      const failedDeletions = results.filter(r => !r.success).length;

      console.log(`📊 Cloudinary cleanup completed: ${deletedImages} deleted, ${failedDeletions} failed`);
    }

    // Soft delete by setting isActive to false
    exam.isActive = false;
    await exam.save();

    // Clean up orphaned progress data from all students
    await User.updateMany(
      { 'examProgress.examId': exam._id },
      { $pull: { examProgress: { examId: exam._id } } }
    );

    console.log(`✅ Exam ${exam.title} deleted successfully`);

    // Update exam group count asynchronously (don't block response)
    updateExamGroupCount(exam.examGroup).catch(error => {
      console.error('Error updating exam group count:', error);
    });

    // Invalidate cache for exams list
    invalidateCache('/api/exams');
    console.log('🗑️ Cache invalidated for exams list');

    res.json({
      success: true,
      message: 'Exam deleted successfully, images cleaned up from Cloudinary, and progress data cleaned up'
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
    const { answers, timeSpent, submittedAt } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Answers must be an array'
      });
    }

    // Only select needed fields for better performance (no .lean() so we can update statistics)
    const exam = await Exam.findById(req.params.id)
      .select('questions.correctAnswer questions._id title examGroup order totalQuestions statistics');
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

    // Optimized score calculation - batch processing
    let correctAnswers = 0;
    const detailedAnswers = [];
    const wrongQuestions = [];

    // Process all answers in a single loop for better performance
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      const question = exam.questions[i];
      
      if (!question) {
        continue; // Skip if question doesn't exist
      }
      
      const isCorrect = answer.selectedAnswer === question.correctAnswer;
      
      if (isCorrect) {
        correctAnswers++;
      } else {
        wrongQuestions.push(question._id);
      }

      detailedAnswers.push({
        questionId: question._id,
        selectedAnswer: answer.selectedAnswer,
        isCorrect
      });
    }

    const score = correctAnswers;
    const percentage = (correctAnswers / exam.questions.length) * 100;

    // Update exam progress
    examProgress.status = 'completed';
    examProgress.score = score;
    examProgress.totalQuestions = exam.questions.length;
    examProgress.percentage = percentage;
    examProgress.correctAnswers = correctAnswers;
    examProgress.wrongAnswers = exam.questions.length - correctAnswers;
    examProgress.completedAt = new Date();
    examProgress.submittedAt = submittedAt ? new Date(submittedAt) : new Date();
    examProgress.timeSpent = timeSpent || 0;
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
      return sum + (progress.totalQuestions || 0);
    }, 0);

    student.totalScore = totalScore;
    student.overallPercentage = totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0;

    // Unlock next exam if applicable
    await unlockNextExam(student, exam.examGroup, exam.order);

    await student.save();

    // Update exam statistics (exam is a Mongoose doc, not .lean())
    exam.statistics.totalAttempts += 1;
    if (percentage >= 50) { // Assuming 50% is passing
      exam.statistics.passRate += 1;
    }
    exam.statistics.averageScore =
      (exam.statistics.averageScore * (exam.statistics.totalAttempts - 1) + percentage) /
      exam.statistics.totalAttempts;
    await exam.save();

    // Emit real-time update to teachers (optimized - only fetch IDs)
    const io = req.app.get('io');
    if (io) {
      // Get all teacher IDs to notify them of the exam submission
      const teachers = await User.find({ role: 'teacher' }).select('_id').lean();
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
        timeSpent: timeSpent || 0,
        submittedAt: examProgress.submittedAt,
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
      timeLimit: wrongQuestions.length // 1 minute per question
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
    console.log('Starting to update students exam progress...');
    const students = await User.find({ role: 'student' }).select('_id examProgress');
    const exams = await Exam.find({ isActive: true }).select('_id examGroup order').sort({ examGroup: 1, order: 1 });

    console.log(`Found ${students.length} students and ${exams.length} exams`);

    // Use bulk operations for better performance
    const bulkOps = [];
    
    for (const student of students) {
      const existingExamIds = student.examProgress.map(progress => progress.examId.toString());
      const newProgressEntries = [];
      
      for (const exam of exams) {
        if (!existingExamIds.includes(exam._id.toString())) {
          const isFirstExam = exam.examGroup === 1 && exam.order === 1;
          newProgressEntries.push({
            examGroup: exam.examGroup,
            examId: exam._id,
            status: isFirstExam ? 'unlocked' : 'locked'
          });
        }
      }
      
      if (newProgressEntries.length > 0) {
        bulkOps.push({
          updateOne: {
            filter: { _id: student._id },
            update: { $push: { examProgress: { $each: newProgressEntries } } }
          }
        });
      }
    }
    
    if (bulkOps.length > 0) {
      await User.bulkWrite(bulkOps);
      console.log(`Updated exam progress for ${bulkOps.length} students`);
    } else {
      console.log('No students needed exam progress updates');
    }
  } catch (error) {
    console.error('Error updating students exam progress:', error);
  }
};

// Helper function to update exam group count
const updateExamGroupCount = async (groupNumber) => {
  try {
    console.log('🔄 Updating exam group count for group:', groupNumber);
    
    // Check if this is a custom group (groupNumber >= 9)
    if (groupNumber >= 9) {
      const examCount = await Exam.countDocuments({ 
        examGroup: groupNumber, 
        isActive: true 
      });
      
      console.log(`📊 Found ${examCount} active exams in group ${groupNumber}`);
      
      const result = await ExamGroup.findOneAndUpdate(
        { groupNumber: groupNumber },
        { examCount: examCount },
        { upsert: false } // Don't create if doesn't exist
      );
      
      if (result) {
        console.log(`✅ Updated exam count for group ${groupNumber}: ${examCount}`);
      } else {
        console.log(`⚠️ Group ${groupNumber} not found in ExamGroup collection`);
      }
    } else {
      console.log(`ℹ️ Group ${groupNumber} is not a custom group, skipping count update`);
    }
  } catch (error) {
    console.error('❌ Error updating exam group count:', error);
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
    console.log('📝 Review exam submission started');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    
    const { answers } = req.body;

    // Validate answers array
    if (!answers || !Array.isArray(answers)) {
      console.log('❌ Validation failed: answers is not an array');
      return res.status(400).json({
        success: false,
        message: 'يجب إرسال الإجابات كمصفوفة'
      });
    }

    const reviewExam = await ReviewExam.findById(req.params.reviewExamId)
      .populate('originalExamId', 'title examGroup order');

    if (!reviewExam) {
      console.log('❌ Review exam not found:', req.params.reviewExamId);
      return res.status(404).json({
        success: false,
        message: 'Review exam not found'
      });
    }

    console.log('✅ Review exam found:', reviewExam._id);
    console.log('📊 Review exam questions:', reviewExam.questions.length);

    // Check if the review exam belongs to the current student
    if (reviewExam.studentId.toString() !== req.user.id) {
      console.log('❌ Access denied: student mismatch');
      return res.status(403).json({
        success: false,
        message: 'Access denied. This review exam does not belong to you.'
      });
    }

    // Validate answers length
    if (answers.length !== reviewExam.questions.length) {
      console.log(`❌ Validation failed: answers length (${answers.length}) doesn't match questions length (${reviewExam.questions.length})`);
      return res.status(400).json({
        success: false,
        message: `عدد الإجابات (${answers.length}) لا يتطابق مع عدد الأسئلة (${reviewExam.questions.length})`
      });
    }

    // Get the original exam to access the questions
    const originalExam = await Exam.findById(reviewExam.originalExamId._id);
    
    if (!originalExam) {
      console.log('❌ Original exam not found:', reviewExam.originalExamId._id);
      return res.status(404).json({
        success: false,
        message: 'الامتحان الأصلي غير موجود'
      });
    }

    console.log('✅ Original exam found:', originalExam._id);
    console.log('📊 Original exam questions:', originalExam.questions.length);

    // Calculate score
    let correctAnswers = 0;
    const detailedAnswers = [];

    answers.forEach((answer, index) => {
      const reviewQuestion = reviewExam.questions[index];
      const originalQuestion = originalExam.questions[reviewQuestion.originalQuestionIndex];
      
      // Check if question still exists (exam might have been edited)
      if (!originalQuestion) {
        console.log(`⚠️ Question ${index + 1}: Original question not found at index ${reviewQuestion.originalQuestionIndex}`);
        detailedAnswers.push({
          questionId: reviewQuestion.questionId,
          selectedAnswer: answer?.selectedAnswer || null,
          isCorrect: false
        });
        return;
      }

      // Handle null/undefined answers
      const selectedAnswer = answer?.selectedAnswer || null;
      const isCorrect = selectedAnswer && selectedAnswer === originalQuestion.correctAnswer;
      
      console.log(`Question ${index + 1}: selected=${selectedAnswer}, correct=${originalQuestion.correctAnswer}, isCorrect=${isCorrect}`);
      
      if (isCorrect) {
        correctAnswers++;
      }

      detailedAnswers.push({
        questionId: reviewQuestion.questionId,
        selectedAnswer: selectedAnswer,
        isCorrect
      });
    });

    const score = correctAnswers;
    const percentage = (correctAnswers / reviewExam.questions.length) * 100;

    console.log(`📊 Score calculated: ${score}/${reviewExam.questions.length} (${percentage.toFixed(2)}%)`);

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
    const isBestScore = percentage > reviewExam.bestPercentage;
    if (isBestScore) {
      reviewExam.bestScore = score;
      reviewExam.bestPercentage = percentage;
      console.log('🏆 New best score achieved!');
    }

    await reviewExam.save();
    console.log('✅ Review exam saved successfully');

    const responseData = {
      score,
      percentage,
      correctAnswers,
      totalQuestions: reviewExam.questions.length,
      wrongAnswers: reviewExam.questions.length - correctAnswers,
      attemptNumber: newAttempt.attemptNumber,
      isBestScore
    };

    console.log('📤 Sending response:', responseData);

    res.json({
      success: true,
      message: 'Review exam submitted successfully',
      data: responseData
    });
  } catch (error) {
    console.error('❌ Submit review exam error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting review exam',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    // Get the exam with questions (questions are embedded, no need to populate)
    const exam = await Exam.findById(examId).lean();
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

    // Find mistakes (wrong answers and unanswered questions)
    const mistakes = [];
    
    console.log('=== VIEWING MISTAKES DEBUG ===');
    console.log('Student ID:', studentId);
    console.log('Exam ID:', examId);
    console.log('Exam Progress Status:', examProgress.status);
    console.log('Total Answers:', examProgress.answers.length);
    console.log('Total Questions:', exam.questions.length);
    
    examProgress.answers.forEach((answer, index) => {
      // Try to find question by ID first
      let question = exam.questions.find(q => q._id.toString() === answer.questionId.toString());
      
      // If not found by ID (exam was edited), try to match by index position
      if (!question && exam.questions[index]) {
        console.log(`Question ${index + 1}: Matching by position (exam was edited)`);
        question = exam.questions[index];
      }
      
      if (question) {
        const isCorrect = answer.selectedAnswer === question.correctAnswer;
        
        console.log(`Question ${index + 1}:`, {
          questionId: question._id.toString(),
          studentAnswer: answer.selectedAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect
        });
        
        // Add to mistakes if not correct (wrong answer or unanswered)
        if (!isCorrect) {
          mistakes.push({
            question: question,
            studentAnswer: answer.selectedAnswer,
            correctAnswer: question.correctAnswer,
            isCorrect: isCorrect
          });
        }
      } else {
        console.log(`Question ${index + 1}: NOT FOUND for questionId:`, answer.questionId.toString());
      }
    });
    
    console.log('Total Mistakes Found:', mistakes.length);
    console.log('=== END DEBUG ===');

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

    // Get the exam with questions (questions are embedded, no need to populate)
    const exam = await Exam.findById(examId).lean();
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

// @desc    Get current student's submission for a specific exam
// @route   GET /api/exams/:examId/student-submission
// @access  Private (Student only)
const getMySubmission = async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'الطالب غير موجود'
      });
    }

    const examProgress = student.examProgress.find(
      progress => progress.examId.toString() === req.params.examId
    );

    if (!examProgress) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على نتائج هذا الامتحان'
      });
    }

    if (examProgress.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'لم يتم إكمال هذا الامتحان بعد'
      });
    }

    // Populate bestReviewScore from ReviewExam if available
    let bestReviewScore = 0;
    if (examProgress.reviewExamId) {
      try {
        const ReviewExam = require('../models/ReviewExam');
        const reviewExam = await ReviewExam.findById(examProgress.reviewExamId);
        if (reviewExam) {
          bestReviewScore = reviewExam.bestPercentage || 0;
        }
      } catch (error) {
        console.error('Error fetching review exam for bestReviewScore:', error);
        bestReviewScore = 0;
      }
    }

    res.json({
      success: true,
      data: {
        examId: examProgress.examId,
        score: examProgress.score,
        percentage: examProgress.percentage,
        correctAnswers: examProgress.correctAnswers,
        wrongAnswers: examProgress.wrongAnswers,
        totalQuestions: examProgress.totalQuestions,
        timeSpent: examProgress.timeSpent,
        completedAt: examProgress.completedAt,
        submittedAt: examProgress.submittedAt,
        answers: examProgress.answers,
        bestReviewScore: bestReviewScore
      }
    });
  } catch (error) {
    console.error('Get my submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching submission'
    });
  }
};

// @desc    Get single exam by ID (public for free exams)
// @route   GET /api/exams/public/:id
// @access  Public
const getPublicExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .select('-statistics -createdBy')
      .populate('createdBy', 'name');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Only allow access to free exams
    if (!exam.isFreeExam) {
      return res.status(403).json({
        success: false,
        message: 'This exam is not available for public access'
      });
    }

    res.json({
      success: true,
      data: exam
    });
  } catch (error) {
    console.error('Get public exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching exam'
    });
  }
};

// @desc    Get free exams for home page
// @route   GET /api/exams/free
// @access  Public
const getFreeExams = async (req, res) => {
  try {
    const freeExams = await Exam.find({ 
      isFreeExam: true, 
      isActive: true 
    })
      .sort({ freeExamOrder: 1 })
      .select('title description timeLimit totalQuestions freeExamOrder');

    res.json({
      success: true,
      count: freeExams.length,
      data: freeExams
    });
  } catch (error) {
    console.error('Get free exams error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching free exams'
    });
  }
};

// @desc    Get free exams for teacher management
// @route   GET /api/exams/free/manage
// @access  Private (Teacher only)
const getFreeExamsForManagement = async (req, res) => {
  try {
    const freeExams = await Exam.find({ 
      isFreeExam: true 
    })
      .sort({ freeExamOrder: 1 })
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      count: freeExams.length,
      data: freeExams
    });
  } catch (error) {
    console.error('Get free exams for management error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching free exams for management'
    });
  }
};

// @desc    Set exam as free exam
// @route   PUT /api/exams/:id/set-free
// @access  Private (Teacher only)
const setExamAsFree = async (req, res) => {
  try {
    const { freeExamOrder } = req.body;
    
    if (!freeExamOrder || freeExamOrder < 1 || freeExamOrder > 3) {
      return res.status(400).json({
        success: false,
        message: 'Free exam order must be between 1 and 3'
      });
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check if another exam already has this free exam order
    const existingFreeExam = await Exam.findOne({ 
      freeExamOrder: freeExamOrder,
      isFreeExam: true,
      _id: { $ne: req.params.id }
    });

    if (existingFreeExam) {
      return res.status(400).json({
        success: false,
        message: `Another exam is already set as free exam #${freeExamOrder}`
      });
    }

    exam.isFreeExam = true;
    exam.freeExamOrder = freeExamOrder;
    await exam.save();

    res.json({
      success: true,
      message: 'Exam set as free exam successfully',
      data: exam
    });
  } catch (error) {
    console.error('Set exam as free error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while setting exam as free'
    });
  }
};

// @desc    Remove exam from free exams
// @route   PUT /api/exams/:id/remove-free
// @access  Private (Teacher only)
const removeExamFromFree = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    exam.isFreeExam = false;
    exam.freeExamOrder = undefined;
    await exam.save();

    res.json({
      success: true,
      message: 'Exam removed from free exams successfully',
      data: exam
    });
  } catch (error) {
    console.error('Remove exam from free error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing exam from free exams'
    });
  }
};

// Helper: renumber exam orders in a group sequentially starting at 1
const compactGroupOrders = async (groupNumber) => {
  const exams = await Exam.find({ examGroup: groupNumber, isActive: true }).sort({ order: 1 });
  for (let i = 0; i < exams.length; i += 1) {
    const nextOrder = i + 1;
    if (exams[i].order !== nextOrder) {
      exams[i].order = nextOrder;
      await exams[i].save();
    }
  }
};

// @desc    Reorder exams within a group
// @route   PUT /api/exams/group/:groupNumber/reorder
// @access  Private (Teacher only)
const reorderExamsInGroup = async (req, res) => {
  try {
    const groupNumber = parseInt(req.params.groupNumber, 10);
    const { orderedExamIds } = req.body;

    if (Number.isNaN(groupNumber) || groupNumber < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid group number'
      });
    }

    if (!Array.isArray(orderedExamIds) || orderedExamIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'orderedExamIds must be a non-empty array'
      });
    }

    const exams = await Exam.find({
      _id: { $in: orderedExamIds },
      examGroup: groupNumber,
      isActive: true
    });

    if (exams.length !== orderedExamIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more exams are invalid or belong to a different group'
      });
    }

    await Promise.all(
      orderedExamIds.map((id, index) =>
        Exam.findByIdAndUpdate(id, { order: index + 1 })
      )
    );

    invalidateCache('/api/exams');

    res.json({
      success: true,
      message: 'Exams reordered successfully'
    });
  } catch (error) {
    console.error('Reorder exams in group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while reordering exams'
    });
  }
};

// @desc    Transfer exam to another group
// @route   PUT /api/exams/:id/transfer
// @access  Private (Teacher only)
const transferExam = async (req, res) => {
  try {
    const { targetGroup, order } = req.body;
    const targetGroupNum = parseInt(targetGroup, 10);

    if (Number.isNaN(targetGroupNum) || targetGroupNum < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target group'
      });
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam || !exam.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    const oldGroup = exam.examGroup;
    if (oldGroup === targetGroupNum) {
      return res.status(400).json({
        success: false,
        message: 'Exam is already in this group'
      });
    }

    let newOrder;
    if (order !== undefined && order !== null) {
      newOrder = parseInt(order, 10);
      if (Number.isNaN(newOrder) || newOrder < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid order value'
        });
      }
      const conflict = await Exam.findOne({
        _id: { $ne: exam._id },
        examGroup: targetGroupNum,
        order: newOrder,
        isActive: true
      });
      if (conflict) {
        return res.status(400).json({
          success: false,
          message: 'An exam with this order already exists in the target group'
        });
      }
    } else {
      const lastInTarget = await Exam.findOne({
        examGroup: targetGroupNum,
        isActive: true
      }).sort({ order: -1 });
      newOrder = lastInTarget ? lastInTarget.order + 1 : 1;
    }

    exam.examGroup = targetGroupNum;
    exam.order = newOrder;
    await exam.save();

    await compactGroupOrders(oldGroup);

    updateExamGroupCount(oldGroup).catch(() => {});
    updateExamGroupCount(targetGroupNum).catch(() => {});
    invalidateCache('/api/exams');

    res.json({
      success: true,
      message: 'Exam transferred successfully',
      data: exam
    });
  } catch (error) {
    console.error('Transfer exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while transferring exam'
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
  reorderExamsInGroup,
  transferExam,
  submitExam,
  getReviewExam,
  submitReviewExam,
  getStudentReviewExams,
  repeatExam,
  getStudentMistakes,
  getStudentSubmission,
  getMySubmission,
  getPublicExam,
  getFreeExams,
  getFreeExamsForManagement,
  setExamAsFree,
  removeExamFromFree
};
