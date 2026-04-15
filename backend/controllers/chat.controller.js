const db = require('../db');

// ─── sendMessage (players only) ───────────────────────────────────────────────
// sender_type is always forced to 'player' — players cannot spoof admin messages.
const sendMessage = async (req, res) => {
  const { player_id, session_id, message } = req.body;
  if (!player_id || !session_id) return res.status(400).json({ error: 'player_id and session_id required' });
  if (!message) return res.status(400).json({ error: 'Message required' });
  if (typeof message !== 'string' || message.trim().length === 0) return res.status(400).json({ error: 'Message cannot be empty' });
  if (message.length > 200) return res.status(400).json({ error: 'Message too long (max 200 characters)' });
  try {
    const [playerRows] = await db.query('SELECT id FROM players WHERE id = ? AND session_id = ?', [player_id, session_id]);
    if (playerRows.length === 0) return res.status(403).json({ error: 'Invalid player or session' });

    await db.query(
      'INSERT INTO chat_messages (player_id, session_id, sender_type, message) VALUES (?, ?, ?, ?)',
      [player_id, session_id, 'player', message.trim()]
    );
    res.status(201).json({ message: 'Message sent' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ─── adminSendMessage (admin only, requires JWT via verifyToken) ───────────────
const adminSendMessage = async (req, res) => {
  const { player_id, session_id, message } = req.body;
  if (!player_id || !session_id) return res.status(400).json({ error: 'player_id and session_id required' });
  if (!message) return res.status(400).json({ error: 'Message required' });
  if (typeof message !== 'string' || message.trim().length === 0) return res.status(400).json({ error: 'Message cannot be empty' });
  if (message.length > 200) return res.status(400).json({ error: 'Message too long (max 200 characters)' });
  try {
    const [playerRows] = await db.query('SELECT id FROM players WHERE id = ?', [player_id]);
    if (playerRows.length === 0) return res.status(404).json({ error: 'Player not found' });

    await db.query(
      'INSERT INTO chat_messages (player_id, session_id, sender_type, message) VALUES (?, ?, ?, ?)',
      [player_id, session_id, 'admin', message.trim()]
    );
    res.status(201).json({ message: 'Message sent' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ─── getMessages (player self-read only) ─────────────────────────────────────
const getMessages = async (req, res) => {
  const player_id = parseInt(req.params.player_id, 10);
  const { requester_player_id } = req.query;

  if (!requester_player_id || parseInt(requester_player_id, 10) !== player_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM chat_messages WHERE player_id = ? ORDER BY sent_at ASC',
      [player_id]
    );
    res.json({ messages: rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ─── adminGetMessages (admin read, requires JWT) ──────────────────────────────
const adminGetMessages = async (req, res) => {
  const player_id = parseInt(req.params.player_id, 10);
  try {
    const [rows] = await db.query(
      `SELECT cm.*, p.nickname
       FROM chat_messages cm
       JOIN players p ON cm.player_id = p.id
       WHERE cm.player_id = ?
       ORDER BY cm.sent_at ASC`,
      [player_id]
    );
    res.json({ messages: rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ─── getAllChats (admin, requires JWT) ────────────────────────────────────────
const getAllChats = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT cm.*, p.nickname, p.session_id FROM chat_messages cm
      JOIN players p ON cm.player_id = p.id
      ORDER BY cm.sent_at DESC
    `);
    res.json({ messages: rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

module.exports = { sendMessage, adminSendMessage, getMessages, adminGetMessages, getAllChats };
