const db = require('../db');
const { sendReminderEmail } = require('../services/email.service');

const sendReminder = async (req, res) => {
  const { to_admin_id, to_email, to_name, subject, message } = req.body;
  if (!to_admin_id || !subject || !message) return res.status(400).json({ error: 'All fields required' });
  if (typeof subject !== 'string' || subject.trim().length === 0) return res.status(400).json({ error: 'Subject cannot be empty' });
  if (subject.length > 150) return res.status(400).json({ error: 'Subject too long (max 150 characters)' });
  if (typeof message !== 'string' || message.trim().length === 0) return res.status(400).json({ error: 'Message cannot be empty' });
  if (message.length > 2000) return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
  if (to_admin_id === 'custom' && (!to_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to_email))) {
    return res.status(400).json({ error: 'Valid recipient email required' });
  }
  try {
    const [sender] = await db.query('SELECT name, role FROM admins WHERE id = ?', [req.admin.id]);
    if (sender[0]?.role !== 'main_admin') return res.status(403).json({ error: 'Only Main Admin can send reminders' });

    if (to_admin_id === 'all') {
      const [admins] = await db.query('SELECT id, name, email FROM admins WHERE id != ?', [req.admin.id]);
      for (const admin of admins) {
        await db.query(
          'INSERT INTO email_reminders (from_admin_id, to_admin_id, subject, message) VALUES (?,?,?,?)',
          [req.admin.id, admin.id, subject, message]
        );
        // Send real email
        try { await sendReminderEmail(admin.email, admin.name, subject, message, sender[0].name); }
        catch (e) { console.error('Email send failed for', admin.email, e.message); }
      }
      res.json({ message: `Reminder sent to ${admins.length} admin(s)!` });
    } else if (to_admin_id === 'custom') {
      try {
        await sendReminderEmail(to_email, to_name || 'Staff', subject, message, sender[0].name);
      } catch (e) {
        console.error('Email send failed:', e.message);
        return res.status(500).json({ error: 'Failed to send email' });
      }
      res.json({ message: 'Email sent!' });
    } else {
      const [toAdmin] = await db.query('SELECT name, email FROM admins WHERE id = ?', [to_admin_id]);
      if (toAdmin.length === 0) return res.status(404).json({ error: 'Admin not found' });
      await db.query(
        'INSERT INTO email_reminders (from_admin_id, to_admin_id, subject, message) VALUES (?,?,?,?)',
        [req.admin.id, to_admin_id, subject, message]
      );
      try { await sendReminderEmail(toAdmin[0].email, toAdmin[0].name, subject, message, sender[0].name); }
      catch (e) { console.error('Email send failed:', e.message); }
      res.json({ message: 'Reminder sent!' });
    }
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

const getMyReminders = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT er.*, a.name as from_name FROM email_reminders er
      JOIN admins a ON er.from_admin_id = a.id
      WHERE er.to_admin_id = ? ORDER BY er.created_at DESC
    `, [req.admin.id]);
    res.json({ reminders: rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const markRead = async (req, res) => {
  try {
    await db.query('UPDATE email_reminders SET is_read = TRUE WHERE id = ? AND to_admin_id = ?', [req.params.id, req.admin.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const getSentReminders = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT er.*, a.name as to_name FROM email_reminders er
      JOIN admins a ON er.to_admin_id = a.id
      WHERE er.from_admin_id = ? ORDER BY er.created_at DESC
    `, [req.admin.id]);
    res.json({ reminders: rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

module.exports = { sendReminder, getMyReminders, markRead, getSentReminders };
