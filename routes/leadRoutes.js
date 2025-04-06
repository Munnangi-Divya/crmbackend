const express = require('express');
const { check } = require('express-validator');
const {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getLeadSources,
  getLeadStatuses
} = require('../controllers/leadController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes protected
router.use(protect);

// ======= Validation =======

const leadValidation = [
  check('name', 'Name is required').not().isEmpty(),
  check('phone', 'Phone is required').not().isEmpty(),
  check('source', 'Source must be a valid option').isIn([
    'website', 'referral', 'social', 'direct', 'other'
  ]),
  check('email', 'Invalid email format').optional().isEmail()
];

const updateLeadValidation = [
  check('name', 'Name is required').optional().not().isEmpty(),
  check('phone', 'Phone is required').optional().not().isEmpty(),
  check('source', 'Source must be a valid option').optional().isIn([
    'website', 'referral', 'social', 'direct', 'other'
  ]),
  check('status', 'Status is invalid').optional().isIn([
    'new', 'contacted', 'qualified', 'proposal', 'converted', 'lost'
  ]),
  check('email', 'Invalid email format').optional().isEmail()
];

// ======= Routes =======

// Get all leads
router.get('/', getLeads);

// Get lead sources & statuses
router.get('/sources', getLeadSources);
router.get('/statuses', getLeadStatuses);

// Create lead
router.post('/', leadValidation, createLead);

// Get single lead by ID
router.get('/:id', getLeadById);

// Update lead
router.put('/:id', updateLeadValidation, updateLead);

// Delete lead
router.delete('/:id', deleteLead);

module.exports = router;
