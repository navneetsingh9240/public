const path = require('path');
const mongoose = require(path.join(__dirname, '../../backend/node_modules/mongoose'));
const dotenv = require(path.join(__dirname, '../../backend/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const Event = require('../../backend/src/models/Event');
const ContainerReadModel = require('../../backend/src/models/ContainerReadModel');
const AnchorRecord = require('../../backend/src/models/AnchorRecord');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/audittrail';

async function createIndexes() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB at ${MONGO_URI}`);

    console.log('⚡ Creating MongoDB indexes for Event Store...');
    await Event.createIndexes();

    console.log('⚡ Creating MongoDB indexes for Read Models & Anchor Records...');
    await ContainerReadModel.createIndexes();
    await AnchorRecord.createIndexes();

    console.log('✅ MongoDB indexes created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create indexes:', err);
    process.exit(1);
  }
}

createIndexes();
