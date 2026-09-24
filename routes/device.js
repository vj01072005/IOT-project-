const express = require('express');
const db = require('../database/db');

const router = express.Router();

// Track last device ping timestamp in memory
let lastDevicePing = null;

// POST /api/device/data
// Called by ESP8266 every 10 seconds to upload sensor readings and fetch LED & LCD state
router.post('/data', async (req, res) => {
  try {
    let { temperature, humidity } = req.body;

    // Fallback to query params if sent via GET or URL-encoded
    if (temperature === undefined) temperature = req.query.temperature;
    if (humidity === undefined) humidity = req.query.humidity;

    const tempNum = parseFloat(temperature);
    const humNum = parseFloat(humidity);

    if (isNaN(tempNum) || isNaN(humNum)) {
      return res.status(400).json({
        success: false,
        error: 'Valid numeric temperature and humidity are required.'
      });
    }

    // Save sensor data
    const recordedAt = new Date().toISOString();
    await db.run(
      'INSERT INTO sensor_data (temperature, humidity, recorded_at) VALUES (?, ?, ?)',
      [tempNum, humNum, recordedAt]
    );

    lastDevicePing = Date.now();

    // Retrieve current control state to send back to ESP8266
    const state = await db.get('SELECT led_state, lcd_row1, lcd_row2 FROM device_state WHERE id = 1');

    return res.json({
      success: true,
      message: 'Telemetry received and logged',
      led: state ? state.led_state : 0,
      lcd_row1: state ? state.lcd_row1 : 'sky IoT',
      lcd_row2: state ? state.lcd_row2 : 'System Active'
    });
  } catch (err) {
    console.error('Device data logging error:', err);
    return res.status(500).json({ success: false, error: 'Database error storing sensor telemetry.' });
  }
});

// GET /api/device/status
// ESP8266 can poll this for quick real-time control updates
router.get('/status', async (req, res) => {
  try {
    lastDevicePing = Date.now();
    const state = await db.get('SELECT led_state, lcd_row1, lcd_row2 FROM device_state WHERE id = 1');
    return res.json({
      success: true,
      led: state ? state.led_state : 0,
      lcd_row1: state ? state.lcd_row1 : 'sky IoT',
      lcd_row2: state ? state.lcd_row2 : 'System Active'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve device state.' });
  }
});

// GET /api/device/ping
// Returns online/offline status of the ESP8266
router.get('/ping', (req, res) => {
  const isOnline = lastDevicePing !== null && (Date.now() - lastDevicePing < 30000); // within 30s
  return res.json({
    success: true,
    isOnline,
    lastPingMsAgo: lastDevicePing ? (Date.now() - lastDevicePing) : null,
    lastPing: lastDevicePing ? new Date(lastDevicePing).toISOString() : null
  });
});

module.exports = router;
