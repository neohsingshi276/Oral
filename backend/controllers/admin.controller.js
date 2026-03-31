const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logActivity } = require('./activity.controller');
const { sendInviteEmail, sendReminderEmail } = require('../services/email.service');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getPlayers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, s.session_name,
        MAX(CASE WHEN ca.checkpoint_number = 1 THEN ca.completed END) as cp1_completed,
        MAX(CASE WHEN ca.checkpoint_number = 1 THEN ca.attempts END) as cp1_attempts,
        MAX(CASE WHEN ca.checkpoint_number = 2 THEN ca.completed END) as cp2_completed,
        MAX(CASE WHEN ca.checkpoint_number = 2 THEN ca.attempts END) as cp2_attempts,
        MAX(CASE WHEN ca.checkpoint_number = 3 THEN ca.completed END) as cp3_completed,
        MAX(CASE WHEN ca.checkpoint_number = 3 THEN ca.attempts END) as cp3_attempts
      FROM players p
      JOIN game_sessions s ON p.session_id = s.id
      LEFT JOIN checkpoint_attempts ca ON ca.player_id = p.id
      GROUP BY p.id ORDER BY p.joined_at DESC
    `);
    res.json({ players: rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const downloadCSV = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.nickname, s.session_name, p.joined_at,
        MAX(CASE WHEN ca.checkpoint_number = 1 THEN ca.completed END) as cp1_completed,
        MAX(CASE WHEN ca.checkpoint_number = 1 THEN ca.attempts END) as cp1_attempts,
        MAX(CASE WHEN ca.checkpoint_number = 2 THEN ca.completed END) as cp2_completed,
        MAX(CASE WHEN ca.checkpoint_number = 2 THEN ca.attempts END) as cp2_attempts,
        MAX(CASE WHEN ca.checkpoint_number = 3 THEN ca.completed END) as cp3_completed,
        MAX(CASE WHEN ca.checkpoint_number = 3 THEN ca.attempts END) as cp3_attempts,
        MAX(qs.score) as quiz_score,
        MAX(qs.correct_answers) as quiz_correct,
        MAX(cp3.score) as cp3_score
      FROM players p
      JOIN game_sessions s ON p.session_id = s.id
      LEFT JOIN checkpoint_attempts ca ON ca.player_id = p.id
      LEFT JOIN quiz_scores qs ON qs.player_id = p.id
      LEFT JOIN cp3_scores cp3 ON cp3.player_id = p.id
      GROUP BY p.id ORDER BY s.session_name, p.nickname
    `);
    const headers = ['Nickname','Session','Joined At','CP1 Completed','CP1 Attempts','CP2 Completed','CP2 Attempts','CP3 Completed','CP3 Attempts','Quiz Score','Quiz Correct','Food Game Score'];
    const csvRows = [headers.join(',')];
    rows.forEach(r => {
      csvRows.push([
        r.nickname, r.session_name,
        new Date(r.joined_at).toLocaleDateString(),
        r.cp1_completed ? 'Yes' : 'No', r.cp1_attempts || 0,
        r.cp2_completed ? 'Yes' : 'No', r.cp2_attempts || 0,
        r.cp3_completed ? 'Yes' : 'No', r.cp3_attempts || 0,
        r.quiz_score || 0, r.quiz_correct || 0, r.cp3_score || 0
      ].join(','));
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=player_data.csv');
    res.send(csvRows.join('\n'));
    await logActivity(req.admin.id, 'Downloaded player data CSV');
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const getAnalytics = async (req, res) => {
  try {
    const [[{ total_players }]] = await db.query('SELECT COUNT(*) as total_players FROM players');
    const [[{ total_sessions }]] = await db.query('SELECT COUNT(*) as total_sessions FROM game_sessions');
    const [[{ cp1_completed }]] = await db.query('SELECT COUNT(*) as cp1_completed FROM checkpoint_attempts WHERE checkpoint_number=1 AND completed=1');
    const [[{ cp2_completed }]] = await db.query('SELECT COUNT(*) as cp2_completed FROM checkpoint_attempts WHERE checkpoint_number=2 AND completed=1');
    const [[{ cp3_completed }]] = await db.query('SELECT COUNT(*) as cp3_completed FROM checkpoint_attempts WHERE checkpoint_number=3 AND completed=1');
    const [players] = await db.query(`
      SELECT p.*, s.session_name,
        MAX(CASE WHEN ca.checkpoint_number = 1 THEN ca.completed END) as cp1_completed,
        MAX(CASE WHEN ca.checkpoint_number = 1 THEN ca.attempts END) as cp1_attempts,
        MAX(CASE WHEN ca.checkpoint_number = 2 THEN ca.completed END) as cp2_completed,
        MAX(CASE WHEN ca.checkpoint_number = 2 THEN ca.attempts END) as cp2_attempts,
        MAX(CASE WHEN ca.checkpoint_number = 3 THEN ca.completed END) as cp3_completed,
        MAX(CASE WHEN ca.checkpoint_number = 3 THEN ca.attempts END) as cp3_attempts
      FROM players p JOIN game_sessions s ON p.session_id = s.id
      LEFT JOIN checkpoint_attempts ca ON ca.player_id = p.id
      GROUP BY p.id ORDER BY p.joined_at DESC
    `);
    res.json({ total_players, total_sessions, cp1_completed, cp2_completed, cp3_completed, players });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const getAllAdmins = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, email, role, created_at FROM admins ORDER BY role DESC, created_at ASC');
    // Get pending invitations too
    const [invites] = await db.query('SELECT * FROM admin_invitations WHERE used = FALSE AND expires_at > NOW() ORDER BY created_at DESC');
    res.json({ admins: rows, pending_invites: invites });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// Invite new admin — send email with registration link
const inviteAdmin = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format. Must include @ and valid domain' });
  try {
    // Check if already registered
    const [existing] = await db.query('SELECT id FROM admins WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'This email is already registered as an admin' });

    // Check if already invited
    const [existingInvite] = await db.query('SELECT id FROM admin_invitations WHERE email = ? AND used = FALSE AND expires_at > NOW()', [email]);
    if (existingInvite.length > 0) return res.status(400).json({ error: 'An invitation has already been sent to this email' });

    // Generate invitation token
    const token = jwt.sign({ email, type: 'admin_invite' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.query(
      'INSERT INTO admin_invitations (email, token, expires_at) VALUES (?, ?, ?)',
      [email, token, expiresAt]
    );

    // Send invite email
    const inviteLink = `${process.env.CLIENT_URL}/admin/register?token=${token}`;
    try {
      await sendInviteEmail(email, inviteLink);
    } catch (emailErr) {
      console.error('Invite email failed:', emailErr.message);
      // Still save invitation even if email fails
    }

    await logActivity(req.admin.id, 'Sent admin invitation', `Invited: ${email}`);
    res.json({ message: 'Invitation sent to ' + email });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

// Verify invitation token and complete registration
const completeRegistration = async (req, res) => {
  const { token, name, password } = req.body;
  if (!token || !name || !password) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'admin_invite') return res.status(400).json({ error: 'Invalid invitation token' });

    // Check invitation in DB
    const [invites] = await db.query(
      'SELECT * FROM admin_invitations WHERE token = ? AND used = FALSE AND expires_at > NOW()',
      [token]
    );
    if (invites.length === 0) return res.status(400).json({ error: 'Invitation has expired or already been used' });

    const email = invites[0].email;

    // Check if already registered
    const [existing] = await db.query('SELECT id FROM admins WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'This email is already registered' });

    // Create admin account
    const password_hash = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO admins (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, password_hash, 'admin']
    );

    // Mark invitation as used
    await db.query('UPDATE admin_invitations SET used = TRUE WHERE token = ?', [token]);

    res.json({ message: 'Account created successfully! You can now login.' });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Invalid or expired invitation link' });
    }
    console.error(err); res.status(500).json({ error: 'Server error' });
  }
};

// Verify token (check if valid before showing form)
const verifyInviteToken = async (req, res) => {
  const { token } = req.params;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'admin_invite') return res.status(400).json({ error: 'Invalid token' });
    const [invites] = await db.query(
      'SELECT * FROM admin_invitations WHERE token = ? AND used = FALSE AND expires_at > NOW()',
      [token]
    );
    if (invites.length === 0) return res.status(400).json({ error: 'Invitation expired or already used' });
    res.json({ email: invites[0].email, valid: true });
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired invitation link' });
  }
};

const deleteAdmin = async (req, res) => {
  if (parseInt(req.params.id) === req.admin.id) return res.status(400).json({ error: 'Cannot delete yourself!' });
  try {
    const [rows] = await db.query('SELECT name, email FROM admins WHERE id = ?', [req.params.id]);
    await db.query('DELETE FROM admins WHERE id = ?', [req.params.id]);
    await logActivity(req.admin.id, 'Deleted admin', `Deleted: ${rows[0]?.email}`);
    res.json({ message: 'Admin deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const updateProfile = async (req, res) => {
  const { name, email } = req.body;
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });
  try {
    await db.query('UPDATE admins SET name=?, email=? WHERE id=?', [name, email, req.admin.id]);
    await logActivity(req.admin.id, 'Updated profile');
    res.json({ message: 'Profile updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
  if (new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const [rows] = await db.query('SELECT password_hash FROM admins WHERE id=?', [req.admin.id]);
    const isMatch = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE admins SET password_hash=? WHERE id=?', [hash, req.admin.id]);
    await logActivity(req.admin.id, 'Changed password');
    res.json({ message: 'Password changed successfully' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

module.exports = { getPlayers, downloadCSV, getAnalytics, getAllAdmins, inviteAdmin, completeRegistration, verifyInviteToken, deleteAdmin, updateProfile, changePassword };
