const User = require('../models/User');
const Exam = require('../models/Exam');
const { validationResult } = require('express-validator');

// @desc    Get all students
// @route   GET /api/users/students
// @access  Private (Teacher only)
const getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching students'
    });
  }
};

// @desc    Get single student
// @route   GET /api/users/students/:id
// @access  Private (Teacher only)
const getStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id)
      .select('-password')
      .populate('examProgress.examId', 'title examGroup order isActive');

    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Filter out progress for inactive exams
    if (student.examProgress) {
      student.examProgress = student.examProgress.filter(progress => 
        progress.examId && progress.examId.isActive !== false
      );
    }

    // Add best review score for each exam progress
    const ReviewExam = require('../models/ReviewExam');
    for (let progress of student.examProgress) {
      if (progress.reviewExamId) {
        try {
          const reviewExam = await ReviewExam.findById(progress.reviewExamId);
          if (reviewExam) {
            progress.bestReviewScore = reviewExam.bestPercentage || 0;
          }
        } catch (error) {
          console.error('Error fetching review exam:', error);
          progress.bestReviewScore = 0;
        }
      } else {
        progress.bestReviewScore = 0;
      }
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student'
    });
  }
};

// @desc    Create new student
// @route   POST /api/users/students
// @access  Private (Teacher only)
const createStudent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { name, email, password, phoneNumber } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phoneNumber }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or phone number'
      });
    }

    // Create student
    const student = await User.create({
      name,
      email,
      password,
      phoneNumber,
      role: 'student'
    });

    // Initialize exam progress for all existing exams
    const exams = await Exam.find({ isActive: true }).sort({ examGroup: 1, order: 1 });
    const examProgress = exams.map((exam, index) => ({
      examGroup: exam.examGroup,
      examId: exam._id,
      status: index === 0 ? 'unlocked' : 'locked' // First exam is unlocked
    }));

    student.examProgress = examProgress;
    await student.save();

    // Emit real-time update to teachers
    const io = req.app.get('io');
    if (io) {
      // Get all teachers to notify them of the new student
      const teachers = await User.find({ role: 'teacher' });
      teachers.forEach(teacher => {
        io.to(`teacher-${teacher._id}`).emit('student-added', {
          studentId: student._id,
          studentName: student.name,
          studentEmail: student.email,
          studentPhoneNumber: student.phoneNumber,
          timestamp: new Date()
        });
      });
    }

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: {
        id: student._id,
        name: student.name,
        email: student.email,
        phoneNumber: student.phoneNumber,
        role: student.role
      }
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating student'
    });
  }
};

// @desc    Update student
// @route   PUT /api/users/students/:id
// @access  Private (Teacher only)
const updateStudent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { name, email, phoneNumber, isActive } = req.body;

    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check for duplicate email or phoneNumber
    if (email !== student.email || phoneNumber !== student.phoneNumber) {
      const existingUser = await User.findOne({
        _id: { $ne: req.params.id },
        $or: [{ email }, { phoneNumber }]
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email or phone number'
        });
      }
    }

    // Update student
    const updatedStudent = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phoneNumber, isActive },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating student'
    });
  }
};

// @desc    Delete student
// @route   DELETE /api/users/students/:id
// @access  Private (Teacher only)
const deleteStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    // Emit real-time update to teachers
    const io = req.app.get('io');
    if (io) {
      // Get all teachers to notify them of the deleted student
      const teachers = await User.find({ role: 'teacher' });
      teachers.forEach(teacher => {
        io.to(`teacher-${teacher._id}`).emit('student-deleted', {
          studentId: student._id,
          studentName: student.name,
          studentEmail: student.email,
          studentPhoneNumber: student.phoneNumber,
          timestamp: new Date()
        });
      });
    }

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting student'
    });
  }
};

// @desc    Unlock exam for student
// @route   PUT /api/users/students/:id/unlock-exam
// @access  Private (Teacher only)
const unlockExamForStudent = async (req, res) => {
  try {
    const { examId } = req.body;

    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Find and update exam progress
    const examProgress = student.examProgress.find(
      progress => progress.examId.toString() === examId
    );

    if (examProgress) {
      examProgress.status = 'unlocked';
      await student.save();

      res.json({
        success: true,
        message: 'Exam unlocked successfully for student'
      });
    } else {
      // Create new progress entry if it doesn't exist
      student.examProgress.push({
        examId: examId,
        status: 'unlocked',
        percentage: 0,
        score: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        timeSpent: 0,
        submittedAt: null,
        answers: []
      });
      await student.save();

      res.json({
        success: true,
        message: 'Exam unlocked successfully for student'
      });
    }
  } catch (error) {
    console.error('Unlock exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while unlocking exam'
    });
  }
};

