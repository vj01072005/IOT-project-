const express = require('express');
const db = require('../database/db');
const { formatKolkataTime } = require('../utils/timezone');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/sensor/latest
// Returns the most recent temperature and humidity reading
router.get('/latest', async (req, res) => {
  try {
    const latest = await db.get('SELECT * FROM sensor_data ORDER BY id DESC LIMIT 1');

    if (!latest) {
      return res.json({
        success: true,
        data: null,
        message: 'No sensor data recorded yet.'
      });
    }

    const { date, time, full } = formatKolkataTime(latest.recorded_at);

    // Calculate 24-hour min/max/avg for gauges and seek-bars
    const stats = await db.get(`
      SELECT 
        MIN(temperature) as minTemp, 
        MAX(temperature) as maxTemp, 
        ROUND(AVG(temperature), 1) as avgTemp,
        MIN(humidity) as minHum, 
        MAX(humidity) as maxHum, 
        ROUND(AVG(humidity), 1) as avgHum
      FROM sensor_data 
      WHERE recorded_at >= datetime('now', '-24 hours')
    `);

    return res.json({
      success: true,
      data: {
        id: latest.id,
        temperature: latest.temperature,
        humidity: latest.humidity,
        date,
        time,
        fullTimestamp: full,
        rawTimestamp: latest.recorded_at,
        stats: stats || {
          minTemp: latest.temperature,
          maxTemp: latest.temperature,
          avgTemp: latest.temperature,
          minHum: latest.humidity,
          maxHum: latest.humidity,
          avgHum: latest.humidity
        }
      }
    });
  } catch (err) {
    console.error('Error fetching latest sensor data:', err);
    return res.status(500).json({ success: false, error: 'Database query failed.' });
  }
});

// GET /api/sensor/records?page=1&limit=20
// Returns paginated records (latest first, 20 at a time) with Asia/Kolkata +5:30 time and date
router.get('/records', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const totalRow = await db.get('SELECT COUNT(*) as count FROM sensor_data');
    const total = totalRow ? totalRow.count : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const rows = await db.all(
      'SELECT * FROM sensor_data ORDER BY id DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const formattedRows = rows.map((r, index) => {
      const { date, time } = formatKolkataTime(r.recorded_at);
      return {
        rowNum: offset + index + 1,
        id: r.id,
        temperature: Number(r.temperature).toFixed(1),
        humidity: Number(r.humidity).toFixed(1),
        time,
        date,
        rawTimestamp: r.recorded_at
      };
    });

    return res.json({
      success: true,
      data: formattedRows,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('Error fetching records:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve sensor records.' });
  }
});

// GET /api/sensor/chart?limit=25
// Returns historical sensor data for Chart.js
router.get('/chart', async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit) || 25);
    // Fetch latest N records, then reverse so oldest is first for the graph left-to-right
    const rows = await db.all(
      'SELECT * FROM sensor_data ORDER BY id DESC LIMIT ?',
      [limit]
    );

    const chronological = rows.reverse();
    const labels = [];
    const temperatures = [];
    const humidities = [];

    chronological.forEach(row => {
      const { time } = formatKolkataTime(row.recorded_at);
      labels.push(time);
      temperatures.push(row.temperature);
      humidities.push(row.humidity);
    });

    return res.json({
      success: true,
      labels,
      temperatures,
      humidities
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve chart data.' });
  }
});

// DELETE /api/sensor/:id
// Delete a specific record by ID
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid record ID.' });
    }

    const result = await db.run('DELETE FROM sensor_data WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Record not found.' });
    }

    return res.json({ success: true, message: `Record #${id} deleted successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to delete record.' });
  }
});

// POST /api/sensor/simulate
// Helper endpoint to simulate a DHT11 reading (useful for testing UI or dashboard without hardware)
router.post('/simulate', authMiddleware, async (req, res) => {
  try {
    const baseTemp = 28 + (Math.random() * 4 - 2);
    const baseHum = 60 + (Math.random() * 10 - 5);
    const temp = +baseTemp.toFixed(1);
    const hum = +baseHum.toFixed(1);
    const recordedAt = new Date().toISOString();

    const result = await db.run(
      'INSERT INTO sensor_data (temperature, humidity, recorded_at) VALUES (?, ?, ?)',
      [temp, hum, recordedAt]
    );

    const { date, time } = formatKolkataTime(recordedAt);

    return res.json({
      success: true,
      message: 'Simulated reading added',
      data: {
        id: result.lastID,
        temperature: temp,
        humidity: hum,
        date,
        time
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Simulation failed.' });
  }
});

module.exports = router;
