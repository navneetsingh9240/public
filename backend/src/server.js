const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

dotenv.config();

const commandRoutes = require('./routes/commandRoutes');
const queryRoutes = require('./routes/queryRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/audittrail';
const CLIENT_URL = process.env.CLIENT_URL || '*';

// Dynamic CORS Origin Evaluator function
const corsOriginDelegate = (origin, callback) => {
  // Allow non-browser / server-to-server / curl requests with no origin
  if (!origin) return callback(null, true);

  if (CLIENT_URL === '*' || CLIENT_URL === '') return callback(null, true);

  const allowedOrigins = CLIENT_URL.split(',').map((o) => o.trim());

  if (
    allowedOrigins.includes(origin) ||
    allowedOrigins.includes('*') ||
    origin.endsWith('.netlify.app') ||
    origin.endsWith('.onrender.com') ||
    origin.includes('localhost')
  ) {
    return callback(null, true);
  }

  callback(null, true); // Permissive fallback to allow deployed frontend origins
};

// Setup Socket.IO with flexible CORS
const io = new Server(server, {
  cors: {
    origin: corsOriginDelegate,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});

app.set('io', io);

// Express Middleware
app.use(cors({ origin: corsOriginDelegate, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/commands', commandRoutes);
app.use('/api/queries', queryRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Central Error Handler
app.use(errorHandler);

// Socket.IO Connection Logging
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

const connectDB = require('./config/db');

if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 AuditTrail Backend running on port ${PORT}`);
    });
  }).catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
  });
}

module.exports = { app, server, connectDB };