// @desc    Lock exam for student
// @route   PUT /api/users/students/:id/lock-exam
// @access  Private (Teacher only)
const lockExamForStudent = async (req, res) => {
  try {
    const { examId } = req.body;

    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Find and update exam progress
    const examProgress = student.examProgress.find(
      progress => progress.examId.toString() === examId
    );

    if (examProgress) {
      examProgress.status = 'locked';
      await student.save();

      res.json({
        success: true,
        message: 'Exam locked successfully for student'
      });
    } else {
      // Create new progress entry if it doesn't exist
      student.examProgress.push({
        examId: examId,
        status: 'locked',
        percentage: 0,
        score: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        timeSpent: 0,
        submittedAt: null,
        answers: []
      });
      await student.save();

      res.json({
        success: true,
        message: 'Exam locked successfully for student'
      });
    }
  } catch (error) {
    console.error('Lock exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while locking exam'
    });
  }
};

// @desc    Lock/Unlock multiple exams for student
// @route   PUT /api/users/students/:id/toggle-exams
// @access  Private (Teacher only)
const toggleMultipleExams = async (req, res) => {
  try {
    console.log('=== TOGGLE MULTIPLE EXAMS REQUEST ===');
    console.log('Request body:', req.body);
    console.log('Request params:', req.params);
    console.log('Request headers:', req.headers);
    
    const { examIds, action } = req.body; // action: 'lock' or 'unlock'
    
    console.log('Toggle multiple exams request:', { examIds, action, studentId: req.params.id });

    if (!Array.isArray(examIds) || examIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide exam IDs array'
      });
    }

    if (!['lock', 'unlock'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "lock" or "unlock"'
      });
    }

    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    let updatedCount = 0;
    const newStatus = action === 'lock' ? 'locked' : 'unlocked';
    
    console.log('Student exam progress before update:', student.examProgress.map(p => ({ examId: p.examId, status: p.status })));

    for (const examId of examIds) {
      const examProgress = student.examProgress.find(
        progress => progress.examId.toString() === examId
      );

      if (examProgress) {
        console.log(`Updating exam ${examId} from ${examProgress.status} to ${newStatus}`);
        examProgress.status = newStatus;
        updatedCount++;
      } else {
        // If no progress exists and we're unlocking, create a new progress entry
        if (action === 'unlock') {
          console.log(`Creating new progress entry for exam ${examId} with status ${newStatus}`);
          student.examProgress.push({
            examId: examId,
            status: newStatus,
            percentage: 0,
            score: 0,
            totalQuestions: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            timeSpent: 0,
            submittedAt: null,
            answers: []
          });
          updatedCount++;
        } else {
          console.log(`Exam ${examId} not found in student progress and action is lock`);
        }
      }
    }

    if (updatedCount > 0) {
      await student.save();
      console.log('Student saved successfully');
    }

    console.log('Toggle multiple exams result:', { updatedCount, newStatus });

    res.json({
      success: true,
      message: `Successfully ${action}ed ${updatedCount} exam(s) for student`,
      updatedCount
    });
  } catch (error) {
    console.error('Toggle multiple exams error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling exams'
    });
  }
};

// @desc    Lock/Unlock entire group for student
// @route   PUT /api/users/students/:id/toggle-group
// @access  Private (Teacher only)
const toggleGroupForStudent = async (req, res) => {
  try {
    const { groupNumber, action } = req.body; // action: 'lock' or 'unlock'

    if (!groupNumber || !['lock', 'unlock'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide group number and action (lock/unlock)'
      });
    }

    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const newStatus = action === 'lock' ? 'locked' : 'unlocked';
    let updatedCount = 0;

    // Update all exams in the specified group
    for (const examProgress of student.examProgress) {
      if (examProgress.examGroup === parseInt(groupNumber)) {
        examProgress.status = newStatus;
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await student.save();
    }

    res.json({
      success: true,
      message: `Successfully ${action}ed group ${groupNumber} (${updatedCount} exams) for student`,
      updatedCount
    });
  } catch (error) {
    console.error('Toggle group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling group'
    });
  }
};

// @desc    Search students
// @route   GET /api/users/students/search
// @access  Private (Teacher only)
const searchStudents = async (req, res) => {
  try {
    const { name, phoneNumber } = req.query;
    let query = { role: 'student' };

    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }

    if (phoneNumber) {
      query.phoneNumber = { $regex: phoneNumber, $options: 'i' };
    }

    const students = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('Search students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching students'
    });
  }
};

