const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { registerUser, loginUser, getCurrentUser } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Validation rules
const registerValidation = [
  check('name', 'Name is required').not().isEmpty(),
  check('username', 'Username is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password must be 6 or more characters').isLength({ min: 6 })
];

const loginValidation = [
  check('username', 'Username is required').not().isEmpty(),
  check('password', 'Password is required').exists()
];

// Register user
router.post('/register', registerValidation, registerUser);

// Login user
router.post('/login', loginValidation, loginUser);

// Get current user
router.get('/user', protect, getCurrentUser);

module.exports = router;
