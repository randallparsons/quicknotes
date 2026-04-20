const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const db = require('./db/db');
const authRoutes = require('./routes/authRoutes');
const noteRoutes = require('./routes/noteRoutes');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60
  }
}));

app.use('/api', authRoutes);
app.use('/api', noteRoutes);

app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    res.json({
      message: 'Backend is connected!',
      dbResult: rows[0].result
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});