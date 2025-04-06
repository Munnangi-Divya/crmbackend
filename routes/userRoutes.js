
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { 
  getUsers,
  getTelecallers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
  getProfile,
  updateProfile
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// Validation middlewares
const userValidation = [
  check('name', 'Name is required').not().isEmpty(),
  check('username', 'Username is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail()
];

const passwordValidation = [
  check('password', 'Password must be 6 or more characters').isLength({ min: 6 })
];

// Protect all routes below this line
router.use(protect);

// =====================
// Routes for All Users
// =====================

// Get your own profile
router.get('/profile', getProfile);

// Update your own profile
router.put('/profile', updateProfile);

// Get all telecallers (visible to all authenticated users)
router.get('/telecallers', getTelecallers);

// Get own stats or admin
router.get('/:id/stats', getUserStats);

// =====================
// Admin Only Routes
// =====================

// Get all users
router.get('/', authorize('admin'), getUsers);

// Get user by ID
router.get('/:id', authorize('admin'), getUserById);

// Create user
router.post(
  '/', 
  authorize('admin'), 
  [...userValidation, ...passwordValidation], 
  createUser
);

// Update user
router.put(
  '/:id',
  authorize('admin'), // you can enhance this with an `isSelfOrAdmin` logic if needed
  userValidation,
  updateUser
);

// Delete user
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
