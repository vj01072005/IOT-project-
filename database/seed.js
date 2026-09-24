const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    // 1. Create default demo user if not exists
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', ['admin@sky.iot']);
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('sky12345', 10);
      await db.run(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        ['Admin User', 'admin@sky.iot', hashedPassword]
      );
      console.log('✅ Demo user created: admin@sky.iot / sky12345');
    } else {
      console.log('ℹ️ Demo user already exists.');
    }

    // 2. Check if sensor_data has records
    const countRow = await db.get('SELECT COUNT(*) as count FROM sensor_data');
    if (countRow.count === 0) {
      console.log('📊 Seeding initial sensor data records...');
      const now = Date.now();
      const stmt = "INSERT INTO sensor_data (temperature, humidity, recorded_at) VALUES (?, ?, ?)";

      // Generate 25 records spaced 10 seconds apart
      for (let i = 24; i >= 0; i--) {
        const timeOffset = now - i * 10 * 1000;
        const recordedAt = new Date(timeOffset).toISOString();
        // Realistic fluctuating ambient temperature (26 - 31°C) and humidity (50 - 68%)
        const temp = +(28.0 + Math.sin(i / 3) * 2.5 + (Math.random() * 0.6 - 0.3)).toFixed(1);
        const hum = +(58.0 + Math.cos(i / 3) * 6.0 + (Math.random() * 1.0 - 0.5)).toFixed(1);

        await db.run(stmt, [temp, hum, recordedAt]);
      }
      console.log('✅ 25 initial sensor records seeded.');
    } else {
      console.log(`ℹ️ Sensor data already has ${countRow.count} records.`);
    }

    console.log('🎉 Seeding completed successfully!');
  } catch (err) {
    console.error('❌ Error during seeding:', err);
  }
}

if (require.main === module) {
  seed().then(() => process.exit(0));
}

module.exports = seed;
