const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Call = require('../models/Call');

// @desc Get all users
// @route GET /api/users
// @access Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-__v').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Get all telecallers
// @route GET /api/users/telecallers
// @access Private/Admin
exports.getTelecallers = async (req, res) => {
  try {
    const telecallers = await User.find({ role: 'telecaller' })
      .select('_id name username')
      .sort({ name: 1 });
    res.status(200).json({ success: true, count: telecallers.length, data: telecallers });
  } catch (error) {
    console.error('Error getting telecallers:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Get user by ID
// @route GET /api/users/:id
// @access Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -__v');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Error getting user by ID:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Create a new user
// @route POST /api/users
// @access Private/Admin
exports.createUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, username, email, password, role, phone } = req.body;

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ success: false, message: 'User already exists' });

    const user = await User.create({
      name,
      username,
      email,
      password,
      role: role || 'telecaller',
      phone: phone || ''
    });

    const userData = {
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      phone: user.phone,
      createdAt: user.createdAt
    };

    res.status(201).json({ success: true, data: userData });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Update user
// @route PUT /api/users/:id
// @access Private/Admin or Self
exports.updateUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, role, phone, currentPassword, newPassword } = req.body;

  try {
    let user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isSelfUpdate = req.user._id.toString() === req.params.id;

    if (!isSelfUpdate && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;

    if (role && req.user.role === 'admin') user.role = role;

    if (newPassword) {
      if (isSelfUpdate) {
        const userWithPassword = await User.findById(req.params.id).select('+password');
        if (!currentPassword || !(await userWithPassword.matchPassword(currentPassword))) {
          return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    const updatedUser = await user.save();
    res.status(200).json({
      success: true,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role,
        phone: updatedUser.phone
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Delete user
// @route DELETE /api/users/:id
// @access Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    await user.deleteOne();
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Get user stats
// @route GET /api/users/:id/stats
// @access Private/Admin or Self
exports.getUserStats = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isSelf = req.user._id.toString() === req.params.id;
    if (!isSelf && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view stats' });
    }

    const totalCalls = await Call.countDocuments({ user: req.params.id });
    const connectedCalls = await Call.countDocuments({ user: req.params.id, status: 'connected' });

    const connectionRate = totalCalls ? `${Math.round((connectedCalls / totalCalls) * 100)}%` : '0%';

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const callsThisWeek = await Call.countDocuments({
      user: req.params.id,
      createdAt: { $gte: oneWeekAgo }
    });

    res.status(200).json({
      success: true,
      data: {
        totalCalls,
        connectedCalls,
        connectionRate,
        callsThisWeek
      }
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
exports.updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const userId = req.user._id;
    const { name, email, phone, currentPassword, newPassword } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (phone) updateFields.phone = phone;

    // If password update requested
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set a new password',
        });
      }

      const userWithPassword = await User.findById(userId).select('+password');
      const isMatch = await userWithPassword.matchPassword(currentPassword);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      const salt = await bcrypt.genSalt(10);
      updateFields.password = await bcrypt.hash(newPassword, salt);
    }

    updateFields.lastActive = Date.now();

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-__v -password');

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// @desc    Get user profile with stats and recent activity
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-__v -password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const totalCalls = await Call.countDocuments({ user: req.user._id });
    const connectedCalls = await Call.countDocuments({
      user: req.user._id,
      status: 'connected',
    });

    const connectionRate = totalCalls
      ? Math.round((connectedCalls / totalCalls) * 100) + '%'
      : '0%';

    const recentActivity = await Call.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('lead', 'name company phone');

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          totalCalls,
          connectedCalls,
          connectionRate,
        },
        recentActivity,
      },
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
