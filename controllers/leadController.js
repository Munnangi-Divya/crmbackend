const { validationResult } = require('express-validator');
const Lead = require('../models/Lead');
const Call = require('../models/Call');

// @desc    Get all leads
// @route   GET /api/leads
// @access  Private
exports.getLeads = async (req, res) => {
  try {
    let query = {};

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.source) {
      query.source = req.query.source;
    }

    if (req.user.role === 'telecaller') {
      query.createdBy = req.user._id;
    }

    const sortField = req.query.sort_by || 'createdAt';
    const sortOrder = req.query.sort_order === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const leads = await Lead.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name username')
      .populate('lastModifiedBy', 'name username');

    const total = await Lead.countDocuments(query);

    res.status(200).json({
      success: true,
      count: leads.length,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
      data: leads,
    });
  } catch (error) {
    console.error('Error getting leads:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get lead by ID
// @route   GET /api/leads/:id
// @access  Private
exports.getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('createdBy', 'name username')
      .populate('lastModifiedBy', 'name username');

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (
      req.user.role === 'telecaller' &&
      lead.createdBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const calls = await Call.find({ lead: req.params.id })
      .sort({ createdAt: -1 })
      .populate('user', 'name username');

    res.status(200).json({
      success: true,
      data: { ...lead._doc, calls },
    });
  } catch (error) {
    console.error('Error getting lead by ID:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create a lead
// @route   POST /api/leads
// @access  Private
exports.createLead = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const lead = await Lead.create({
      ...req.body,
      createdBy: req.user._id,
      lastModifiedBy: req.user._id,
    });

    await lead.populate('createdBy', 'name username');

    res.status(201).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update a lead
// @route   PUT /api/leads/:id
// @access  Private
exports.updateLead = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    let lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (
      req.user.role === 'telecaller' &&
      lead.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updateData = {
      ...req.body,
      lastModifiedBy: req.user._id,
    };

    lead = await Lead.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('createdBy', 'name username')
      .populate('lastModifiedBy', 'name username');

    res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete a lead
// @route   DELETE /api/leads/:id
// @access  Private
exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (
      req.user.role === 'telecaller' &&
      lead.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Call.deleteMany({ lead: req.params.id });
    await lead.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Lead and associated calls deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get lead sources (counts)
// @route   GET /api/leads/sources
// @access  Private
exports.getLeadSources = async (req, res) => {
  try {
    const sources = await Lead.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          source: '$_id',
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({ success: true, data: sources });
  } catch (error) {
    console.error('Error getting lead sources:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get lead statuses (counts)
// @route   GET /api/leads/statuses
// @access  Private
exports.getLeadStatuses = async (req, res) => {
  try {
    const statuses = await Lead.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          status: '$_id',
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({ success: true, data: statuses });
  } catch (error) {
    console.error('Error getting lead statuses:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
