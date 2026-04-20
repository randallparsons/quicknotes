const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/db');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (email, hashed_password) VALUES (?, ?)',
      [email, hashedPassword]
    );

    res.status(201).json({
      message: 'User registered successfully',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    const passwordMatch = await bcrypt.compare(password, user.hashed_password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.email = user.email;

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error('Logout error:', error);
      return res.status(500).json({ error: 'Logout failed' });
    }

    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({
    user: {
      id: req.session.userId,
      email: req.session.email
    }
  });
});

module.exports = router;