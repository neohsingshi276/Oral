// ============================================
// server.js — Express App Entry Point
// ============================================
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

// ============================================
// MIDDLEWARE
// ============================================
const allowedOrigins = [
  process.env.STUDENT_URL,
  process.env.ADMIN_URL,
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// ============================================
// ROUTES
// ============================================
app.use('/api/auth',      require('./routes/auth.routes'));
app.use('/api/videos',    require('./routes/learning.routes'));
app.use('/api/game',      require('./routes/game.routes'));
app.use('/api/sessions',  require('./routes/session.routes'));
app.use('/api/chat',      require('./routes/chat.routes'));
app.use('/api/facts',     require('./routes/facts.routes'));
app.use('/api/admin',     require('./routes/admin.routes'));
app.use('/api/email',     require('./routes/email.routes'));
app.use('/api/quiz',      require('./routes/quiz.routes'));
app.use('/api/crossword', require('./routes/crossword.routes'));
app.use('/api/cp3',       require('./routes/cp3.routes'));
app.use('/api/activity',  require('./routes/activity.routes'));

// Serve uploaded images
app.use('/uploads', express.static('uploads'));

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Dental Health App API is running' });
});

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
