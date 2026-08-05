const express = require('express');
const cors = require('cors');
const path = require('path');
const dns = require('dns');
require('dotenv').config();

// Fix Windows DNS lookup timeout (EAI_AGAIN) for Neon Cloud PostgreSQL
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  // Fallback silently if restricted
}

const { initDb } = require('./db');
const { router: authRouter } = require('./routes/auth');
const contactRouter = require('./routes/contact');
const contentRouter = require('./routes/content');
const uploadRouter = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 1337;

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or same-origin) or matching allowedOrigins
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive fallback
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Real-Time Terminal Endpoint Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const method = req.method;
    const url = req.originalUrl || req.url;
    const status = res.statusCode;

    let icon = '📡';
    if (method === 'DELETE') icon = '🗑️  [DELETED]';
    else if (method === 'POST') icon = '➕ [CREATED]';
    else if (method === 'PUT' || method === 'PATCH') icon = '✏️  [UPDATED]';
    else if (method === 'GET') icon = '🔍 [FETCHED]';

    console.log(`[API HIT] ${icon} ${method} ${url} -> Status ${status} (${duration}ms)`);
  });
  next();
});

// Serve static admin dashboard
app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

// Health check — must be before the wildcard /api content router
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/contact', contactRouter);
app.use('/api/contacts', contactRouter); // Alias for compatibility
app.use('/api', contentRouter);

// Admin dashboard route redirect
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/index.html'));
});

// Start server
async function startServer() {
  await initDb().catch(err => {
    console.warn('[DB Notice] Running with fallback memory DB:', err.message);
  });

  const server = app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 Portfolio Express Backend & Resend Email Active!`);
    console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
    console.log(`👑 Admin Dashboard: http://localhost:${PORT}/admin`);
    console.log(`==================================================\n`);
  });

  server.on('error', (err) => {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'EADDRINUSE') {
      console.warn(`[Server Notice] Port ${PORT} occupied temporarily. Exiting for clean restart...`);
      process.exit(1);
    } else {
      console.error('[Server Error]', err);
    }
  });
}

startServer();
