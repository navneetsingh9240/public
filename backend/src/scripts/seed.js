const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Event = require('../models/Event');
const ContainerReadModel = require('../models/ContainerReadModel');
const commandHandlers = require('../commands/commandHandlers');
const { rebuildAllProjections } = require('../projections/containerProjection');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/audittrail';

async function seed() {
  let mongod = null;
  try {
    let mongoUri = MONGO_URI;

    // Connect to MongoDB or start MongoMemoryServer if mongod is not local
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
      console.log(`Connected to MongoDB at ${mongoUri}`);
    } catch (e) {
      console.log('Local MongoDB not reachable, starting MongoMemoryServer for seed...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongod = await MongoMemoryServer.create({ instance: { port: 27017 } });
      mongoUri = mongod.getUri();
      await mongoose.connect(mongoUri);
    }

    console.log('🧹 Clearing existing events and read models...');
    if (mongoose.connection.db) {
      await mongoose.connection.collection('events').deleteMany({});
      await mongoose.connection.collection('containerreadmodels').deleteMany({});
    }

    console.log('🌱 Seeding CNT-1001 (Cold-chain shipment with temperature spike)...');
    await commandHandlers.createContainer({
      containerId: 'CNT-1001',
      owner: 'Pacific Cold Chain Express',
      origin: 'Singapore Port',
      destination: 'Mumbai Port',
      initialLocation: 'Singapore Terminal 3',
      initialTemperature: 4.2,
    });

    await commandHandlers.loadContainer({
      containerId: 'CNT-1001',
      vesselName: 'MV Majestic Sapphire',
      location: 'Singapore Terminal 3',
    });

    await commandHandlers.moveContainer({
      containerId: 'CNT-1001',
      location: 'Malacca Strait',
      notes: 'Passing international shipping line',
    });

    await commandHandlers.recordTelemetry({
      containerId: 'CNT-1001',
      temperature: 5.1,
      humidity: 55,
      shockG: 0.2,
      doorOpen: false,
      latitude: 2.5,
      longitude: 101.8,
      location: 'Malacca Strait',
    });

    // TEMPERATURE SPIKE Event (exceeds threshold 8.0°C)
    await commandHandlers.recordTelemetry({
      containerId: 'CNT-1001',
      temperature: 12.8,
      humidity: 82, // triggers humidity spike
      shockG: 3.1, // triggers cargo shock breach (>2.5G)
      doorOpen: true, // triggers door open event
      latitude: 10.2,
      longitude: 65.4,
      location: 'Arabian Sea',
      geofenceBreached: true, // triggers geofence exit
    });

    await commandHandlers.moveContainer({
      containerId: 'CNT-1001',
      location: 'Arabian Sea (Approaching Outer Anchorage)',
    });

    await commandHandlers.arriveContainer({
      containerId: 'CNT-1001',
      portName: 'Mumbai Port',
      location: 'Mumbai Port Berth 4',
    });

    console.log('🌱 Seeding CNT-1002 (Normal standard container journey)...');
    await commandHandlers.createContainer({
      containerId: 'CNT-1002',
      owner: 'Maersk Line Global',
      origin: 'Rotterdam Port',
      destination: 'New York Container Terminal',
      initialLocation: 'Rotterdam ECT Gateway',
      initialTemperature: 18.0,
    });

    await commandHandlers.loadContainer({
      containerId: 'CNT-1002',
      vesselName: 'Maersk Mc-Kinney',
      location: 'Rotterdam ECT Gateway',
    });

    await commandHandlers.moveContainer({
      containerId: 'CNT-1002',
      location: 'North Atlantic Ocean',
    });

    await commandHandlers.recordTelemetry({
      containerId: 'CNT-1002',
      temperature: 19.2,
      humidity: 60,
      shockG: 0.1,
      doorOpen: false,
      latitude: 45.0,
      longitude: -30.0,
      location: 'North Atlantic Ocean',
    });

    await commandHandlers.arriveContainer({
      containerId: 'CNT-1002',
      portName: 'New York Container Terminal',
      location: 'New York Berth 2',
    });

    await commandHandlers.unloadContainer({
      containerId: 'CNT-1002',
      location: 'New York Container Yard A',
    });

    await commandHandlers.completeDelivery({
      containerId: 'CNT-1002',
      location: 'New Jersey Distribution Center',
      recipient: 'Apex Logistics LLC',
    });

    console.log('🌱 Seeding CNT-1003 (Pharma cargo in transit)...');
    await commandHandlers.createContainer({
      containerId: 'CNT-1003',
      owner: 'BioLogistics Global',
      origin: 'Hamburg Port',
      destination: 'Dubai Jebel Ali',
      initialLocation: 'Hamburg Logistics Hub',
      initialTemperature: -20.0,
    });

    await commandHandlers.loadContainer({
      containerId: 'CNT-1003',
      vesselName: 'Hapag-Lloyd Express',
      location: 'Hamburg Terminal 1',
    });

    await commandHandlers.recordTelemetry({
      containerId: 'CNT-1003',
      temperature: -19.5,
      humidity: 40,
      shockG: 0.3,
      doorOpen: false,
      latitude: 27.8,
      longitude: 34.3,
      location: 'Suez Canal',
    });

    await commandHandlers.moveContainer({
      containerId: 'CNT-1003',
      location: 'Red Sea Transit Zone',
    });

    console.log('🔄 Rebuilding projections...');
    await rebuildAllProjections();

    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
