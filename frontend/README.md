# 🛡️ AuditTrail Frontend — Event-Sourced Logistics Dashboard

<p align="center">
  <b>AuditTrail Enterprise Logistics Audit Platform</b><br/>
  <i>Event Sourcing • CQRS • SHA-256 Hash Chaining • Real-Time Socket.IO • GIS Route Mapping</i>
</p>

---

AuditTrail's frontend is a modern, high-performance React application built for logistics managers, cold-chain operations teams, supply-chain auditors, and marine cargo inspectors. It interfaces directly with AuditTrail's Express REST Command & Query APIs and Socket.IO WebSocket stream to deliver non-repudiable, real-time auditing and historical state scrubbing.

---

## 📂 Frontend Directory Structure

```text
frontend/
├── src/
│   ├── components/
│   │   ├── AuditCertificateModal.jsx   # Printable supply-chain audit certificate export modal
│   │   ├── AuditLogExporter.jsx        # CSV and JSON event stream ledger export engine
│   │   ├── CarrierScorecard.jsx        # Carrier SLA & Duty-of-Care compliance rating card
│   │   ├── ColdChainSlaMetrics.jsx     # Thermal stability %, excursion counter, and SLA stats
│   │   ├── CommandPanel.jsx            # Write operations, Ed25519 signing, and OCC test controls
│   │   ├── ContainerSummary.jsx        # Reconstructed current state summary & commitment badge
│   │   ├── DeliverySlaIndicator.jsx    # Transit completion %, target delivery date, and SLA countdown
│   │   ├── EventCard.jsx               # Event detail card with SHA-256 hash chain inspection
│   │   ├── EventTimeline.jsx           # Vertical event stream with search & category filters
│   │   ├── FleetRiskHeatmap.jsx        # Interactive Leaflet GIS global fleet risk density map
│   │   ├── HistoricalSlider.jsx        # Time-travel scrubber with auto-replay (1x, 2x, 4x speed)
│   │   ├── IntegrityBadge.jsx          # Cryptographic SHA-256 chain, Merkle & Polygon PoS verification
│   │   ├── LocationHistory.jsx         # Chronological location route history timeline
│   │   ├── NotificationDrawer.jsx      # Real-time Socket.IO anomaly alert stream drawer
│   │   ├── RouteMap.jsx                # Interactive Leaflet GIS route tracking map with waypoints
│   │   ├── SearchBar.jsx               # Container ID search and autocomplete index selector
│   │   ├── StateDiffView.jsx           # Side-by-side historical state diff comparator
│   │   └── TemperatureChart.jsx        # Recharts cold-chain thermal time-series graph
│   ├── pages/
│   │   ├── Dashboard.jsx               # Fleet overview index, risk heatmaps, & quick metrics
│   │   └── ContainerDetails.jsx        # Full container aggregate details, timeline, & audit tools
│   ├── services/
│   │   └── api.js                      # Axios REST API service client for Commands & Queries
│   ├── App.jsx                         # Main layout, Socket.IO connection, & top header navbar
│   ├── index.css                       # Tailwind CSS directives & custom Leaflet styling
│   └── main.jsx                        # React root entry point
├── .env.example                        # Frontend environment variable configuration template
├── index.html                          # HTML entry template
├── package.json                        # Node dependencies & build scripts
└── vite.config.js                      # Vite build configuration
```

---

## 🌟 Key Frontend Features & Modules

### 🔍 1. Container Index & Search (`SearchBar.jsx`)
- Fast autocomplete search across registered reefer containers (`CNT-1001`, `CNT-1002`, `CNT-1003`).
- Instant switching between live container aggregate streams.

### 📦 2. Reconstructed Aggregate Summary (`ContainerSummary.jsx`)
- Displays state calculated directly from the event store: status, current version (`vN`), current location, temperature (°C), relative humidity (RH%), cargo lock status, and SHA-256 integrity status.
- **Carrier Duty-of-Care Commitment Badge:** Highlights today's active carrier thermal guarantee (< 8.0°C) and non-repudiable ledger status.

### ⏳ 3. Time-Travel Scrubbing & Auto-Replay (`HistoricalSlider.jsx`)
- **Version Scrubber:** Drag the slider across aggregate versions (`v1` → `vN`) to dynamically reconstruct container state at any historical point.
- **Auto-Replay Engine:** Play/Pause auto-replay with `1x`, `2x`, and `4x` speed controls to watch transit journeys unfold sequentially.

