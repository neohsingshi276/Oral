const jwt = require('jsonwebtoken');

const verifyPlayerChatToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Player chat token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded?.type !== 'player_chat' || !decoded.player_id || !decoded.session_id) {
      return res.status(401).json({ error: 'Invalid player chat token' });
    }
    req.playerChat = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired player chat token' });
  }
};

module.exports = verifyPlayerChatToken;
