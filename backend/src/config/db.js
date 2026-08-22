const mongoose = require('mongoose');

async function connectDB(uri = process.env.MONGO_URI || 'mongodb://localhost:27017/audittrail') {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log(`🍃 MongoDB connected successfully at ${uri}`);
  } catch (err) {
    console.log('Local MongoDB connection failed. Starting MongoMemoryServer fallback...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create({ instance: { port: 27017 } });
    const memoryUri = `${mongod.getUri()}audittrail`;
    await mongoose.connect(memoryUri);
    console.log(`🍃 MongoMemoryServer connected successfully at ${memoryUri}`);
  }
}

module.exports = connectDB;
