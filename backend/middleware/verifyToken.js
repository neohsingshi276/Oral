// ============================================
// verifyToken.js — JWT Auth Middleware
// Protects admin-only routes
// ============================================

const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // Get token from request header
  const token = req.headers['authorization']?.split(' ')[1] || req.query.token;
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // attach admin info to request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = verifyToken;
