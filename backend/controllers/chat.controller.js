const db = require('../db');

const sendMessage = async (req, res) => {
  const { player_id, session_id, sender_type, message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  if (typeof message !== 'string' || message.trim().length === 0) return res.status(400).json({ error: 'Message cannot be empty' });
  if (message.length > 200) return res.status(400).json({ error: 'Message too long (max 200 characters)' });
  try {
    await db.query(
      'INSERT INTO chat_messages (player_id, session_id, sender_type, message) VALUES (?, ?, ?, ?)',
      [player_id, session_id, sender_type, message]
    );
    res.status(201).json({ message: 'Message sent' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const getMessages = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM chat_messages WHERE player_id = ? ORDER BY sent_at ASC',
      [req.params.player_id]
    );
    res.json({ messages: rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

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

module.exports = { sendMessage, getMessages, getAllChats };
