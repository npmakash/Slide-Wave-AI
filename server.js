/**
 * server.js — Application Entry Point
 * Google Slides Bulk Generator
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const helmet = require('helmet');
const cors = require('cors');
const fs = require('fs');

const { rateLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/auth.routes');
const generateRoutes = require('./routes/generate.routes');
const downloadRoutes = require('./routes/download.routes');
const historyRoutes = require('./routes/history.routes');
const geminiRoutes = require('./routes/gemini.routes');
const logger = require('./utils/logger');
const { scheduleCleanup } = require('./utils/cleanup');

// ─── Ensure required directories exist ───────────────────────────────────────
['uploads', 'temp', 'data', 'sessions'].forEach((dir) => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

// ─── Ensure history.json exists ───────────────────────────────────────────────
const historyFile = path.join(__dirname, 'data', 'history.json');
if (!fs.existsSync(historyFile)) fs.writeFileSync(historyFile, '[]', 'utf-8');

// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();

// Trust reverse proxy (required for HTTPS session cookies on Render, Railway, Heroku)
app.set('trust proxy', 1);

// Security headers — content-security-policy relaxed for Google APIs
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://accounts.google.com', 'https://oauth2.googleapis.com'],
        frameSrc: ["'none'"],
      },
    },
  })
);

app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Session ──────────────────────────────────────────────────────────────────
app.use(
  session({
    store: new FileStore({
      path: path.join(__dirname, 'sessions'),
      ttl: 86400, // 24 hours
    }),
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api/', rateLimiter);

// ─── Static Files ─────────────────────────────────────────────────────────────
const clientDistPath = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
} else {
  app.use(express.static(path.join(__dirname, 'public')));
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', generateRoutes);
app.use('/api', downloadRoutes);
app.use('/api', historyRoutes);
app.use('/api', geminiRoutes);

// ─── SPA Fallback ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  if (fs.existsSync(path.join(clientDistPath, 'index.html'))) {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  logger.info(`🚀 Google Slides Bulk Generator running at:`);
  logger.info(`   - Local:   http://localhost:${PORT}`);
  logger.info(`   - Network: http://10.13.104.179:${PORT}`);
  scheduleCleanup();
});

module.exports = app;