### 🔍 4. Side-by-Side State Diff Comparator (`StateDiffView.jsx`)
- Compare current aggregate state vs. historical snapshot state side-by-side.
- Highlights modified attributes (location, status, temperature, lock seal, arrival flags) with color-coded diff markers.

### 🗺️ 5. Geospatial Route Tracker & GIS Map (`RouteMap.jsx`)
- Interactive dark-mode vector map rendered via Leaflet and OpenStreetMap/CARTO tiles.
- Draws geodesic transit lines connecting waypoints (e.g., Singapore Port → Malacca Strait → Arabian Sea → Mumbai Port).
- Color-coded waypoint markers: normal transit (blue), thermal excursion locations (red), and current real-time container position (green).

### ⏱️ 6. Delivery SLA Commitment Indicator (`DeliverySlaIndicator.jsx`)
- Transit progress completion bar (`% Complete`).
- Target delivery date commitment window and live SLA countdown timer (`X Days Remaining`).

### ⚡ 7. Command Operations Engine (`CommandPanel.jsx`)
- **Domain Commands:** Issue live domain actions (`Load onto Ship`, `Update Location`, `Record Sensor Telemetry`, `Mark Arrived`, `Unload Cargo`, `Complete Delivery`).
- **Ed25519 Digital Signatures:** Toggle asymmetric carrier keypairs for digital non-repudiation.
- **Simulate OCC Conflict:** Test Optimistic Concurrency Control by submitting commands with outdated versions to trigger HTTP 409 Conflict handling.
- **Polygon PoS Blockchain Anchor:** Anchor aggregate Merkle tree roots to Polygon PoS blockchain.

### 🏆 8. Carrier Quality Scorecard (`CarrierScorecard.jsx`)
- Automated compliance scorecard grading carriers (`A+ COMPLIANT`) based on thermal stability rates, signature audit percentages, and security seal compliance.

### 📊 9. Cold-Chain Telemetry & Analytics (`TemperatureChart.jsx` & `ColdChainSlaMetrics.jsx`)
- **Recharts Line Chart:** Time-series temperature curve with threshold reference lines (8.0°C safety limit).
- **Spike Highlights:** Highlights `TEMPERATURE_SPIKE` anomaly events with red warning markers and interactive tooltips.
- **SLA Analytics:** Calculates thermal stability rate (%), excursion count, min/max/mean transit temperatures, and insurance SLA validity.

### 🔐 10. Cryptographic Audit Integrity (`IntegrityBadge.jsx`)
- Verifies SHA-256 event hash chaining (`previousHash` + `eventHash`).
- Interactive Merkle Tree proof inspector and Polygon PoS blockchain anchor receipt viewer.

### 📄 11. Audit Log Exporter & Certificate Export (`AuditLogExporter.jsx`)
- **AuditLogExporter:** Download complete cryptographic event stream ledgers as CSV or JSON files.
- **AuditCertificateModal:** Generate and print official, cryptographically verifiable supply-chain audit certificates.

### 🔔 12. Real-Time Anomaly Stream (`NotificationDrawer.jsx`)
- Interactive bell notification icon with unread badge counter in top header.
- Expandable drawer receiving real-time Socket.IO WebSocket alerts for `TEMPERATURE_SPIKE`, `DOOR_OPENED`, and `GEOFENCE_EXITED`.

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

Default configuration:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Start Development Server
```bash
npm run dev
```
The dashboard will launch at `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
```

---

## 🛠️ Technology Stack

| Technology | Purpose |
| :--- | :--- |
| **React.js (v18)** | Component-driven frontend architecture |
| **Vite** | Next-generation frontend tooling and bundler |
| **Tailwind CSS** | Dark-mode enterprise UI styling |
| **Recharts** | Responsive cold-chain thermal telemetry charts |
| **Leaflet & React-Leaflet** | Interactive geospatial route maps and fleet risk density heatmaps |
| **Lucide React** | Enterprise icon system |
| **Socket.IO Client** | Real-time event stream WebSocket synchronization |
| **Axios** | HTTP client for Express REST Command & Query APIs |
