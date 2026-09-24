const express = require('express');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const { formatKolkataTime } = require('../utils/timezone');

const router = express.Router();

// GET /api/control/state
// Returns current LED and LCD states
router.get('/state', async (req, res) => {
  try {
    const state = await db.get('SELECT * FROM device_state WHERE id = 1');
    if (!state) {
      return res.json({
        success: true,
        data: {
          led_state: 0,
          lcd_row1: 'Welcome to sky',
          lcd_row2: 'IoT System Ready',
          updated_at: new Date().toISOString()
        }
      });
    }

    const { date, time } = formatKolkataTime(state.updated_at);

    return res.json({
      success: true,
      data: {
        led_state: state.led_state,
        lcd_row1: state.lcd_row1 || '',
        lcd_row2: state.lcd_row2 || '',
        updated_at: state.updated_at,
        formatted_date: date,
        formatted_time: time
      }
    });
  } catch (err) {
    console.error('Error fetching control state:', err);
    return res.status(500).json({ success: false, error: 'Database error.' });
  }
});

// POST /api/control/lcd
// Updates the LCD 16x2 text (Row 1 and Row 2)
router.post('/lcd', authMiddleware, async (req, res) => {
  try {
    let { row1 = '', row2 = '' } = req.body;

    // Truncate to maximum 16 characters for 16x2 LCD display
    row1 = String(row1).substring(0, 16);
    row2 = String(row2).substring(0, 16);

    const now = new Date().toISOString();

    await db.run(
      `UPDATE device_state 
       SET lcd_row1 = ?, lcd_row2 = ?, updated_at = ? 
       WHERE id = 1`,
      [row1, row2, now]
    );

    return res.json({
      success: true,
      message: 'LCD display updated successfully!',
      lcd: {
        row1,
        row2,
        updated_at: now
      }
    });
  } catch (err) {
    console.error('Error updating LCD:', err);
    return res.status(500).json({ success: false, error: 'Failed to update LCD display.' });
  }
});

// POST /api/control/led
// Toggles or sets the LED ON (1) or OFF (0)
router.post('/led', authMiddleware, async (req, res) => {
  try {
    let { state } = req.body;

    // If state is not explicitly given, toggle current state
    if (state === undefined) {
      const current = await db.get('SELECT led_state FROM device_state WHERE id = 1');
      state = current && current.led_state === 1 ? 0 : 1;
    } else {
      state = state === true || state === 1 || state === '1' || state === 'on' ? 1 : 0;
    }

    const now = new Date().toISOString();

    await db.run(
      `UPDATE device_state 
       SET led_state = ?, updated_at = ? 
       WHERE id = 1`,
      [state, now]
    );

    return res.json({
      success: true,
      message: `LED turned ${state === 1 ? 'ON' : 'OFF'} successfully!`,
      led_state: state,
      updated_at: now
    });
  } catch (err) {
    console.error('Error toggling LED:', err);
    return res.status(500).json({ success: false, error: 'Failed to update LED state.' });
  }
});

module.exports = router;
