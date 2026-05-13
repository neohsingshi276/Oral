// ============================================
// middleware/verifyToken.js — JWT Auth Middleware
// Protects admin-only routes
// ============================================

const jwt = require('jsonwebtoken');
const db = require('../db');

const getCookie = (req, name) => {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const cookies = raw.split(';').map((part) => part.trim());
  const found = cookies.find((part) => part.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
};

const verifyToken = async (req, res, next) => {
  // FIX: Only accept token from Authorization header.
  // Removed the ?token= query-string fallback — query params appear in
  // server logs, browser history, and HTTP Referer headers, leaking credentials.
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : getCookie(req, 'admin_token');

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.jti) {
      const [blocked] = await db.query(
        'SELECT id FROM admin_token_blacklist WHERE jti = ? AND expires_at > NOW()',
        [decoded.jti]
      );
      if (blocked.length > 0) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
      }
    }
    if (decoded.token_version !== undefined) {
      const [admins] = await db.query('SELECT token_version FROM admins WHERE id = ?', [decoded.id]);
      if (admins.length === 0 || admins[0].token_version !== decoded.token_version) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
      }
    }
    req.admin = decoded;
    req.authToken = token;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = verifyToken;
