const path = require('path');
const mongoose = require(path.join(__dirname, '../../backend/node_modules/mongoose'));
const dotenv = require(path.join(__dirname, '../../backend/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const { rebuildAllProjections } = require('../../backend/src/projections/containerProjection');

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
