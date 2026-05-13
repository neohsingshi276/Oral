const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const requiredEnv = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_NAME'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
}
if (!process.env.EMAIL_USER) {
  console.warn('EMAIL_USER is not set. Password reset and reminder emails may fail until email environment variables are configured.');
}

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

const app = express();
const { generalLimiter } = require('./middleware/rateLimiter');
const { ensureSchema } = require('./services/schema.service');

app.set('trust proxy', 1);

app.use(helmet());
app.use(generalLimiter);

const allowedOrigins = [
  process.env.STUDENT_URL,
  process.env.ADMIN_URL,
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalised = origin.replace(/\/$/, '');
    const exactMatch = allowedOrigins.map(o => o.replace(/\/$/, '')).includes(normalised);
    if (exactMatch) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/videos', require('./routes/learning.routes'));
app.use('/api/game', require('./routes/game.routes'));
app.use('/api/sessions', require('./routes/session.routes'));
app.use('/api/schools', require('./routes/school.routes'));
app.use('/api/classes', require('./routes/class.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/facts', require('./routes/facts.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/email', require('./routes/email.routes'));
app.use('/api/quiz', require('./routes/quiz.routes'));
app.use('/api/crossword', require('./routes/crossword.routes'));
app.use('/api/cp3', require('./routes/cp3.routes'));
app.use('/api/activity', require('./routes/activity.routes'));
app.use('/api/staff-chat', require('./routes/staffChat.routes'));
app.use('/api/faq', require('./routes/faq.routes'));
app.use('/uploads', express.static('uploads'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Dental Health App API is running' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
ensureSchema().finally(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
