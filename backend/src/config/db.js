const mongoose = require('mongoose');

async function connectDB(uri = process.env.MONGO_URI || 'mongodb://localhost:27017/audittrail') {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`🍃 MongoDB connected successfully at ${uri}`);
  } catch (err) {
    console.warn(`MongoDB connection to '${uri}' failed: ${err.message}`);

    try {
      console.log('Attempting MongoMemoryServer fallback for local development...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create({ instance: { port: 27017 } });
      const memoryUri = `${mongod.getUri()}audittrail`;
      await mongoose.connect(memoryUri);
      console.log(`🍃 MongoMemoryServer connected successfully at ${memoryUri}`);
    } catch (fallbackErr) {
      console.error('MongoMemoryServer fallback unavailable or failed.');
      console.error('Please ensure MONGO_URI environment variable is configured correctly in your deployment environment.');
      throw err;
    }
  }
}

module.exports = connectDB;
