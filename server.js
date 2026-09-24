require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/device');
const sensorRoutes = require('./routes/sensor');
const controlRoutes = require('./routes/control');
const seed = require('./database/seed');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/sensor', sensorRoutes);
app.use('/api/control', controlRoutes);

// Health check endpoint for Render pinging / uptime monitors
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    application: 'sky',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// Route for login page explicitly if accessed directly
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Fallback to index.html for dashboard and client-side routing
app.use((req, res, next) => {
  // If request is an API route that wasn't matched, return 404 JSON
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Auto-seed if running for the first time
seed().then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`===============================================`);
    console.log(`🚀 sky IoT Server running on http://${HOST}:${PORT}`);
    console.log(`📱 Local Access: http://localhost:${PORT}`);
    console.log(`🌍 Render Ready (Environment PORT: ${process.env.PORT || 'default 3000'})`);
    console.log(`===============================================`);
  });
}).catch(err => {
  console.error('Failed to run initial seed:', err);
  app.listen(PORT, HOST, () => {
    console.log(`🚀 sky IoT Server running on http://${HOST}:${PORT} (without seed)`);
  });
});
