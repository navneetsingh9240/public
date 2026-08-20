const mongoose = require('mongoose');

const ContainerReadModelSchema = new mongoose.Schema(
  {
    containerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    owner: { type: String, default: 'Global Cargo Logistics' },
    origin: { type: String },
    destination: { type: String },
    currentLocation: { type: String },
    status: {
      type: String,
      enum: ['NON_EXISTENT', 'CREATED', 'LOADED', 'IN_TRANSIT', 'ARRIVED', 'UNLOADED', 'DELIVERED'],
      default: 'CREATED',
    },
    loaded: { type: Boolean, default: false },
    vesselName: { type: String, default: null },
    arrivedAtPort: { type: Boolean, default: false },
    portName: { type: String, default: null },
    unloaded: { type: Boolean, default: false },
    deliveryCompleted: { type: Boolean, default: false },
    temperature: { type: Number, default: null },
    temperatureStatus: { type: String, enum: ['NORMAL', 'WARNING', 'CRITICAL'], default: 'NORMAL' },
    humidity: { type: Number, default: null },
    humidityStatus: { type: String, enum: ['NORMAL', 'WARNING'], default: 'NORMAL' },
    doorOpen: { type: Boolean, default: false },
    maxShockG: { type: Number, default: 0 },
    geofenceBreached: { type: Boolean, default: false },
    coordinates: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    currentVersion: { type: Number, required: true },
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ContainerReadModel', ContainerReadModelSchema);
