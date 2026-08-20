const mongoose = require('mongoose');

const AnchorRecordSchema = new mongoose.Schema({
  aggregateId: { type: String, required: true, index: true },
  merkleRoot: { type: String, required: true },
  totalEvents: { type: Number, required: true },
  txHash: { type: String, required: true, unique: true },
  blockNumber: { type: Number, required: true },
  network: { type: String, default: 'Polygon PoS Mainnet' },
  contractAddress: { type: String, required: true },
  explorerUrl: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('AnchorRecord', AnchorRecordSchema);
