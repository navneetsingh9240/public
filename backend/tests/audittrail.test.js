const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../src/server');
const Event = require('../src/models/Event');
const ContainerReadModel = require('../src/models/ContainerReadModel');
const { rebuildAllProjections } = require('../src/projections/containerProjection');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  if (mongoose.connection.db) {
    await mongoose.connection.collection('events').deleteMany({});
    await mongoose.connection.collection('containerreadmodels').deleteMany({});
  }
});

describe('AuditTrail Event Store Immutability Tests', () => {
  test('New events can be appended successfully', async () => {
    const res = await request(app)
      .post('/api/commands/containers')
      .send({ containerId: 'TEST-1', owner: 'Test Corp', initialLocation: 'Port A' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.event.version).toBe(1);

    const count = await Event.countDocuments({ aggregateId: 'TEST-1' });
    expect(count).toBe(1);
  });

  test('Existing events CANNOT be updated via Mongoose', async () => {
    await request(app)
      .post('/api/commands/containers')
      .send({ containerId: 'TEST-2', owner: 'Test Corp' });

    const event = await Event.findOne({ aggregateId: 'TEST-2' });
    expect(event).not.toBeNull();

    let errCaught = null;
    try {
      event.eventType = 'TAMPERED_EVENT';
      await event.save();
    } catch (err) {
      errCaught = err;
    }

    expect(errCaught).not.toBeNull();
    expect(errCaught.message).toMatch(/Immutable Event Store/);
  });

  test('Existing events CANNOT be deleted via Mongoose model methods', async () => {
    await request(app)
      .post('/api/commands/containers')
      .send({ containerId: 'TEST-3', owner: 'Test Corp' });

    let errCaught = null;
    try {
      await Event.deleteOne({ aggregateId: 'TEST-3' });
    } catch (err) {
      errCaught = err;
    }

    expect(errCaught).not.toBeNull();
    expect(errCaught.message).toMatch(/Immutable Event Store/);
  });

  test('Duplicate event versions for the same aggregate are rejected', async () => {
    await request(app)
      .post('/api/commands/containers')
      .send({ containerId: 'TEST-4', owner: 'Test Corp' });

    // Try creating duplicate event with version 1 directly
    const duplicateEvent = new Event({
      eventId: 'evt_duplicate',
      aggregateId: 'TEST-4',
      aggregateType: 'Container',
      eventType: 'LOADED_ON_SHIP',
      payload: {},
      timestamp: new Date(),
      version: 1, // duplicate version
      previousHash: 'abc',
      eventHash: 'def',
    });

    let errCaught = null;
    try {
      await duplicateEvent.save();
    } catch (err) {
      errCaught = err;
    }

    expect(errCaught).not.toBeNull();
  });
});

describe('Optimistic Concurrency Control (OCC) Tests', () => {
  test('Accepts command when expectedVersion matches current version', async () => {
    const res1 = await request(app)
      .post('/api/commands/containers')
      .send({ containerId: 'TEST-OCC-1', owner: 'Test Corp' });

    expect(res1.body.event.version).toBe(1);

    const res2 = await request(app)
      .post('/api/commands/containers/TEST-OCC-1/load')
      .send({ vesselName: 'Ship A', expectedVersion: 1 });

    expect(res2.status).toBe(200);
    expect(res2.body.event.version).toBe(2);
  });

  test('Rejects command with 409 Conflict when expectedVersion does NOT match', async () => {
    await request(app)
      .post('/api/commands/containers')
      .send({ containerId: 'TEST-OCC-2', owner: 'Test Corp' });

    // Send command with outdated expectedVersion: 0 instead of 1
    const res = await request(app)
      .post('/api/commands/containers/TEST-OCC-2/load')
      .send({ vesselName: 'Ship A', expectedVersion: 0 });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('ConcurrencyError');
    expect(res.body.expectedVersion).toBe(0);
    expect(res.body.currentVersion).toBe(1);
  });
});

describe('Aggregate Replay & Historical Time Travel Tests', () => {
  test('Reconstructs current state and historical state at version or timestamp', async () => {
    await request(app)
      .post('/api/commands/containers')
      .send({ containerId: 'TEST-TT-1', owner: 'Test Corp', initialLocation: 'Location 1' });

    await request(app)
      .post('/api/commands/containers/TEST-TT-1/load')
      .send({ vesselName: 'Ship 1', location: 'Location 1' });

    await request(app)
      .post('/api/commands/containers/TEST-TT-1/move')
      .send({ location: 'Location 2' });

    // Current reconstructed state (version 3)
    const resCurrent = await request(app).get('/api/queries/containers/TEST-TT-1');
    expect(resCurrent.status).toBe(200);
    expect(resCurrent.body.data.currentVersion).toBe(3);
    expect(resCurrent.body.data.currentLocation).toBe('Location 2');

    // Historical state at version 1
    const resHist1 = await request(app).get('/api/queries/containers/TEST-TT-1/state-at?version=1');
    expect(resHist1.status).toBe(200);
    expect(resHist1.body.data.state.currentVersion).toBe(1);
    expect(resHist1.body.data.state.status).toBe('CREATED');

    // Historical state at version 2
    const resHist2 = await request(app).get('/api/queries/containers/TEST-TT-1/state-at?version=2');
    expect(resHist2.status).toBe(200);
    expect(resHist2.body.data.state.currentVersion).toBe(2);
    expect(resHist2.body.data.state.loaded).toBe(true);
  });
});

describe('Cryptographic Event Hash Chain & Integrity Verification Tests', () => {
  test('Valid hash chain passes integrity verification', async () => {
    await request(app)
      .post('/api/commands/containers')
      .send({ containerId: 'TEST-HASH-1', owner: 'Test Corp' });

    await request(app)
      .post('/api/commands/containers/TEST-HASH-1/load')
      .send({ vesselName: 'Ship Hash' });

    const res = await request(app).get('/api/queries/containers/TEST-HASH-1/integrity');
    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(true);
    expect(res.body.data.eventsChecked).toBe(2);
  });

  test('Detects tampering if an event hash or previous hash is invalidated', async () => {
    await request(app)
      .post('/api/commands/containers')
      .send({ containerId: 'TEST-HASH-2', owner: 'Test Corp' });

    await request(app)
      .post('/api/commands/containers/TEST-HASH-2/load')
      .send({ vesselName: 'Ship Hash' });

    // Bypassing Mongoose middleware directly via native collection to simulate external database tampering
    await mongoose.connection.collection('events').updateOne(
      { aggregateId: 'TEST-HASH-2', version: 2 },
      { $set: { 'payload.vesselName': 'TAMPERED_VESSEL_NAME' } }
    );

    const res = await request(app).get('/api/queries/containers/TEST-HASH-2/integrity');
    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(false);
    expect(res.body.data.brokenAtVersion).toBe(2);
  });
});

describe('Projection Worker & Read Model Rebuild Tests', () => {
  test('Rebuilding projections from Event Store accurately recreates ContainerReadModel', async () => {
    await request(app)
      .post('/api/commands/containers')
      .send({ containerId: 'TEST-PROJ-1', owner: 'Test Corp', initialLocation: 'Origin' });

    await request(app)
      .post('/api/commands/containers/TEST-PROJ-1/load')
      .send({ vesselName: 'Ship Express' });

    // Clear read model manually
    await mongoose.connection.collection('containerreadmodels').deleteMany({});
    let readCount = await ContainerReadModel.countDocuments({});
    expect(readCount).toBe(0);

    // Rebuild projection from immutable event store
    const result = await rebuildAllProjections();
    expect(result.containersRebuilt).toBe(1);

    const doc = await ContainerReadModel.findOne({ containerId: 'TEST-PROJ-1' });
    expect(doc).not.toBeNull();
    expect(doc.loaded).toBe(true);
    expect(doc.vesselName).toBe('Ship Express');
  });
});
