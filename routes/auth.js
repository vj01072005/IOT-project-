const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    // Check if user already exists
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [trimmedEmail]);
    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await db.run(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [trimmedName, trimmedEmail, hashedPassword]
    );

    const user = { id: result.lastID, name: trimmedName, email: trimmedEmail };
    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Query user
    const user = await db.get('SELECT * FROM users WHERE email = ?', [trimmedEmail]);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const userData = { id: user.id, name: user.name, email: user.email };
    const token = generateToken(userData);

    return res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: userData
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.get('SELECT id, name, email, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve user profile.' });
  }
});

module.exports = router;
