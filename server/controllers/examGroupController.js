const ExamGroup = require('../models/ExamGroup');
const Exam = require('../models/Exam');

// @desc    Get all exam groups
// @route   GET /api/exam-groups
// @access  Private (Teacher only)
const getExamGroups = async (req, res) => {
  try {
    const groups = await ExamGroup.find({ isActive: true })
      .populate('createdBy', 'name email')
      .sort({ groupNumber: 1 });

    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error('Get exam groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching exam groups'
    });
  }
};

// @desc    Get single exam group
// @route   GET /api/exam-groups/:id
// @access  Private (Teacher only)
const getExamGroup = async (req, res) => {
  try {
    const group = await ExamGroup.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Exam group not found'
      });
    }

    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Get exam group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching exam group'
    });
  }
};

// @desc    Create new exam group
// @route   POST /api/exam-groups
// @access  Private (Teacher only)
const createExamGroup = async (req, res) => {
  try {
    const { name, description, isPremium = true } = req.body;

    // Get the next available group number
    const lastGroup = await ExamGroup.findOne({}, {}, { sort: { groupNumber: -1 } });
    const nextGroupNumber = lastGroup ? lastGroup.groupNumber + 1 : 9;

    const groupData = {
      name,
      description,
      groupNumber: nextGroupNumber,
      isPremium,
      ...(req.user?.id && { createdBy: req.user.id })
    };

    const group = await ExamGroup.create(groupData);

    res.status(201).json({
      success: true,
      message: 'Exam group created successfully',
      data: group
    });
  } catch (error) {
    console.error('Create exam group error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Group name or number already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating exam group'
    });
  }
};

// @desc    Update exam group
// @route   PUT /api/exam-groups/:id
// @access  Private (Teacher only)
const updateExamGroup = async (req, res) => {
  try {
    const { name, description, isPremium } = req.body;

    const group = await ExamGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Exam group not found'
      });
    }

    // Check if user is the creator or admin (skip if no authentication)
    if (req.user && group.createdBy && group.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this group'
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isPremium !== undefined) updateData.isPremium = isPremium;

    const updatedGroup = await ExamGroup.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Exam group updated successfully',
      data: updatedGroup
    });
  } catch (error) {
    console.error('Update exam group error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Group name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating exam group'
    });
  }
};

// @desc    Delete exam group
// @route   DELETE /api/exam-groups/:id
// @access  Private (Teacher only)
const deleteExamGroup = async (req, res) => {
  try {
    const group = await ExamGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Exam group not found'
      });
    }

    // Check if user is the creator or admin (skip if no authentication)
    if (req.user && group.createdBy && group.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this group'
      });
    }

    // Check if group has exams
    const examCount = await Exam.countDocuments({ examGroup: group.groupNumber });
    if (examCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete group. It contains ${examCount} exam(s). Please move or delete the exams first.`
      });
    }

    await ExamGroup.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Exam group deleted successfully'
    });
  } catch (error) {
    console.error('Delete exam group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting exam group'
    });
  }
};

// @desc    Get group statistics
// @route   GET /api/exam-groups/:id/statistics
// @access  Private (Teacher only)
const getGroupStatistics = async (req, res) => {
  try {
    const group = await ExamGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Exam group not found'
      });
    }

    // Get exam count for this group
    const examCount = await Exam.countDocuments({ examGroup: group.groupNumber });

    // Get statistics from exams in this group
    const exams = await Exam.find({ examGroup: group.groupNumber });
    const totalAttempts = exams.reduce((sum, exam) => sum + (exam.statistics?.totalAttempts || 0), 0);
    const totalAverageScore = exams.reduce((sum, exam) => sum + (exam.statistics?.averageScore || 0), 0);
    const averageScore = exams.length > 0 ? totalAverageScore / exams.length : 0;
    const totalPassRate = exams.reduce((sum, exam) => sum + (exam.statistics?.passRate || 0), 0);
    const passRate = exams.length > 0 ? totalPassRate / exams.length : 0;

    res.json({
      success: true,
      data: {
        examCount,
        totalAttempts,
        averageScore: Math.round(averageScore * 100) / 100,
        passRate: Math.round(passRate * 100) / 100
      }
    });
  } catch (error) {
    console.error('Get group statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching group statistics'
    });
  }
};

module.exports = {
  getExamGroups,
  getExamGroup,
  createExamGroup,
  updateExamGroup,
  deleteExamGroup,
  getGroupStatistics
};
