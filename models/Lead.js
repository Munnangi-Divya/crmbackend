const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot be more than 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    trim: true,
    maxlength: [20, 'Phone number cannot be more than 20 characters']
  },
  email: {
    type: String,
    trim: true,
    match: [/^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})$/, 'Please add a valid email']
  },
  address: {
    type: String,
    required: [true, 'Please add an address']
  },
  source: {
    type: String,
    enum: ['website', 'referral', 'social', 'direct', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'proposal', 'converted', 'lost'],
    default: 'new'
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastModifiedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Middleware to update lastModifiedAt before saving
LeadSchema.pre('save', function(next) {
  this.lastModifiedAt = Date.now();
  next();
});

module.exports = mongoose.model('Lead', LeadSchema);
