const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
    },
    aggregateId: {
      type: String,
      required: true,
      index: true,
    },
    aggregateType: {
      type: String,
      required: true,
      default: 'Container',
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    version: {
      type: Number,
      required: true,
    },
    previousHash: {
      type: String,
      default: null,
    },
    eventHash: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Compound indexes for optimal Query performance and OCC constraint
eventSchema.index({ aggregateId: 1, version: 1 }, { unique: true });
eventSchema.index({ aggregateId: 1, timestamp: 1 });

// IMMUTABILITY GUARD
// Prevent modification or update of existing event documents
const blockMutation = function (next) {
  const err = new Error('Immutable Event Store: Modification or deletion of events is strictly forbidden.');
  err.statusCode = 403;
  next(err);
};

eventSchema.pre('save', function (next) {
  if (!this.isNew) {
    return blockMutation(next);
  }
  next();
});

eventSchema.pre('updateOne', blockMutation);
eventSchema.pre('updateMany', blockMutation);
eventSchema.pre('findOneAndUpdate', blockMutation);
eventSchema.pre('replaceOne', blockMutation);
eventSchema.pre('deleteOne', blockMutation);
eventSchema.pre('deleteMany', blockMutation);
eventSchema.pre('findOneAndDelete', blockMutation);
eventSchema.pre('remove', blockMutation);

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
