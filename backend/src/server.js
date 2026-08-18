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
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

// Middleware
app.use(cors({ origin: CLIENT_URL }));
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

let isConnected = false;
async function connectDB(uri = MONGO_URI) {
  if (isConnected) return;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    isConnected = true;
    console.log(`🍃 MongoDB connected successfully at ${uri}`);
  } catch (err) {
    console.log('Local MongoDB connection failed. Starting MongoMemoryServer fallback...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create({ instance: { port: 27017 } });
    const memoryUri = `${mongod.getUri()}audittrail`;
    await mongoose.connect(memoryUri);
    isConnected = true;
    console.log(`🍃 MongoMemoryServer connected successfully at ${memoryUri}`);
  }
}

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
