const { validationResult } = require('express-validator');
const Call = require('../models/Call');
const Lead = require('../models/Lead');
const User = require('../models/User');

// @desc    Create a call record
// @route   POST /api/calls
// @access  Private
exports.createCall = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { lead: leadId, status, duration, connectedResponse, notConnectedReason, notes } = req.body;

  try {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (req.user.role === 'telecaller' && lead.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to log calls for this lead' });
    }

    const callData = {
      lead: leadId,
      user: req.user._id,
      status,
      duration: duration || 0,
      notes
    };

    if (status === 'connected' && connectedResponse) {
      callData.connectedResponse = connectedResponse;
    } else if (status === 'not_connected' && notConnectedReason) {
      callData.notConnectedReason = notConnectedReason;
    }

    const call = await Call.create(callData);

    if (lead.status === 'new') {
      await Lead.findByIdAndUpdate(leadId, { status: 'contacted' });
    }

    await call.populate([
      { path: 'user', select: 'name username' },
      { path: 'lead', select: 'name phone email' }
    ]);

    if (status === 'connected') {
      let newStatus = lead.status;

      if (lead.status === 'new') newStatus = 'contacted';
      if (connectedResponse === 'interested' && ['new', 'contacted'].includes(lead.status)) {
        newStatus = 'qualified';
      }

      if (newStatus !== lead.status) {
        lead.status = newStatus;
        lead.lastModifiedBy = req.user._id;
        await lead.save();
      }
    }

    res.status(201).json({ success: true, data: call });

  } catch (error) {
    console.error('Error creating call:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all connected calls
// @route   GET /api/calls/connected
// @access  Private
exports.getConnectedCalls = async (req, res) => {
  try {
    const query = { status: 'connected' };
    if (req.user.role === 'telecaller') {
      query.user = req.user._id;
    }

    const limit = parseInt(req.query.limit, 10) || 10;

    const calls = await Call.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate([
        { path: 'lead', select: 'name phone email' },
        { path: 'user', select: 'name username' }
      ]);

    res.status(200).json({ success: true, count: calls.length, data: calls });

  } catch (error) {
    console.error('Error getting connected calls:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get calls by lead ID
// @route   GET /api/calls/lead/:leadId
// @access  Private
exports.getCallsByLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.leadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (req.user.role === 'telecaller' && lead.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this lead' });
    }

    const calls = await Call.find({ lead: req.params.leadId })
      .sort({ createdAt: -1 })
      .populate('user', 'name username');

    res.status(200).json({ success: true, count: calls.length, data: calls });

  } catch (error) {
    console.error('Error getting calls by lead:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get daily call trends
// @route   GET /api/calls/trends
// @access  Private
exports.getCallTrends = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const matchQuery = { createdAt: { $gte: startDate, $lte: endDate } };
    if (req.user.role === 'telecaller') {
      matchQuery.user = req.user._id;
    }

    const callTrends = await Call.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          connected: {
            $sum: { $cond: [{ $eq: ['$status', 'connected'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const result = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const existing = callTrends.find(item => item._id === dateStr);
      result.push(existing || { date: dateStr, count: 0, connected: 0 });
    }

    res.status(200).json({ success: true, data: result });

  } catch (error) {
    console.error('Error getting call trends:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/calls/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    const query = {};
    const callQuery = {};

    if (req.user.role === 'telecaller') {
      query.createdBy = req.user._id;
      callQuery.user = req.user._id;
    }

    const totalLeads = await Lead.countDocuments(query);
    const totalCalls = await Call.countDocuments(callQuery);
    const connectedCalls = await Call.countDocuments({ ...callQuery, status: 'connected' });
    const totalTelecallers = await User.countDocuments({ role: 'telecaller' });

    const connectionRate = totalCalls
      ? ((connectedCalls / totalCalls) * 100).toFixed(2) + '%'
      : '0%';

    res.status(200).json({
      success: true,
      data: {
        totalLeads,
        totalCalls,
        connectedCalls,
        connectionRate,
        totalTelecallers
      }
    });

  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get telecaller performance stats
// @route   GET /api/calls/telecaller-stats
// @access  Private/Admin
exports.getTelecallerStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const days = parseInt(req.query.days, 10) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await Call.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$user',
          totalCalls: { $sum: 1 },
          connected: {
            $sum: { $cond: [{ $eq: ['$status', 'connected'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          name: '$user.name',
          username: '$user.username',
          totalCalls: 1,
          connected: 1
        }
      },
      { $sort: { totalCalls: -1 } }
    ]);

    res.status(200).json({ success: true, data: stats });

  } catch (error) {
    console.error('Error getting telecaller stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
