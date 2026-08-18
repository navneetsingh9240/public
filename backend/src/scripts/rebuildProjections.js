const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const { rebuildAllProjections } = require('../projections/containerProjection');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/audittrail';

async function runRebuild() {
  try {
    let mongoUri = MONGO_URI;
    // Fallback to in-memory server if local mongod is not reachable directly
    if (process.env.USE_MEMORY_DB === 'true') {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      mongoUri = mongod.getUri();
    }

    await mongoose.connect(mongoUri);
    console.log(`Connected to MongoDB for rebuild at: ${mongoUri}`);

    await rebuildAllProjections();
    await mongoose.disconnect();
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Error rebuilding projections:', err);
    process.exit(1);
  }
}

runRebuild();
