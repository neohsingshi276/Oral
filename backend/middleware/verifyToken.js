// ============================================
// middleware/verifyToken.js — JWT Auth Middleware
// Protects admin-only routes
// ============================================

const jwt = require('jsonwebtoken');
const db = require('../db');

// FIX: verifyToken now validates the token_version claim (tv) against the
// current value stored in the admins table. Calling logout or resetting a
// password increments token_version in the DB, which immediately invalidates
// all previously issued tokens — no token blacklist table needed.
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // FIX: Check token_version — if the DB version is higher than what's in
    // the token, the token was issued before the last logout/password-reset
    // and must be rejected.
    const [rows] = await db.query(
      'SELECT token_version FROM admins WHERE id = ?',
      [decoded.id]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Admin not found.' });
    }
    const currentVersion = rows[0].token_version || 0;
    const tokenVersion = decoded.tv ?? 0;
    if (tokenVersion < currentVersion) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = verifyToken;