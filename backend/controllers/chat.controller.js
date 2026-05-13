const db = require('../db');

const canTeacherAccessSession = async (teacherId, sessionId) => {
  const [rows] = await db.query(
    `SELECT s.id
     FROM game_sessions s
     WHERE s.id = ?
       AND (
         s.admin_id = ?
         OR s.id IN (
           SELECT session_id
           FROM teacher_session_access
           WHERE teacher_id = ?
         )
       )`,
    [sessionId, teacherId, teacherId]
  );
  return rows.length > 0;
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
// FIX: Teachers can only send messages to players in sessions they have access to.
const adminSendMessage = async (req, res) => {
  const { player_id, session_id, message } = req.body;
  if (!player_id || !session_id) return res.status(400).json({ error: 'player_id and session_id required' });
  if (!message) return res.status(400).json({ error: 'Message required' });
  if (typeof message !== 'string' || message.trim().length === 0) return res.status(400).json({ error: 'Message cannot be empty' });
  if (message.length > 200) return res.status(400).json({ error: 'Message too long (max 200 characters)' });
  try {
    // Verify player exists in the given session
    const [playerRows] = await db.query(
      'SELECT id FROM players WHERE id = ? AND session_id = ?',
      [player_id, session_id]
    );
    if (playerRows.length === 0) return res.status(404).json({ error: 'Player not found in this session' });

    // FIX: Teachers may only message players in sessions they have unlocked
    if (req.admin.role === 'teacher') {
      if (!(await canTeacherAccessSession(req.admin.id, session_id)))
        return res.status(403).json({ error: 'You can only message players in your own sessions' });
    }

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
// FIX: Teachers can only read messages for players in their accessible sessions.
const adminGetMessages = async (req, res) => {
  const player_id = parseInt(req.params.player_id, 10);
  try {
    // Look up this player's session
    const [playerRows] = await db.query('SELECT session_id FROM players WHERE id = ?', [player_id]);
    if (playerRows.length === 0) return res.status(404).json({ error: 'Player not found' });

    // FIX: Teachers restricted to their own sessions
    if (req.admin.role === 'teacher') {
      if (!(await canTeacherAccessSession(req.admin.id, playerRows[0].session_id)))
        return res.status(403).json({ error: 'You can only view messages in your own sessions' });
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
// FIX: Teachers only see chats from sessions they have access to.
const getAllChats = async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.admin.role === 'teacher') {
      query = `
        SELECT cm.*, p.nickname, p.session_id FROM chat_messages cm
        JOIN players p ON cm.player_id = p.id
        WHERE p.session_id IN (
          SELECT session_id FROM teacher_session_access WHERE teacher_id = ?
        )
        OR p.session_id IN (
          SELECT id FROM game_sessions WHERE admin_id = ?
        )
        ORDER BY cm.sent_at ASC
      `;
      params = [req.admin.id, req.admin.id];
    } else {
      query = `
        SELECT cm.*, p.nickname, p.session_id FROM chat_messages cm
        JOIN players p ON cm.player_id = p.id
        ORDER BY cm.sent_at ASC
      `;
    }

    const [rows] = await db.query(query, params);
    res.json({ messages: rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

module.exports = { sendMessage, adminSendMessage, getMessages, adminGetMessages, getAllChats };
