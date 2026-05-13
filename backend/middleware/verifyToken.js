// ============================================
// middleware/verifyToken.js — JWT Auth Middleware
// Protects admin-only routes
// ============================================

const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // FIX: Only accept token from Authorization header.
  // Removed the ?token= query-string fallback — query params appear in
  // server logs, browser history, and HTTP Referer headers, leaking credentials.
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = verifyToken;
