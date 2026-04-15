const db = require('../db');

// ─── sendMessage (player) ─────────────────────────────────────────────────────
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

// ─── sendAdminMessage ────────────────────────────────────────────────────────
// Called from admin dashboard — req.admin is set by verifyToken middleware
const sendAdminMessage = async (req, res) => {
  const { player_id, session_id, message } = req.body;
  if (!player_id || !session_id) return res.status(400).json({ error: 'player_id and session_id required' });
  if (!message || typeof message !== 'string' || message.trim().length === 0)
    return res.status(400).json({ error: 'Message required' });
  if (message.length > 200) return res.status(400).json({ error: 'Message too long (max 200 characters)' });
  try {
    const [playerRows] = await db.query('SELECT id FROM players WHERE id = ? AND session_id = ?', [player_id, session_id]);
    if (playerRows.length === 0) return res.status(403).json({ error: 'Invalid player or session' });

    await db.query(
      'INSERT INTO chat_messages (player_id, session_id, sender_type, message) VALUES (?, ?, ?, ?)',
      [player_id, session_id, 'admin', message.trim()]
    );
    res.status(201).json({ message: 'Message sent' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ─── getMessages (player self) ────────────────────────────────────────────────
const getMessages = async (req, res) => {
  const player_id = parseInt(req.params.player_id, 10);
  const { requester_player_id, session_id } = req.query;

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

// ─── getAdminMessages ────────────────────────────────────────────────────────
// Admin fetches messages for a specific player — protected by verifyToken
const getAdminMessages = async (req, res) => {
  const player_id = parseInt(req.params.player_id, 10);
  if (!player_id) return res.status(400).json({ error: 'Invalid player ID' });
  try {
    const [rows] = await db.query(
      'SELECT * FROM chat_messages WHERE player_id = ? ORDER BY sent_at ASC',
      [player_id]
    );
    res.json({ messages: rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ─── getAllChats ──────────────────────────────────────────────────────────────
const getAllChats = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT cm.*, p.nickname FROM chat_messages cm
      JOIN players p ON cm.player_id = p.id
      ORDER BY cm.sent_at DESC
    `);
    res.json({ messages: rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ─── Admin-to-Admin chat (Main Admin <-> Admin reporting) ─────────────────────
const sendAdminInternalMessage = async (req, res) => {
  const { message, to_admin_id } = req.body;
  const from_admin_id = req.admin.id;
  if (!message || typeof message !== 'string' || message.trim().length === 0)
    return res.status(400).json({ error: 'Message required' });
  if (message.length > 500) return res.status(400).json({ error: 'Message too long (max 500 characters)' });
  try {
    await db.query(
      'INSERT INTO admin_messages (from_admin_id, to_admin_id, message) VALUES (?, ?, ?)',
      [from_admin_id, to_admin_id || null, message.trim()]
    );
    res.status(201).json({ message: 'Message sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getAdminInternalMessages = async (req, res) => {
  const admin_id = req.admin.id;
  const role = req.admin.role;
  try {
    let rows;
    if (role === 'main_admin') {
      // Main admin sees ALL admin messages
      [rows] = await db.query(`
        SELECT am.*, 
          a1.name AS from_name, a1.role AS from_role,
          a2.name AS to_name
        FROM admin_messages am
        JOIN admins a1 ON am.from_admin_id = a1.id
        LEFT JOIN admins a2 ON am.to_admin_id = a2.id
        ORDER BY am.sent_at ASC
      `);
    } else {
      // Regular admin sees messages they sent or were sent to them
      [rows] = await db.query(`
        SELECT am.*, 
          a1.name AS from_name, a1.role AS from_role,
          a2.name AS to_name
        FROM admin_messages am
        JOIN admins a1 ON am.from_admin_id = a1.id
        LEFT JOIN admins a2 ON am.to_admin_id = a2.id
        WHERE am.from_admin_id = ? OR am.to_admin_id = ? OR am.to_admin_id IS NULL
        ORDER BY am.sent_at ASC
      `, [admin_id, admin_id]);
    }
    res.json({ messages: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  sendMessage, sendAdminMessage,
  getMessages, getAdminMessages, getAllChats,
  sendAdminInternalMessage, getAdminInternalMessages
};
