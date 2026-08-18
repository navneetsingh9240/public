const mongoose = require('mongoose');

const containerReadModelSchema = new mongoose.Schema(
  {
    containerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    owner: { type: String, default: 'Global Cargo Logistics' },
    origin: { type: String, default: null },
    destination: { type: String, default: null },
    currentLocation: { type: String, default: 'Unknown' },
    status: { type: String, default: 'CREATED' },
    temperature: { type: Number, default: null },
    temperatureStatus: { type: String, default: 'NORMAL' },
    loaded: { type: Boolean, default: false },
    vesselName: { type: String, default: null },
    arrivedAtPort: { type: Boolean, default: false },
    portName: { type: String, default: null },
    unloaded: { type: Boolean, default: false },
    deliveryCompleted: { type: Boolean, default: false },
    currentVersion: { type: Number, required: true, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

const ContainerReadModel = mongoose.model('ContainerReadModel', containerReadModelSchema);

module.exports = ContainerReadModel;
