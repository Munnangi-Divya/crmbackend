const mongoose = require('mongoose');

const CallSchema = new mongoose.Schema({
  // Reference to lead
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  // Reference to user who made the call
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Call status (connected or not connected)
  status: {
    type: String,
    enum: ['connected', 'not_connected'],
    required: true
  },
  // Call duration in seconds
  duration: {
    type: Number,
    default: 0
  },
  // If connected, what was the response
  connectedResponse: {
    type: String,
    enum: ['discussed', 'callback', 'interested'],
    validate: {
      validator: function (v) {
        if (this.status === 'connected') {
          return !!v;
        }
        return true;
      },
      message: 'Connected response is required when status is "connected"'
    }
  },
  // If not connected, why
  notConnectedReason: {
    type: String,
    enum: ['busy', 'rnr', 'switched_off'],
    validate: {
      validator: function (v) {
        if (this.status === 'not_connected') {
          return !!v;
        }
        return true;
      },
      message: 'Not connected reason is required when status is "not_connected"'
    }
  },
  // Notes about the call
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Call', CallSchema);
