const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { rebuildAllProjections } = require('../src/projections/containerProjection');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/audittrail';

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB at ${MONGO_URI}`);
    console.log('🔄 Rebuilding all container projections from immutable Event Store...');

    const result = await rebuildAllProjections();
    console.log(`✅ Projection rebuild complete! Rebuilt ${result.containersRebuilt} containers.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Projection rebuild failed:', err);
    process.exit(1);
  }
}

main();
