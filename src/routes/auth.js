const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-admin-key-portfolio';

// Default Admin credentials (can be overridden via env)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const isValidUser = username === ADMIN_USERNAME;
  const isValidPass = password === ADMIN_PASSWORD || bcrypt.compareSync(password, bcrypt.hashSync(ADMIN_PASSWORD, 8));

  if (!isValidUser || !isValidPass) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({
    success: true,
    token,
    user: { username }
  });
});

/**
 * GET /api/auth/me
 */
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({ success: true, user: decoded });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
});

// Middleware for protecting admin API endpoints
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Token required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Forbidden: Token invalid or expired.' });
  }
}

module.exports = {
  router,
  authenticateToken
};
