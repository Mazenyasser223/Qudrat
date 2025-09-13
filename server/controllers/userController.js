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
      res.status(404).json({
        success: false,
        message: 'Exam progress not found for this student'
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
      res.status(404).json({
        success: false,
        message: 'Exam progress not found for this student'
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
    const { examIds, action } = req.body; // action: 'lock' or 'unlock'

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

    for (const examId of examIds) {
      const examProgress = student.examProgress.find(
        progress => progress.examId.toString() === examId
      );

      if (examProgress) {
        examProgress.status = newStatus;
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await student.save();
    }

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
  getAllStudentAnswers
};
