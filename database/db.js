const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'sky.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log(`Connected to SQLite database at: ${dbPath}`);
  }
});

// Enable WAL mode for better concurrency and performance
db.run('PRAGMA journal_mode = WAL');

// Initialize tables
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sensor Data table
  db.run(`
    CREATE TABLE IF NOT EXISTS sensor_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      temperature REAL NOT NULL,
      humidity REAL NOT NULL,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Device State table (Single record singleton for LED & LCD)
  db.run(`
    CREATE TABLE IF NOT EXISTS device_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      led_state INTEGER DEFAULT 0,
      lcd_row1 TEXT DEFAULT 'Welcome to sky',
      lcd_row2 TEXT DEFAULT 'IoT System Ready',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ensure singleton row in device_state
  db.run(`
    INSERT OR IGNORE INTO device_state (id, led_state, lcd_row1, lcd_row2, updated_at)
    VALUES (1, 0, 'Welcome to sky', 'IoT System Ready', CURRENT_TIMESTAMP)
  `);
});

// Promisified DB helpers
const dbAsync = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  },

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },

  db
};

module.exports = dbAsync;
