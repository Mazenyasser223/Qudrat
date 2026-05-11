const ExamGroup = require('../models/ExamGroup');
const Exam = require('../models/Exam');

/** When no explicit DB link, map common Arabic names to standard examGroup 0–8. */
const inferStandardGroupFromName = (name) => {
  if (!name || typeof name !== 'string') return null;
  const t = name.trim().replace(/\s+/g, ' ');
  if (/تأسيس/.test(t)) return 0;
  const arabicToLatin = (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
    return ch;
  };
  const m = t.match(/(?:المجموعة|مجموعة)\s*([0-9\u0660-\u0669\u06f0-\u06f9]+)/);
  if (!m) {
    const en = t.match(/group\s*([0-9]+)/i);
    if (en) {
      const n = parseInt(en[1], 10);
      return n >= 1 && n <= 8 ? n : null;
    }
    return null;
  }
  const numStr = [...m[1]].map(arabicToLatin).join('');
  const n = parseInt(numStr, 10);
  if (Number.isNaN(n) || n < 1 || n > 8) return null;
  return n;
};

// @desc    Get all exam groups
// @route   GET /api/exam-groups
// @access  Private (Teacher only)
const getExamGroups = async (req, res) => {
  try {
    const groups = await ExamGroup.find({ isActive: true })
      .populate('createdBy', 'name email')
      .sort({ groupNumber: 1 });

    // Compute live exam counts (source of truth) to avoid stale `examCount` values.
    const counts = await Exam.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$examGroup', count: { $sum: 1 } } }
    ]);
    const countByGroupNumber = new Map(counts.map((c) => [String(c._id), c.count]));

    const groupsWithCounts = groups.map((g) => {
      const obj = g.toObject({ virtuals: true });
      const customSlot = countByGroupNumber.get(String(g.groupNumber)) ?? 0;
      const explicit =
        obj.linkedCurriculumGroup !== undefined &&
        obj.linkedCurriculumGroup !== null;
      const explicitVal = explicit ? obj.linkedCurriculumGroup : null;
      const inferred = explicit ? null : inferStandardGroupFromName(obj.name);
      const linked =
        explicit && explicitVal >= 0 && explicitVal <= 8
          ? explicitVal
          : inferred !== null && inferred >= 0 && inferred <= 8
            ? inferred
            : null;
      const filterGroup =
        linked !== null && linked >= 0 && linked <= 8 ? linked : g.groupNumber;
      const resolved = countByGroupNumber.get(String(filterGroup)) ?? 0;
      obj.examCount = resolved;
      obj.customSlotExamCount = customSlot;
      obj.examFilterGroup = filterGroup;
      obj.resolvedCurriculumSlot =
        linked !== null && linked >= 0 && linked <= 8 ? linked : null;
      obj.curriculumLinkSource = explicit
        ? 'saved'
        : inferred !== null
          ? 'name'
          : null;
      return obj;
    });

    // Standard curriculum groups 0–8 (examGroup on Exam). Custom ExamGroup rows use groupNumber >= 9.
    const curriculumExamCounts = {};
    for (let i = 0; i <= 8; i += 1) {
      curriculumExamCounts[String(i)] = countByGroupNumber.get(String(i)) ?? 0;
    }

    res.json({
      success: true,
      data: groupsWithCounts,
      curriculumExamCounts
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
    const { name, description, isPremium = true, linkedCurriculumGroup } = req.body;

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

    if (
      linkedCurriculumGroup !== undefined &&
      linkedCurriculumGroup !== null &&
      linkedCurriculumGroup !== ''
    ) {
      const n = parseInt(linkedCurriculumGroup, 10);
      if (!Number.isNaN(n) && n >= 0 && n <= 8) {
        groupData.linkedCurriculumGroup = n;
      }
    }

    const group = await ExamGroup.create(groupData);

    res.status(201).json({
      success: true,
      message: 'Exam group created successfully',
      data: group
    });
  } catch (error) {
    console.error('Create exam group error:', error);
    
    if (error.code === 11000) {
      const key = error.keyPattern && Object.keys(error.keyPattern)[0];
      if (key === 'linkedCurriculumGroup') {
        return res.status(400).json({
          success: false,
          message: 'Another group is already linked to that standard curriculum slot (0–8).'
        });
      }
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
    const { name, description, isPremium, linkedCurriculumGroup } = req.body;

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

    if (Object.prototype.hasOwnProperty.call(req.body, 'linkedCurriculumGroup')) {
      if (
        linkedCurriculumGroup === null ||
        linkedCurriculumGroup === '' ||
        linkedCurriculumGroup === undefined
      ) {
        updateData.$unset = { ...(updateData.$unset || {}), linkedCurriculumGroup: '' };
      } else {
        const n = parseInt(linkedCurriculumGroup, 10);
        if (!Number.isNaN(n) && n >= 0 && n <= 8) {
          updateData.linkedCurriculumGroup = n;
        }
      }
    }

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
      const key = error.keyPattern && Object.keys(error.keyPattern)[0];
      if (key === 'linkedCurriculumGroup') {
        return res.status(400).json({
          success: false,
          message: 'Another group is already linked to that standard curriculum slot (0–8).'
        });
      }
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

    // Check if group has active exams
    const examCount = await Exam.countDocuments({ 
      examGroup: group.groupNumber, 
      isActive: true 
    });
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
