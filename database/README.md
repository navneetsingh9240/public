# AuditTrail Database Module

This module contains database initialization scripts, index definitions, schema specifications, and projection rebuild utilities for the **AuditTrail** Event Sourcing & CQRS platform.

---

## MongoDB Collections Overview

### 1. `events` (Authoritative Immutable Event Store)
Stores raw, immutable domain events. Modification or deletion of documents in this collection is strictly prohibited.

* **Indexes:**
  * `{ aggregateId: 1, version: 1 }` (Unique compound index enforcing OCC)
  * `{ aggregateId: 1, timestamp: 1 }` (Optimized for time-travel queries)
  * `{ eventType: 1 }` (Optimized for fleet risk analytics)
  * `{ eventId: 1 }` (Unique constraint)

### 2. `containerreadmodels` (Query-Optimized Projections)
Contains flattened state projections for fast dashboard queries. This collection is **disposable** and can be rebuilt at any time from the `events` collection.

### 3. `anchorrecords` (Polygon PoS Blockchain Receipts)
Stores cryptographic Merkle root anchoring receipts, transaction hashes, and block numbers.

---

## Utility Scripts

* **Seed Initial Data:**
  ```bash
  npm run seed
  ```
* **Rebuild Read Model Projections:**
  ```bash
  npm run rebuild-projections
  ```
* **Ensure Collection Indexes:**
  ```bash
  node database/scripts/createIndexes.js
  ```