// @desc    Assign specific exams to student
// @route   POST /api/users/students/:id/assign-exams
// @access  Private (Teacher only)
const assignSpecificExams = async (req, res) => {
  try {
    const { examIds } = req.body;
    const student = await User.findById(req.params.id);
    
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get exam details to create progress entries
    const Exam = require('../models/Exam');
    const exams = await Exam.find({ _id: { $in: examIds } });
    
    if (exams.length !== examIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some exams not found'
      });
    }

    // Create or update exam progress for each exam
    for (const exam of exams) {
      const existingProgress = student.examProgress.find(
        progress => progress.examId.toString() === exam._id.toString()
      );

      if (!existingProgress) {
        student.examProgress.push({
          examId: exam._id,
          status: 'unlocked',
          correctAnswers: 0,
          totalQuestions: exam.questions.length,
          wrongQuestions: [],
          reviewExamId: null
        });
      }
    }

    await student.save();

    res.json({
      success: true,
      message: 'Exams assigned successfully',
      data: {
        assignedExams: exams.map(exam => ({
          id: exam._id,
          title: exam.title,
          examGroup: exam.examGroup
        }))
      }
    });
  } catch (error) {
    console.error('Assign specific exams error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while assigning exams'
    });
  }
};

// @desc    Assign specific category to student
// @route   POST /api/users/students/:id/assign-category
// @access  Private (Teacher only)
const assignCategory = async (req, res) => {
  try {
    const { category } = req.body;
    const student = await User.findById(req.params.id);
    
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get all exams in the specified category
    const Exam = require('../models/Exam');
    const exams = await Exam.find({ examGroup: parseInt(category), isActive: true });
    
    if (exams.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No exams found in this category'
      });
    }

    // Create or update exam progress for each exam in the category
    for (const exam of exams) {
      const existingProgress = student.examProgress.find(
        progress => progress.examId.toString() === exam._id.toString()
      );

      if (!existingProgress) {
        student.examProgress.push({
          examId: exam._id,
          status: 'unlocked',
          correctAnswers: 0,
          totalQuestions: exam.questions.length,
          wrongQuestions: [],
          reviewExamId: null
        });
      }
    }

    await student.save();

    res.json({
      success: true,
      message: `Category ${category} assigned successfully`,
      data: {
        category: parseInt(category),
        assignedExams: exams.map(exam => ({
          id: exam._id,
          title: exam.title,
          examGroup: exam.examGroup
        }))
      }
    });
  } catch (error) {
    console.error('Assign category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while assigning category'
    });
  }
};

// @desc    Assign multiple categories to student
// @route   POST /api/users/students/:id/assign-categories
// @access  Private (Teacher only)
const assignMultipleCategories = async (req, res) => {
  try {
    const { categories } = req.body;
    const student = await User.findById(req.params.id);
    
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Categories array is required'
      });
    }

    const Exam = require('../models/Exam');
    let totalAssignedExams = 0;
    const assignedCategories = [];

    // Process each category
    for (const category of categories) {
      const categoryNum = parseInt(category);
      const exams = await Exam.find({ examGroup: categoryNum, isActive: true });
      
      if (exams.length > 0) {
        // Create or update exam progress for each exam in the category
        for (const exam of exams) {
          const existingProgress = student.examProgress.find(
            progress => progress.examId.toString() === exam._id.toString()
          );

          if (!existingProgress) {
            student.examProgress.push({
              examId: exam._id,
              status: 'unlocked',
              correctAnswers: 0,
              totalQuestions: exam.questions.length,
              wrongQuestions: [],
              reviewExamId: null
            });
            totalAssignedExams++;
          }
        }
        assignedCategories.push(categoryNum);
      }
    }

    await student.save();

    let message;
    if (assignedCategories.length === 0) {
      message = 'No exams found in the selected categories';
    } else if (totalAssignedExams === 0) {
      message = `Categories ${assignedCategories.join(', ')} processed - all exams were already assigned to the student`;
    } else {
      message = `Successfully assigned ${assignedCategories.length} categories with ${totalAssignedExams} new exams`;
    }

    res.json({
      success: true,
      message,
      data: {
        assignedCategories,
        totalAssignedExams
      }
    });
  } catch (error) {
    console.error('Assign multiple categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while assigning categories'
    });
  }
};

