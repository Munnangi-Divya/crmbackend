const express = require('express');
const { check } = require('express-validator');
const {
  createCall,
  getCallsByLead,
  getConnectedCalls,
  getCallTrends,
  getDashboardStats,
  getDailyCallCount,
  getMetrics,
  getTelecallerStats
} = require('../controllers/callController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// ======= All routes require auth =======
router.use(protect);

// ======= Validation =======
const callValidation = [
  check('lead', 'Lead ID is required').not().isEmpty().isMongoId(),
  check('status', 'Status must be "connected" or "not_connected"').isIn(['connected', 'not_connected']),
  check('duration', 'Duration must be a number').optional().isNumeric(),
  check('connectedResponse')
    .if((value, { req }) => req.body.status === 'connected')
    .notEmpty()
    .withMessage('Connected response is required when status is "connected"')
    .isIn(['discussed', 'callback', 'interested']),
  check('notConnectedReason')
    .if((value, { req }) => req.body.status === 'not_connected')
    .notEmpty()
    .withMessage('Not connected reason is required when status is "not_connected"')
    .isIn(['busy', 'rnr', 'switched_off'])
];

// ======= Routes =======

// Create a call
router.post('/', callValidation, createCall);

// Get calls by lead ID


// Get connected calls (admin only)
router.get('/connected', authorize('admin'), getConnectedCalls);

// Get call trends (for graphs)

router.get('/trends', getCallTrends);

// Get daily call count (admin only)
//router.get('/daily', authorize('admin'), getDailyCallCount);//

// Get call metrics (admin only)
//router.get('/metrics', authorize('admin'), getMetrics);//

// Get dashboard stats
router.get('/stats', getDashboardStats);//

// Get telecaller performance stats (admin only)
router.get('/telecaller-stats', authorize('admin'), getTelecallerStats);

module.exports = router;
