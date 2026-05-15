const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const db = require('./db/db');
const authRoutes = require('./routes/authRoutes');
const noteRoutes = require('./routes/noteRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const itemRoutes = require('./routes/itemRoutes');
const socialRoutes = require('./routes/socialRoutes');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api', itemRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api', socialRoutes);

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