// @desc    Get all student answers across all exams
// @route   GET /api/users/students/:id/all-answers
// @access  Private (Teacher only)
const getAllStudentAnswers = async (req, res) => {
  try {
    const studentId = req.params.id;
    
    // Get student with exam progress
    const student = await User.findById(studentId).select('-password');
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get all exams that the student has attempted
    const attemptedExams = student.examProgress.filter(progress => 
      progress.status === 'completed' || progress.status === 'in_progress'
    );

    const studentAnswers = [];

    for (const progress of attemptedExams) {
      // Get the full exam with questions (only active exams)
      const exam = await Exam.findById(progress.examId).populate('questions');
      if (!exam || !exam.isActive) continue;

      studentAnswers.push({
        exam: {
          _id: exam._id,
          title: exam.title,
          examGroup: exam.examGroup,
          order: exam.order,
          questions: exam.questions
        },
        status: progress.status,
        score: progress.score || 0,
        totalQuestions: progress.totalQuestions || exam.questions.length,
        percentage: progress.percentage || 0,
        answers: progress.answers || []
      });
    }

    // Sort by exam group and order
    studentAnswers.sort((a, b) => {
      if (a.exam.examGroup !== b.exam.examGroup) {
        return a.exam.examGroup - b.exam.examGroup;
      }
      return a.exam.order - b.exam.order;
    });

    res.json({
      success: true,
      data: studentAnswers,
      count: studentAnswers.length
    });
  } catch (error) {
    console.error('Get all student answers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student answers'
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/users/dashboard-stats
// @access  Private (Teacher/Admin only)
const getDashboardStats = async (req, res) => {
  try {
    // Get total students
    const totalStudents = await User.countDocuments({ role: 'student' });
    
    // Get total exams
    const totalExams = await Exam.countDocuments({ isActive: { $ne: false } });
    
    // Get completed exams (students who have completed at least one exam)
    const studentsWithProgress = await User.countDocuments({
      role: 'student',
      'examProgress.status': 'completed'
    });
    
    // Calculate average grades
    const studentsWithGrades = await User.aggregate([
      { $match: { role: 'student', 'examProgress.status': 'completed' } },
      { $unwind: '$examProgress' },
      { $match: { 'examProgress.status': 'completed' } },
      {
        $group: {
          _id: null,
          averageGrade: { $avg: '$examProgress.grade' }
        }
      }
    ]);
    
    const averageGrade = studentsWithGrades.length > 0 ? studentsWithGrades[0].averageGrade : 0;
    
    res.json({
      success: true,
      data: {
        totalStudents,
        totalExams,
        completedExams: studentsWithProgress,
        averageGrade: Math.round(averageGrade * 100) / 100
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics'
    });
  }
};

// @desc    Get analytics data
// @route   GET /api/users/analytics
// @access  Private (Teacher/Admin only)
const getAnalytics = async (req, res) => {
  try {
    // Get total students
    const totalStudents = await User.countDocuments({ role: 'student' });
    
    // Get total exams
    const totalExams = await Exam.countDocuments({ isActive: { $ne: false } });
    
    // Get completed exams
    const studentsWithProgress = await User.countDocuments({
      role: 'student',
      'examProgress.status': 'completed'
    });
    
    // Calculate average grades
    const studentsWithGrades = await User.aggregate([
      { $match: { role: 'student', 'examProgress.status': 'completed' } },
      { $unwind: '$examProgress' },
      { $match: { 'examProgress.status': 'completed' } },
      {
        $group: {
          _id: null,
          averageGrade: { $avg: '$examProgress.grade' }
        }
      }
    ]);
    
    const averageGrade = studentsWithGrades.length > 0 ? studentsWithGrades[0].averageGrade : 0;
    
    // Get student performance data
    const studentPerformance = await User.aggregate([
      { $match: { role: 'student' } },
      {
        $project: {
          name: 1,
          email: 1,
          examProgress: {
            $filter: {
              input: '$examProgress',
              cond: { $eq: ['$$this.status', 'completed'] }
            }
          }
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          totalCompleted: { $size: '$examProgress' },
          averageGrade: {
            $cond: {
              if: { $gt: [{ $size: '$examProgress' }, 0] },
              then: { $avg: '$examProgress.grade' },
              else: 0
            }
          }
        }
      },
      { $sort: { averageGrade: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      success: true,
      data: {
        totalStudents,
        totalExams,
        completedExams: studentsWithProgress,
        averageGrade: Math.round(averageGrade * 100) / 100,
        studentPerformance
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching analytics'
    });
  }
};

module.exports = {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  unlockExamForStudent,
  lockExamForStudent,
  toggleMultipleExams,
  toggleGroupForStudent,
  searchStudents,
  assignSpecificExams,
  assignCategory,
  assignMultipleCategories,
  getAllStudentAnswers,
  getDashboardStats,
  getAnalytics
};
