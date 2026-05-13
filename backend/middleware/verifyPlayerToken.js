const jwt = require('jsonwebtoken');

const safeId = (value) => {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const verifyPlayerToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Player token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded?.type !== 'player_chat' || !safeId(decoded.player_id) || !safeId(decoded.session_id)) {
      return res.status(401).json({ error: 'Invalid player token' });
    }

    req.playerAuth = {
      ...decoded,
      player_id: safeId(decoded.player_id),
      session_id: safeId(decoded.session_id),
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired player token' });
  }
};

module.exports = verifyPlayerToken;
