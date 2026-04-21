// ============================================
// server.js — Express App Entry Point
// ============================================
const express = require('express');
const cors    = require('cors');
const dotenv  = require('dotenv');
const fs      = require('fs');
dotenv.config();

// Ensure uploads folder exists on every boot (Railway ephemeral filesystem fix)
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

const app = express();
const { generalLimiter } = require('./middleware/rateLimiter');

// ============================================
// CORS — FIX: Handle OPTIONS preflight BEFORE rate limiter,
// and support wildcard Vercel preview URLs via regex
// ============================================

const allowedOrigins = [
  process.env.STUDENT_URL,
  process.env.ADMIN_URL,
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);

// Allow any *.vercel.app subdomain for preview deployments
const vercelPreviewRegex = /^https:\/\/[a-zA-Z0-9-]+-[a-zA-Z0-9]+-[a-zA-Z0-9-]+\.vercel\.app$/;

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow Vercel preview deployment URLs
    if (vercelPreviewRegex.test(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200, // Some browsers (IE11) choke on 204
};

// FIX: Handle preflight OPTIONS requests BEFORE the rate limiter
// so CORS headers are always sent on preflight
app.options('*', cors(corsOptions));

// Apply rate limiter AFTER OPTIONS handling
app.use(generalLimiter);
app.use(cors(corsOptions));

app.use(express.json({ limit: '1mb' }));

// ============================================
// ROUTES
// ============================================
app.use('/api/auth',       require('./routes/auth.routes'));
app.use('/api/videos',     require('./routes/learning.routes'));
app.use('/api/game',       require('./routes/game.routes'));
app.use('/api/sessions',   require('./routes/session.routes'));
app.use('/api/chat',       require('./routes/chat.routes'));
app.use('/api/facts',      require('./routes/facts.routes'));
app.use('/api/admin',      require('./routes/admin.routes'));
app.use('/api/email',      require('./routes/email.routes'));
app.use('/api/quiz',       require('./routes/quiz.routes'));
app.use('/api/crossword',  require('./routes/crossword.routes'));
app.use('/api/cp3',        require('./routes/cp3.routes'));
app.use('/api/activity',   require('./routes/activity.routes'));
app.use('/api/staff-chat', require('./routes/staffChat.routes'));

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
  // FIX: Return CORS error as JSON not plain text
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS: Origin not allowed' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
