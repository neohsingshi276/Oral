const db = require('../db');

// ─── Helper: resolve which session IDs this admin can access ─────────────────
// main_admin / admin → all sessions (returns null = no filter)
// teacher → only sessions in teacher_session_access
const getAccessibleSessionIds = async (adminId, role) => {
  if (role === 'main_admin' || role === 'admin') return null; // null = unrestricted
  const [rows] = await db.query(
    'SELECT session_id FROM teacher_session_access WHERE teacher_id = ?',
    [adminId]
  );
  return rows.map(r => r.session_id); // may be empty array
};

// ─── sendMessage (players only) ───────────────────────────────────────────────
const sendMessage = async (req, res) => {
  const player_id = parseInt(req.playerChat?.player_id, 10);
  const session_id = parseInt(req.playerChat?.session_id, 10);
  const { message } = req.body;
  if (!player_id || !session_id) return res.status(401).json({ error: 'Invalid player chat token' });
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

// ─── adminSendMessage ─────────────────────────────────────────────────────────
// Teachers can only reply to players in their own sessions.
const adminSendMessage = async (req, res) => {
  const { player_id, session_id, message } = req.body;
  if (!player_id || !session_id) return res.status(400).json({ error: 'player_id and session_id required' });
  if (!message) return res.status(400).json({ error: 'Message required' });
  if (typeof message !== 'string' || message.trim().length === 0) return res.status(400).json({ error: 'Message cannot be empty' });
  if (message.length > 200) return res.status(400).json({ error: 'Message too long (max 200 characters)' });
  try {
    const sessionIds = await getAccessibleSessionIds(req.admin.id, req.admin.role);
    if (sessionIds !== null && !sessionIds.includes(parseInt(session_id, 10))) {
      return res.status(403).json({ error: 'Access denied: you do not have access to this session' });
    }
    const [playerRows] = await db.query(
      'SELECT id FROM players WHERE id = ? AND session_id = ?',
      [player_id, session_id]
    );
    if (playerRows.length === 0) return res.status(404).json({ error: 'Player not found in this session' });
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
  const session_id = parseInt(req.playerChat?.session_id, 10);
  const tokenPlayerId = parseInt(req.playerChat?.player_id, 10);
  if (!player_id || player_id !== tokenPlayerId || !session_id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const [playerRows] = await db.query(
      'SELECT id FROM players WHERE id = ? AND session_id = ?',
      [player_id, session_id]
    );
    if (playerRows.length === 0) return res.status(403).json({ error: 'Access denied' });
    const [rows] = await db.query(
      'SELECT * FROM chat_messages WHERE player_id = ? ORDER BY sent_at ASC',
      [player_id]
    );
    res.json({ messages: rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ─── adminGetMessages ─────────────────────────────────────────────────────────
// Teachers can only read messages for players in their own sessions.
const adminGetMessages = async (req, res) => {
  const player_id = parseInt(req.params.player_id, 10);
  try {
    const sessionIds = await getAccessibleSessionIds(req.admin.id, req.admin.role);
    if (sessionIds !== null) {
      const placeholders = sessionIds.length ? sessionIds.map(() => '?').join(',') : 'NULL';
      const [playerRows] = await db.query(
        `SELECT id FROM players WHERE id = ? AND session_id IN (${placeholders})`,
        [player_id, ...sessionIds]
      );
      if (playerRows.length === 0) return res.status(403).json({ error: 'Access denied: player not in your sessions' });
    }
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

// ─── getAllChats ──────────────────────────────────────────────────────────────
// Teachers only see messages from their own sessions.
// main_admin / admin see everything.
const getAllChats = async (req, res) => {
  try {
    const sessionIds = await getAccessibleSessionIds(req.admin.id, req.admin.role);
    let query, params;
    if (sessionIds === null) {
      // Unrestricted — admin / main_admin sees all
      query = `
        SELECT cm.*, p.nickname, p.session_id FROM chat_messages cm
        JOIN players p ON cm.player_id = p.id
        ORDER BY cm.sent_at ASC
      `;
      params = [];
    } else if (sessionIds.length === 0) {
      // Teacher with no sessions unlocked yet — return empty
      return res.json({ messages: [] });
    } else {
      // Teacher — only their sessions
      const placeholders = sessionIds.map(() => '?').join(',');
      query = `
        SELECT cm.*, p.nickname, p.session_id FROM chat_messages cm
        JOIN players p ON cm.player_id = p.id
        WHERE cm.session_id IN (${placeholders})
        ORDER BY cm.sent_at ASC
      `;
      params = sessionIds;
    }
    const [rows] = await db.query(query, params);
    res.json({ messages: rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

module.exports = { sendMessage, adminSendMessage, getMessages, adminGetMessages, getAllChats };