const ExamGroup = require('../models/ExamGroup');
const Exam = require('../models/Exam');
const SiteSettings = require('../models/SiteSettings');
const { DEFAULT_CURRICULUM_ORDER } = SiteSettings;
const { normalizeCurriculumGroupNames } = require('../utils/curriculumGroupNames');

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
      .sort({ displayOrder: 1, groupNumber: 1 });

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
      // DB row looks like a standard curriculum name but no exams use this custom folder — safe to delete as clutter.
      obj.isRedundantAlias =
        g.groupNumber >= 9 &&
        customSlot === 0 &&
        inferred !== null &&
        inferred >= 0 &&
        inferred <= 8;
      return obj;
    });

    // Standard curriculum groups 0–8 (examGroup on Exam). Custom ExamGroup rows use groupNumber >= 9.
    const curriculumExamCounts = {};
    for (let i = 0; i <= 8; i += 1) {
      curriculumExamCounts[String(i)] = countByGroupNumber.get(String(i)) ?? 0;
    }

    const curriculumGroupOrder = await SiteSettings.getCurriculumGroupOrder();
    const curriculumGroupNames = await SiteSettings.getCurriculumGroupNames();

    res.json({
      success: true,
      data: groupsWithCounts,
      curriculumExamCounts,
      curriculumGroupOrder,
      curriculumGroupNames
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

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required'
      });
    }

    if (inferStandardGroupFromName(trimmedName) !== null) {
      return res.status(400).json({
        success: false,
        message:
          'This name matches a real site group (Foundation or Group 1–8). Use the curriculum section on Manage Groups — do not create a duplicate folder with the same name.'
      });
    }

    // Get the next available group number
    const lastGroup = await ExamGroup.findOne({}, {}, { sort: { groupNumber: -1 } });
    const nextGroupNumber = lastGroup ? lastGroup.groupNumber + 1 : 9;

    const groupData = {
      name: trimmedName,
      description,
      groupNumber: nextGroupNumber,
      displayOrder: nextGroupNumber,
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
    if (name !== undefined && name !== null) {
      const t = String(name).trim();
      if (!t) {
        return res.status(400).json({
          success: false,
          message: 'Group name cannot be empty'
        });
      }
      if (group.groupNumber >= 9 && inferStandardGroupFromName(t) !== null) {
        return res.status(400).json({
          success: false,
          message:
            'This name matches a real site group (Foundation or Group 1–8). Use the curriculum section — do not rename extra folders to duplicate those names.'
        });
      }
      updateData.name = t;
    }
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

// @desc    Reorder custom exam folders (groupNumber >= 9)
// @route   PUT /api/exam-groups/reorder-folders
// @access  Private (Teacher only)
const reorderExamFolders = async (req, res) => {
  try {
    const { orderedGroupIds } = req.body;

    if (!Array.isArray(orderedGroupIds) || orderedGroupIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'orderedGroupIds must be a non-empty array'
      });
    }

    const groups = await ExamGroup.find({
      _id: { $in: orderedGroupIds },
      isActive: true,
      groupNumber: { $gte: 9 }
    });

    if (groups.length !== orderedGroupIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more folder IDs are invalid or not custom folders'
      });
    }

    const baseOrder = 1000;
    await Promise.all(
      orderedGroupIds.map((id, index) =>
        ExamGroup.findByIdAndUpdate(id, { displayOrder: baseOrder + index })
      )
    );

    res.json({
      success: true,
      message: 'Folders reordered successfully'
    });
  } catch (error) {
    console.error('Reorder exam folders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while reordering folders'
    });
  }
};

// @desc    Reorder standard curriculum groups (0–8)
// @route   PUT /api/exam-groups/reorder-curriculum
// @access  Private (Teacher only)
const reorderCurriculumGroups = async (req, res) => {
  try {
    const { orderedSlots } = req.body;

    if (!Array.isArray(orderedSlots) || orderedSlots.length !== 9) {
      return res.status(400).json({
        success: false,
        message: 'orderedSlots must be an array of all 9 curriculum groups (0–8)'
      });
    }

    const normalized = orderedSlots.map((n) => parseInt(n, 10));
    const expected = new Set(DEFAULT_CURRICULUM_ORDER);
    const received = new Set(normalized);

    if (
      normalized.some((n) => Number.isNaN(n) || n < 0 || n > 8) ||
      received.size !== 9 ||
      ![...expected].every((n) => received.has(n))
    ) {
      return res.status(400).json({
        success: false,
        message: 'orderedSlots must contain each curriculum group 0–8 exactly once'
      });
    }

    const settings = await SiteSettings.getMain();
    settings.curriculumGroupOrder = normalized;
    await settings.save();

    res.json({
      success: true,
      message: 'Curriculum groups reordered successfully',
      curriculumGroupOrder: normalized
    });
  } catch (error) {
    console.error('Reorder curriculum groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while reordering curriculum groups'
    });
  }
};

// @desc    Update display name for a standard curriculum group (0–8)
// @route   PUT /api/exam-groups/curriculum-name
// @access  Private (Teacher only)
const updateCurriculumGroupName = async (req, res) => {
  try {
    const slot = parseInt(req.body.slot, 10);
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';

    if (Number.isNaN(slot) || slot < 0 || slot > 8) {
      return res.status(400).json({
        success: false,
        message: 'slot must be a curriculum group number between 0 and 8'
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required'
      });
    }

    const settings = await SiteSettings.getMain();
    const current = normalizeCurriculumGroupNames(settings.curriculumGroupNames);
    current[String(slot)] = name;
    settings.curriculumGroupNames = current;
    await settings.save();

    res.json({
      success: true,
      message: 'Curriculum group name updated successfully',
      curriculumGroupNames: current
    });
  } catch (error) {
    console.error('Update curriculum group name error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating curriculum group name'
    });
  }
};

module.exports = {
  getExamGroups,
  getExamGroup,
  createExamGroup,
  updateExamGroup,
  deleteExamGroup,
  getGroupStatistics,
  reorderExamFolders,
  reorderCurriculumGroups,
  updateCurriculumGroupName
};
