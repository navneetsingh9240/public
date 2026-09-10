# 🛡️ AuditTrail — Event-Sourced Inventory & Logistics Ledger

[![Event Sourcing](https://img.shields.io/badge/Architecture-Event%20Sourcing%20%2B%20CQRS-blue.svg)](https://martinfowler.com/eaaDev/EventSourcing.html)
[![SHA-256](https://img.shields.io/badge/Security-SHA--256%20Hash%20Chain-emerald.svg)]()
[![Merkle Proofs](https://img.shields.io/badge/Proofs-Merkle%20Tree%20%2B%20Polygon%20PoS-purple.svg)]()
[![Signatures](https://img.shields.io/badge/Non--Repudiation-Ed25519%20Digital%20Keys-indigo.svg)]()
[![Tests](https://img.shields.io/badge/Tests-16%2F16%20Passing-brightgreen.svg)]()

**AuditTrail** is an enterprise-grade logistics, cold-chain, and supply-chain audit platform engineered using **Event Sourcing**, **CQRS (Command Query Responsibility Segregation)**, **MongoDB**, **Node.js/Express**, **React**, **Recharts**, **Leaflet GIS**, and **Socket.IO**.

Unlike traditional CRUD applications that mutate records in-place and permanently destroy historical context, AuditTrail calculates all business state by replaying an **immutable, append-only event store**.

---

## 🎯 Problem vs Solution

### The Problem with Traditional CRUD
In traditional CRUD (Create, Read, Update, Delete) logistics applications:
- Overwriting database rows (`UPDATE containers SET location = 'Mumbai' WHERE id = 'CNT-1001'`) erases previous locations and temperatures.
- Malicious carriers or compromised systems can alter high-temperature records or door access logs to evade liability.
- Auditing requires intrusive trigger tables or manual log files that can be altered, lost, or bypassed.
- Historical state at an arbitrary past timestamp (e.g., *"Where was container CNT-1001 on August 14th at 02:41 AM?"*) cannot be reconstructed accurately.

### The AuditTrail Solution
AuditTrail adopts an **Event-Sourced Architecture**:
- **Immutable Ledger**: Business facts are stored as append-only domain events (`CONTAINER_CREATED`, `LOADED_ON_SHIP`, `LOCATION_UPDATED`, `TEMPERATURE_RECORDED`, `TEMPERATURE_SPIKE`, `DOOR_OPENED`, `DOOR_CLOSED`, `GEOFENCE_EXITED`, `ARRIVED_AT_PORT`, `UNLOADED`, `DELIVERY_COMPLETED`).
- **State Derivation**: `Current State = Replay(Initial State + Ordered Events)`.
- **Time Travel**: Reconstructing historical state is a matter of filtering and replaying events up to any given version or timestamp.
- **Cryptographic Hash Chain**: Every event contains an SHA-256 hash incorporating the previous event's hash (`previousHash`), forming an unforgeable, tamper-evident chain.
- **Merkle Tree & Polygon PoS Anchoring**: Batches of event hashes are aggregated into a Merkle root and anchored to the Polygon PoS blockchain for external audit proofs.
- **Ed25519 Digital Signatures**: Commands are signed using asymmetric Ed25519 carrier keypairs for legal non-repudiation.
- **CQRS & Projections**: Write operations (Commands) append to the Event Store, while optimized Read Models (`ContainerReadModel`) power high-speed dashboard queries and can be wiped and 100% rebuilt at any time from scratch (`npm run rebuild-projections`).

---

## 📐 System Architecture

```text
                                  AuditTrail System Architecture

   +-----------------------------------------------------------------------------------+
   |                                 React Frontend                                    |
   |   [Dashboard]  [Time Travel Scrubbing]  [GIS Route Map]  [Recharts Telemetry]     |
   |   [Delivery SLA Indicator]  [Carrier Scorecard]  [Notification Drawer Stream]     |
   +---------------------------------------+-------------------------------------------+
                                           |
                                  HTTP REST / WebSocket (Socket.IO)
                                           |
   +---------------------------------------v-------------------------------------------+
   |                             Node.js / Express API                                 |
   |                                                                                   |
   |    COMMAND API (Writes)                             QUERY API (Reads)             |
   |  POST /api/commands/...                           GET /api/queries/...            |
   |          |                                                |                       |
   |          v                                                v                       |
   |    Command Handlers                                 Query Handlers                |
   |    (Business Validation & Ed25519 Signatures)        (State Replay & Time Travel)  |
   |          |                                                ^                       |
   |          v                                                |                       |
   |    Event Store Engine                                     |                       |
   |    (SHA-256 Chaining & Merkle Proofs)                     |                       |
   |          |                                                |                       |
   +----------|------------------------------------------------|-----------------------+
              |                                                |
              v                                                |
   +---------------------+   Async Projection Worker   +-------+---------------+
   |   Event Store       |---------------------------->| ContainerReadModel    |
   |  (Immutable Stream) |                             |  (Query Projection)   |
   +---------------------+                             +-----------------------+
              |                                                |
              +-----------------------+------------------------+
                                      |
                                      v
                               [ MongoDB Database ]
```

---

## 🚀 Key Features

1. **Immutable Append-Only Event Store**:
   - Mongoose pre-hooks strictly block `update`, `overwrite`, `save` (for existing docs), and `delete` operations at the database level with HTTP 403 Forbidden responses.
   - Enforces sequential aggregate versions (`version: N+1`). Duplicate versions trigger HTTP `409 Conflict`.

2. **Time Travel State Scrubbing & Auto-Replay**:
   - Interactive UI slider allows managers to scrub back to any previous version or timestamp to inspect historical location, temperature, and lock status.
   - Includes an auto-replay engine (`1x`, `2x`, `4x` speeds) and side-by-side state diff comparison tool.

3. **Cryptographic SHA-256 Chaining, Merkle Proofs & Polygon Anchoring**:
   - Computes SHA-256 hash chains over immutable fields (`eventId`, `aggregateId`, `eventType`, `payload`, `timestamp`, `version`, `previousHash`).
   - Generates Merkle tree inclusion proofs and anchors Merkle roots to the Polygon PoS blockchain.
   - Endpoint `/api/queries/containers/:id/integrity` verifies unbroken chain continuity and detects tampering.

4. **Ed25519 Digital Signatures (Non-Repudiation)**:
   - Carriers digitally sign telemetry commands using asymmetric Ed25519 private keys, ensuring non-repudiation during legal or insurance disputes.

5. **Optimistic Concurrency Control (OCC)**:
   - Client sends `expectedVersion`. If the container was concurrently updated by another process, the server responds with HTTP `409 Conflict`.

6. **CQRS Read Model & Projection Rebuilding**:
   - Read models are lightweight query projections updated by `containerProjection.js`.
   - Executing `npm run rebuild-projections` wipes read models and rebuilds all projections by replaying the authoritative Event Store from scratch.

7. **Geospatial GIS Route Mapping & Fleet Heatmaps**:
   - Leaflet GIS map plots trade route waypoints (e.g., Singapore Port → Malacca Strait → Arabian Sea → Mumbai Port) with geodesic polylines, current vessel markers, and thermal excursion alerts.
   - Interactive Fleet Risk Density Heatmap displays global incident risk density.

8. **Cold-Chain Telemetry & SLA Scorecards**:
   - Recharts visualizes time-series thermal telemetry with threshold reference lines (8.0°C limit).
   - Cold-chain SLA analytics calculate thermal stability rates (%), excursion counts, and insurance validity.
   - Carrier Quality Scorecards grade carriers (`A+ COMPLIANT`) based on thermal duty, seal compliance, and signature audits.

9. **Delivery SLA Indicator & Export Engines**:
   - Progress bar tracking transit completion %, target delivery dates, and live SLA countdown timers.
   - AuditLogExporter enables direct CSV and JSON downloads of event stream ledgers.
   - AuditCertificateModal prints official supply chain audit certificates.

10. **Real-Time Anomaly Stream (Socket.IO)**:
    - Real-time notification drawer receiving instant alerts for `TEMPERATURE_SPIKE`, `DOOR_OPENED`, and `GEOFENCE_EXITED`.

---

## 📂 Repository Structure

```text
audittrail/
├── backend/
│   ├── src/
│   │   ├── config/              # Database connection & MongoMemoryServer fallback
│   │   ├── controllers/         # CQRS Command and Query controllers
│   │   ├── routes/              # Express commandRoutes and queryRoutes
│   │   ├── commands/            # Command validation and dispatch handlers
│   │   ├── queries/             # Query handlers for state replay & historical reconstruction
│   │   ├── events/              # EventStore, SHA-256 hash chaining, Merkle tree, Ed25519 keys
│   │   ├── aggregates/          # Pure aggregate fold/reducer functions (containerAggregate.js)
│   │   ├── projections/         # Projection worker updating ContainerReadModel
│   │   ├── models/              # Mongoose models (Event.js, ContainerReadModel.js, AnchorRecord.js)
│   │   ├── middleware/          # Centralized Express error handler
│   │   └── utils/               # Polygon PoS blockchain anchor simulator & Ed25519 crypto keys
│   ├── tests/                   # Jest & Supertest integration suite (audittrail.test.js)
│   ├── package.json
│   └── .env.example
├── database/
│   ├── scripts/
│   │   ├── seed.js              # Database seed script for CNT-1001, CNT-1002, CNT-1003
│   │   ├── rebuildProjections.js# Script to wipe and rebuild read model projections
│   │   └── createIndexes.js     # Indexing script for aggregateId, timestamp, and version
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components (RouteMap, Scorecard, SLA Indicators, etc.)
│   │   ├── pages/               # Dashboard index & ContainerDetails view
│   │   ├── services/            # Axios API client for Command & Query REST endpoints
│   │   └── App.jsx              # Socket.IO connection & top navbar layout
│   ├── package.json
│   └── README.md
├── README.md
└── package.json
```

---

## 📋 Event Schema

Each document in the MongoDB `events` collection follows this immutable schema:

```json
{
  "eventId": "evt_1787084429482_x8k2l9p",
  "aggregateId": "CNT-1001",
  "aggregateType": "Container",
  "eventType": "TEMPERATURE_SPIKE",
  "payload": {
    "temperature": 12.8,
    "threshold": 8.0,
    "location": "Arabian Sea",
    "humidity": 78
  },
  "timestamp": "2026-08-18T10:30:00.000Z",
  "version": 5,
  "previousHash": "a3b8c2d1e0f9...",
  "eventHash": "f8a7e6d5c4b3...",
  "signature": "3a8b...ed25519"
}
```

---

## ⚡ API Endpoints

### Command Endpoints (Writes)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/commands/containers` | Create a new container aggregate |
| `POST` | `/api/commands/containers/:id/load` | Load container onto ship |
| `POST` | `/api/commands/containers/:id/move` | Update waypoint location & GPS coordinates |
| `POST` | `/api/commands/containers/:id/temperature` | Record reefer thermal & humidity telemetry |
| `POST` | `/api/commands/containers/:id/arrive` | Mark container arrival at port |
| `POST` | `/api/commands/containers/:id/unload` | Unload container at terminal |
| `POST` | `/api/commands/containers/:id/complete` | Complete container delivery |

### Query Endpoints (Reads)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/queries/containers` | List all container read model projections |
| `GET` | `/api/queries/containers/:id` | Reconstruct current aggregate state |
| `GET` | `/api/queries/containers/:id/events` | Retrieve complete event history stream |
| `GET` | `/api/queries/containers/:id/timeline` | Get timeline-formatted event stream |
| `GET` | `/api/queries/containers/:id/state-at` | Reconstruct historical state (`?version=X` or `?timestamp=Y`) |
| `GET` | `/api/queries/containers/:id/metrics` | Retrieve temperature & sensor telemetry metrics |
| `GET` | `/api/queries/containers/:id/integrity` | Verify SHA-256 cryptographic hash chain |

---

## 📦 Quick Start Instructions

### 1. Installation
```bash
git clone <repository-url>
cd audittrail

# Install backend dependencies
npm run install:all
```

### 2. Seed Sample Database
Seed sample containers (`CNT-1001` with cold-chain temperature spike, `CNT-1002`, `CNT-1003`):
```bash
npm run seed
```

### 3. Run Development Servers
Start both backend (Port 5000) and frontend (Port 5173) concurrently:
```bash
npm run dev
```

Or run separately:
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend
```

---

## 🧪 Testing & Verification

Run the automated backend test suite covering Event Store Immutability, OCC, Replay, SHA-256 Hash Chaining, Merkle Proofs, Ed25519 Signatures, and Projection Rebuilding:

```bash
npm test
```

### Demonstration of Projection Disposability
To verify that `ContainerReadModel` is purely a disposable projection and not the authoritative source of truth:
```bash
npm run rebuild-projections
```
This command wipes the read model collection, replays all events from the authoritative Event Store sequentially, and regenerates 100% of the read model projections.

---

## 📄 License
MIT License. Built for enterprise supply chain, event-sourced ledger, and cold-chain compliance auditing.
