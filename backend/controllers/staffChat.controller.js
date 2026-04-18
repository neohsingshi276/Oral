// ============================================================
// controllers/staffChat.controller.js
// Admin ↔ Admin (staff) chat
// All admins can message Main Admin to report technical issues.
// Main Admin can reply to any admin.
// ============================================================

const db = require('../db');

// Ensure the table exists (runs once on first use — idempotent)
const ensureTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS staff_messages (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      sender_id   INT NOT NULL,
      receiver_id INT NOT NULL,
      message     TEXT NOT NULL,
      is_read     BOOLEAN DEFAULT FALSE,
      sent_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id)   REFERENCES admins(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES admins(id) ON DELETE CASCADE
    )
  `);
};

// ─── getConversation ─────────────────────────────────────────
// Returns all messages between the requesting admin and a target admin.
// Both participants can fetch the thread.
const getConversation = async (req, res) => {
  await ensureTable();
  const myId     = req.admin.id;
  const otherId  = parseInt(req.params.admin_id, 10);
  if (!otherId || isNaN(otherId)) return res.status(400).json({ error: 'Invalid admin_id' });

  try {
    const [rows] = await db.query(`
      SELECT sm.*, 
             a_sender.name   AS sender_name,
             a_sender.role   AS sender_role,
             a_recv.name     AS receiver_name
      FROM staff_messages sm
      JOIN admins a_sender ON a_sender.id = sm.sender_id
      JOIN admins a_recv   ON a_recv.id   = sm.receiver_id
      WHERE (sm.sender_id = ? AND sm.receiver_id = ?)
         OR (sm.sender_id = ? AND sm.receiver_id = ?)
      ORDER BY sm.sent_at ASC
    `, [myId, otherId, otherId, myId]);

    // Mark messages sent TO me as read
    await db.query(
      `UPDATE staff_messages SET is_read = TRUE WHERE receiver_id = ? AND sender_id = ?`,
      [myId, otherId]
    );

    res.json({ messages: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── sendMessage ─────────────────────────────────────────────
const sendMessage = async (req, res) => {
  await ensureTable();
  const senderId   = req.admin.id;
  const { receiver_id, message } = req.body;

  if (!receiver_id) return res.status(400).json({ error: 'receiver_id required' });
  if (!message || typeof message !== 'string' || message.trim().length === 0)
    return res.status(400).json({ error: 'Message cannot be empty' });
  if (message.length > 500)
    return res.status(400).json({ error: 'Message too long (max 500 characters)' });
  if (senderId === parseInt(receiver_id, 10))
    return res.status(400).json({ error: 'Cannot message yourself' });

  try {
    // Verify receiver exists
    const [recv] = await db.query('SELECT id FROM admins WHERE id = ?', [receiver_id]);
    if (recv.length === 0) return res.status(404).json({ error: 'Admin not found' });

    await db.query(
      'INSERT INTO staff_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
      [senderId, parseInt(receiver_id, 10), message.trim()]
    );
    res.status(201).json({ message: 'Sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── getContacts ─────────────────────────────────────────────
// Returns the list of admins this admin can chat with,
// plus unread count and last message preview for each.
const getContacts = async (req, res) => {
  await ensureTable();
  const myId = req.admin.id;

  try {
    // All other admins
    const [admins] = await db.query(
      'SELECT id, name, role FROM admins WHERE id != ? ORDER BY role DESC, name ASC',
      [myId]
    );

    // Unread counts (messages sent to me, unread, grouped by sender)
    const [unreads] = await db.query(`
      SELECT sender_id, COUNT(*) AS cnt
      FROM staff_messages
      WHERE receiver_id = ? AND is_read = FALSE
      GROUP BY sender_id
    `, [myId]);
    const unreadMap = {};
    unreads.forEach(r => { unreadMap[r.sender_id] = r.cnt; });

    // Last message per contact
    const [lasts] = await db.query(`
      SELECT
        IF(sender_id = ?, receiver_id, sender_id) AS contact_id,
        message, sent_at
      FROM staff_messages
      WHERE sender_id = ? OR receiver_id = ?
      ORDER BY sent_at DESC
    `, [myId, myId, myId]);
    const lastMap = {};
    lasts.forEach(r => {
      if (!lastMap[r.contact_id]) lastMap[r.contact_id] = r;
    });

    const contacts = admins.map(a => ({
      ...a,
      unread: unreadMap[a.id] || 0,
      lastMessage: lastMap[a.id]?.message || null,
      lastTime:    lastMap[a.id]?.sent_at  || null,
    }));

    res.json({ contacts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getConversation, sendMessage, getContacts };
