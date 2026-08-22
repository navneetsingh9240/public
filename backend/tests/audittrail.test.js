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

describe('Multi-Sensor Telemetry & Geofencing Tests', () => {
  test('Records IoT sensor telemetry and triggers door access, shock breaches, and geofence events', async () => {
    await request(app)
      .post('/api/commands/containers')
      .send({ containerId: 'TEST-IOT-1', owner: 'Sensor Logistics' });

    const res = await request(app)
      .post('/api/commands/containers/TEST-IOT-1/telemetry')
      .send({
        temperature: 14.5, // Temperature spike (>8.0°C)
        humidity: 88, // Humidity spike (>75%)
        shockG: 4.2, // Cargo shock breach (>2.5G)
        doorOpen: true, // Door opened
        latitude: -75.0, // Out of bounds geofence
        longitude: 10.0,
        location: 'Indian Ocean Deep Transit',
      });

    expect(res.status).toBe(200);
    expect(res.body.state.temperature).toBe(14.5);
    expect(res.body.state.humidityStatus).toBe('WARNING');
    expect(res.body.state.maxShockG).toBe(4.2);
    expect(res.body.state.doorOpen).toBe(true);
    expect(res.body.state.geofenceBreached).toBe(true);

    const eventCount = await Event.countDocuments({ aggregateId: 'TEST-IOT-1' });
    // Expected events: 1 (CREATED) + 5 (TEMP_SPIKE, HUMIDITY_SPIKE, SHOCK, DOOR_OPENED, GEOFENCE_EXITED) = 6
    expect(eventCount).toBe(6);
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

describe('Merkle Tree & Blockchain Anchoring Tests', () => {
  test('Generates Merkle tree proof and verifies proof against aggregate events', async () => {
    await request(app)
      .post('/api/commands/containers')
      .send({ containerId: 'TEST-MERKLE-1', owner: 'Merkle Express' });

    await request(app)
      .post('/api/commands/containers/TEST-MERKLE-1/load')
      .send({ vesselName: 'Merkle Ship' });

    const proofRes = await request(app).get('/api/queries/containers/TEST-MERKLE-1/merkle-proof');
    expect(proofRes.status).toBe(200);
    expect(proofRes.body.data.root).toBeDefined();
    expect(proofRes.body.data.verified).toBe(true);
  });

  test('Anchors Merkle root to Polygon PoS blockchain and retrieves anchor receipt', async () => {
    await request(app)
      .post('/api/commands/containers')
      .send({ containerId: 'TEST-ANCHOR-1', owner: 'Anchor Corp' });

    const anchorRes = await request(app).post('/api/commands/containers/TEST-ANCHOR-1/anchor');
    expect(anchorRes.status).toBe(200);
    expect(anchorRes.body.anchor.network).toBe('Polygon PoS Mainnet');
    expect(anchorRes.body.anchor.txHash).toMatch(/^0x[a-f0-9]{64}$/);

    const queryRes = await request(app).get('/api/queries/containers/TEST-ANCHOR-1/anchor');
    expect(queryRes.status).toBe(200);
    expect(queryRes.body.count).toBe(1);
    expect(queryRes.body.data[0].txHash).toBe(anchorRes.body.anchor.txHash);
  });
});

describe('Ed25519 Asymmetric Digital Signature Tests', () => {
  const { generateCarrierKeyPair, signEventPayload } = require('../src/utils/cryptoSign');

  test('Accepts valid Ed25519 carrier signature on command execution', async () => {
    const keyPair = generateCarrierKeyPair();
    const payload = { owner: 'Carrier Corp', origin: 'Origin Port', destination: 'Destination Port', initialLocation: 'Singapore', initialTemperature: 4.0 };
    const signature = signEventPayload(payload, keyPair.privateKey);

    const res = await request(app)
      .post('/api/commands/containers')
      .send({
        containerId: 'TEST-SIG-1',
        ...payload,
        signature,
        publicKey: keyPair.publicKey,
      });

    expect(res.status).toBe(201);
    expect(res.body.event.payload._carrierSignature).toBe(signature);
  });

  test('Rejects command with invalid/tampered Ed25519 carrier signature', async () => {
    const keyPair = generateCarrierKeyPair();
    const payload = { owner: 'Carrier Corp', origin: 'Origin Port', destination: 'Destination Port', initialLocation: 'Singapore', initialTemperature: 4.0 };
    const signature = signEventPayload(payload, keyPair.privateKey);

    // Tamper payload after signing (change owner)
    const res = await request(app)
      .post('/api/commands/containers')
      .send({
        containerId: 'TEST-SIG-2',
        owner: 'TAMPERED_OWNER',
        origin: 'Origin Port',
        destination: 'Destination Port',
        initialLocation: 'Singapore',
        initialTemperature: 4.0,
        signature,
        publicKey: keyPair.publicKey,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
    expect(res.body.message).toMatch(/signature verification failed/);
  });
});

describe('Fleet Risk Analytics & Geospatial Heatmap Tests', () => {
  test('Fetches aggregated fleet risk analytics for risk events', async () => {
    await request(app)
      .post('/api/commands/containers')
      .send({ containerId: 'TEST-RISK-1', owner: 'Risk Corp' });

    await request(app)
      .post('/api/commands/containers/TEST-RISK-1/telemetry')
      .send({
        temperature: 15.0,
        humidity: 80,
        shockG: 3.5,
        location: 'Arabian Sea',
      });

    const res = await request(app).get('/api/queries/analytics/risk-heatmaps');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalIncidents).toBeGreaterThanOrEqual(2);
    expect(res.body.data.incidents[0].latitude).toBeDefined();
    expect(res.body.data.incidents[0].longitude).toBeDefined();
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
