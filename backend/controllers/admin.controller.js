const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logActivity } = require('./activity.controller');
const { sendInviteEmail, sendReminderEmail } = require('../services/email.service');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildRoleScopedFilters = (req, allowed = {}) => {
  const where = [];
  const params = [];

  if (req.admin.role === 'teacher') {
    where.push('s.admin_id = ?');
    params.push(req.admin.id);
  } else {
    if (allowed.school && req.query.school) {
      where.push('a.school = ?');
      params.push(req.query.school);
    }
    if (allowed.teacher_id && req.query.teacher_id) {
      where.push('a.id = ?');
      params.push(req.query.teacher_id);
    }
  }

  if (allowed.session_id && req.query.session_id) {
    where.push('s.id = ?');
    params.push(req.query.session_id);
  }
  if (allowed.month && req.query.month) {
    where.push('(s.session_month = ? OR (s.session_month IS NULL AND MONTH(p.joined_at) = ?))');
    params.push(req.query.month, req.query.month);
  }

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params
  };
};

const playerSelect = `
  SELECT p.*, s.session_name, s.session_month, a.name as admin_name, a.school,
    MAX(CASE WHEN ca.checkpoint_number = 1 THEN ca.completed END) as cp1_completed,
    MAX(CASE WHEN ca.checkpoint_number = 1 THEN ca.attempts  END) as cp1_attempts,
    MAX(CASE WHEN ca.checkpoint_number = 2 THEN ca.completed END) as cp2_completed,
    MAX(CASE WHEN ca.checkpoint_number = 2 THEN ca.attempts  END) as cp2_attempts,
    MAX(CASE WHEN ca.checkpoint_number = 3 THEN ca.completed END) as cp3_completed,
    MAX(CASE WHEN ca.checkpoint_number = 3 THEN ca.attempts  END) as cp3_attempts,
    MAX(qs.score)            as quiz_score,
    MAX(qs.correct_answers)  as quiz_correct,
    MAX(qs.total_questions)  as quiz_total,
    MAX(cp3s.score)          as cp3_score
  FROM players p
  JOIN game_sessions s ON p.session_id = s.id
  JOIN admins a ON s.admin_id = a.id
  LEFT JOIN checkpoint_attempts ca ON ca.player_id = p.id
  LEFT JOIN quiz_scores qs          ON qs.player_id = p.id
  LEFT JOIN cp3_scores cp3s         ON cp3s.player_id = p.id
`;

// ─── getPlayers ───────────────────────────────────────────────────────────────
const getPlayers = async (req, res) => {
  try {
    const filters = buildRoleScopedFilters(req, { school: true, teacher_id: true, session_id: true, month: true });
    const [rows] = await db.query(`
      ${playerSelect}
      ${filters.clause}
      GROUP BY p.id ORDER BY p.joined_at DESC
    `, filters.params);
    res.json({ players: rows });
  } catch (err) {
    console.error('Get players error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── downloadCSV ──────────────────────────────────────────────────────────────
const downloadCSV = async (req, res) => {
  try {
    const filters = buildRoleScopedFilters(req, { school: true, teacher_id: true, session_id: true, month: true });
    const [rows] = await db.query(`
      ${playerSelect}
      ${filters.clause}
      GROUP BY p.id ORDER BY s.session_name, p.nickname
    `, filters.params);

    const headers = [
      'Nickname', 'School', 'Teacher', 'Session', 'Joined At',
      'CP1 Completed', 'CP1 Attempts',
      'CP2 Completed', 'CP2 Attempts',
      'CP3 Completed', 'CP3 Attempts',
      'Quiz Score', 'Quiz Correct', 'Food Game Score'
    ];

    const csvEscape = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const csvRows = [headers.map(csvEscape).join(',')];
    rows.forEach(r => {
      csvRows.push([
        r.nickname, r.school || '', r.admin_name || '', r.session_name,
        new Date(r.joined_at).toLocaleDateString(),
        r.cp1_completed ? 'Yes' : 'No', r.cp1_attempts || 0,
        r.cp2_completed ? 'Yes' : 'No', r.cp2_attempts || 0,
        r.cp3_completed ? 'Yes' : 'No', r.cp3_attempts || 0,
        r.quiz_score || 0, r.quiz_correct || 0, r.cp3_score || 0
      ].map(csvEscape).join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=player_data.csv');
    res.send(csvRows.join('\n'));
    await logActivity(req.admin.id, 'Downloaded player data CSV');
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── getAnalytics ─────────────────────────────────────────────────────────────
const getAnalytics = async (req, res) => {
  try {
    const filters = buildRoleScopedFilters(req, { school: true, teacher_id: true, session_id: true, month: true });
    const [players] = await db.query(`
      ${playerSelect}
      ${filters.clause}
      GROUP BY p.id ORDER BY p.joined_at DESC
    `, filters.params);

    const sessionIds = [...new Set(players.map(p => p.session_id))];
    const total_players = players.length;
    const total_sessions = sessionIds.length;
    const cp1_completed = players.filter(p => p.cp1_completed).length;
    const cp2_completed = players.filter(p => p.cp2_completed).length;
    const cp3_completed = players.filter(p => p.cp3_completed).length;

    res.json({ total_players, total_sessions, cp1_completed, cp2_completed, cp3_completed, players });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getSessionComparison = async (req, res) => {
  const { session_a, session_b } = req.query;
  if (!session_a || !session_b)
    return res.status(400).json({ error: 'session_a and session_b are required' });

  try {
    const [sessions] = await db.query(
      `SELECT s.id, s.session_name, s.session_month, s.created_at, a.name as admin_name, a.school, s.admin_id
       FROM game_sessions s
       JOIN admins a ON s.admin_id = a.id
       WHERE s.id IN (?, ?)`,
      [session_a, session_b]
    );

    if (sessions.length !== 2)
      return res.status(404).json({ error: 'One or both sessions were not found' });
    if (req.admin.role === 'teacher' && sessions.some(s => s.admin_id !== req.admin.id))
      return res.status(403).json({ error: 'Teachers can only compare their own sessions' });

    const [players] = await db.query(`
      ${playerSelect}
      WHERE s.id IN (?, ?)
      GROUP BY p.id ORDER BY p.joined_at DESC
    `, [session_a, session_b]);

    const summarize = (session) => {
      const group = players.filter(p => p.session_id === session.id);
      const total = group.length;
      const rate = count => total ? Math.round((count / total) * 100) : 0;
      const cp1 = group.filter(p => p.cp1_completed).length;
      const cp2 = group.filter(p => p.cp2_completed).length;
      const cp3 = group.filter(p => p.cp3_completed).length;
      return {
        session: {
          ...session,
          month: session.session_month || new Date(session.created_at).getMonth() + 1
        },
        players: group,
        summary: {
          players: total,
          cp1_completed: cp1,
          cp2_completed: cp2,
          cp3_completed: cp3,
          cp1_rate: rate(cp1),
          cp2_rate: rate(cp2),
          cp3_rate: rate(cp3)
        }
      };
    };

    res.json({ comparison: sessions.map(summarize) });
  } catch (err) {
    console.error('Compare sessions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── getAllAdmins ─────────────────────────────────────────────────────────────
const getAllAdmins = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, role, school, created_at FROM admins ORDER BY role DESC, created_at ASC'
    );
    const [invites] = await db.query(
      'SELECT * FROM admin_invitations WHERE used = FALSE AND expires_at > NOW() ORDER BY created_at DESC'
    );
    res.json({ admins: rows, pending_invites: invites });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── inviteAdmin ──────────────────────────────────────────────────────────────
const inviteAdmin = async (req, res) => {
  if (!['main_admin', 'admin'].includes(req.admin.role))
    return res.status(403).json({ error: 'You do not have permission to invite users' });

  const { email, role, school } = req.body;
  const inviteRole = ['admin', 'teacher'].includes(role) ? role : 'admin';
  const cleanSchool = typeof school === 'string' ? school.trim() : '';
  if (!email || typeof email !== 'string')
    return res.status(400).json({ error: 'Email required' });
  if (email.length > 120)
    return res.status(400).json({ error: 'Email too long (max 120 characters)' });
  if (!emailRegex.test(email))
    return res.status(400).json({ error: 'Invalid email format. Must include @ and valid domain' });
  if (inviteRole === 'teacher' && !cleanSchool)
    return res.status(400).json({ error: 'School is required when inviting a teacher' });
  if (cleanSchool.length > 255)
    return res.status(400).json({ error: 'School name too long (max 255 characters)' });

  try {
    const [existing] = await db.query('SELECT id FROM admins WHERE email = ?', [email]);
    if (existing.length > 0)
      return res.status(400).json({ error: 'This email is already registered as an admin' });

    const [existingInvite] = await db.query(
      'SELECT id FROM admin_invitations WHERE email = ? AND used = FALSE AND expires_at > NOW()', [email]
    );
    if (existingInvite.length > 0)
      return res.status(400).json({ error: 'An invitation has already been sent to this email' });

    const token = jwt.sign({ email, type: 'admin_invite', role: inviteRole, school: cleanSchool || null }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.query(
      'INSERT INTO admin_invitations (email, token, role, school, expires_at) VALUES (?, ?, ?, ?, ?)',
      [email, token, inviteRole, cleanSchool || null, expiresAt]
    );

    const inviteBaseUrl = process.env.ADMIN_URL || process.env.CLIENT_URL;
    const inviteLink = `${inviteBaseUrl}/admin/register?token=${token}`;
    try {
      await sendInviteEmail(email, inviteLink);
    } catch (emailErr) {
      console.error('Invite email failed:', emailErr.message);
    }

    await logActivity(req.admin.id, 'Sent admin invitation', `Invited: ${email}`);
    res.json({ message: 'Invitation sent to ' + email });
  } catch (err) {
    console.error('Invite admin error:', err.code, err.message, err.sqlMessage || '');
    res.status(500).json({ error: err.sqlMessage || 'Server error' });
  }
};

// ─── completeRegistration ─────────────────────────────────────────────────────
const completeRegistration = async (req, res) => {
  const { token, name, password } = req.body;

  if (!token || !name || !password)
    return res.status(400).json({ error: 'All fields required' });
  if (typeof name !== 'string' || name.trim().length === 0)
    return res.status(400).json({ error: 'Invalid name' });
  if (name.trim().length > 80)
    return res.status(400).json({ error: 'Name too long (max 80 characters)' });
  if (typeof password !== 'string' || password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (password.length > 128)
    return res.status(400).json({ error: 'Password too long (max 128 characters)' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'admin_invite')
      return res.status(400).json({ error: 'Invalid invitation token' });

    const [invites] = await db.query(
      'SELECT * FROM admin_invitations WHERE token = ? AND used = FALSE AND expires_at > NOW()',
      [token]
    );
    if (invites.length === 0)
      return res.status(400).json({ error: 'Invitation has expired or already been used' });

    const email = invites[0].email;
    const [existing] = await db.query('SELECT id FROM admins WHERE email = ?', [email]);
    if (existing.length > 0)
      return res.status(400).json({ error: 'This email is already registered' });

    const inviteRole = invites[0].role || decoded.role || 'admin';
    const inviteSchool = invites[0].school || decoded.school || null;
    const password_hash = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO admins (name, email, password_hash, role, school) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email, password_hash, inviteRole, inviteSchool]
    );
    await db.query('UPDATE admin_invitations SET used = TRUE WHERE token = ?', [token]);

    res.json({ message: 'Account created successfully! You can now login.' });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Invalid or expired invitation link' });
    }
    console.error('Complete registration error:', err.code, err.message, err.sqlMessage || '');
    res.status(500).json({ error: err.sqlMessage || 'Server error' });
  }
};

// ─── verifyInviteToken ────────────────────────────────────────────────────────
const verifyInviteToken = async (req, res) => {
  const { token } = req.params;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'admin_invite')
      return res.status(400).json({ error: 'Invalid token' });

    const [invites] = await db.query(
      'SELECT * FROM admin_invitations WHERE token = ? AND used = FALSE AND expires_at > NOW()',
      [token]
    );
    if (invites.length === 0)
      return res.status(400).json({ error: 'Invitation expired or already used' });

    res.json({ email: invites[0].email, role: invites[0].role || decoded.role || 'admin', school: invites[0].school || decoded.school || null, valid: true });
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired invitation link' });
  }
};

// ─── deleteAdmin ──────────────────────────────────────────────────────────────
const deleteAdmin = async (req, res) => {
  // Only main_admin is allowed to remove other admins
  if (req.admin.role !== 'main_admin')
    return res.status(403).json({ error: 'Only the Main Admin can remove admins' });

  const targetId = parseInt(req.params.id, 10);
  if (!targetId || targetId <= 0)
    return res.status(400).json({ error: 'Invalid admin ID' });
  if (targetId === req.admin.id)
    return res.status(400).json({ error: 'Cannot delete yourself!' });

  try {
    const [rows] = await db.query('SELECT name, email, role FROM admins WHERE id = ?', [targetId]);
    if (rows.length === 0)
      return res.status(404).json({ error: 'Admin not found' });
    if (rows[0].role === 'main_admin')
      return res.status(403).json({ error: 'Cannot delete the main admin account' });

    await db.query('DELETE FROM admins WHERE id = ?', [targetId]);
    // FIX: Deactivate sessions belonging to the deleted admin so players
    // can't join orphaned sessions and leaderboard queries don't break.
    await db.query('UPDATE game_sessions SET is_active = FALSE WHERE admin_id = ?', [targetId]);
    await logActivity(req.admin.id, 'Deleted admin', `Deleted: ${rows[0].email}`);
    res.json({ message: 'Admin deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── updateProfile ────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  const { name, email } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0)
    return res.status(400).json({ error: 'Name required' });
  if (name.trim().length > 80)
    return res.status(400).json({ error: 'Name too long (max 80 characters)' });
  if (!email || typeof email !== 'string' || email.length > 120)
    return res.status(400).json({ error: 'Invalid email' });
  if (!emailRegex.test(email))
    return res.status(400).json({ error: 'Invalid email format' });

  try {
    const [existing] = await db.query(
      'SELECT id FROM admins WHERE email = ? AND id != ?', [email, req.admin.id]
    );
    if (existing.length > 0)
      return res.status(400).json({ error: 'Email already in use by another admin' });

    await db.query('UPDATE admins SET name=?, email=? WHERE id=?', [name.trim(), email, req.admin.id]);
    await logActivity(req.admin.id, 'Updated profile');
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── changePassword ───────────────────────────────────────────────────────────
const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password)
    return res.status(400).json({ error: 'Both passwords required' });
  if (typeof new_password !== 'string' || new_password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (new_password.length > 128)
    return res.status(400).json({ error: 'New password too long (max 128 characters)' });
  if (typeof current_password !== 'string' || current_password.length > 128)
    return res.status(400).json({ error: 'Current password too long' });

  try {
    const [rows] = await db.query('SELECT password_hash FROM admins WHERE id=?', [req.admin.id]);
    const isMatch = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!isMatch)
      return res.status(400).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE admins SET password_hash=? WHERE id=?', [hash, req.admin.id]);
    await logActivity(req.admin.id, 'Changed password');
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── resendInvite ─────────────────────────────────────────────────────────────
const resendInvite = async (req, res) => {
  if (!['main_admin', 'admin'].includes(req.admin.role))
    return res.status(403).json({ error: 'You do not have permission to resend invitations' });

  try {
    const [invites] = await db.query(
      'SELECT * FROM admin_invitations WHERE id = ? AND used = FALSE AND expires_at > NOW()',
      [req.params.id]
    );
    if (invites.length === 0)
      return res.status(404).json({ error: 'Invitation not found or already used' });

    const invite = invites[0];
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const inviteRole = invite.role || 'admin';
    const token = jwt.sign({ email: invite.email, type: 'admin_invite', role: inviteRole, school: invite.school || null }, process.env.JWT_SECRET, { expiresIn: '7d' });

    await db.query(
      'UPDATE admin_invitations SET token = ?, expires_at = ? WHERE id = ?',
      [token, newExpiry, invite.id]
    );

    const inviteBaseUrl = process.env.ADMIN_URL || process.env.CLIENT_URL;
    const inviteLink = `${inviteBaseUrl}/admin/register?token=${token}`;
    try {
      await sendInviteEmail(invite.email, inviteLink);
    } catch (e) {
      console.error('Resend email failed:', e.message);
    }

    res.json({ message: 'Invitation resent!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── cancelInvite ─────────────────────────────────────────────────────────────
// FIX: Added a check so only main_admin can cancel any invite;
// regular admins can only cancel invites they created (if we track that),
// or we restrict to main_admin only to keep it simple and safe.
const cancelInvite = async (req, res) => {
  // FIX: Enforce role check — only main_admin can cancel invitations
  if (req.admin.role !== 'main_admin')
    return res.status(403).json({ error: 'Only the main admin can cancel invitations' });

  try {
    const [invites] = await db.query(
      'SELECT id FROM admin_invitations WHERE id = ?', [req.params.id]
    );
    if (invites.length === 0)
      return res.status(404).json({ error: 'Invitation not found' });

    await db.query('DELETE FROM admin_invitations WHERE id = ?', [req.params.id]);
    res.json({ message: 'Invitation cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── deletePlayer ─────────────────────────────────────────────────────────────
// main_admin, admin, and teacher can all remove players and their data.
const deletePlayer = async (req, res) => {
  if (!['main_admin', 'admin', 'teacher'].includes(req.admin.role))
    return res.status(403).json({ error: 'You do not have permission to delete players' });

  const targetId = parseInt(req.params.id, 10);
  if (!targetId || targetId <= 0)
    return res.status(400).json({ error: 'Invalid player ID' });

  try {
    const [rows] = await db.query(
      `SELECT p.nickname, p.session_id, s.admin_id
       FROM players p
       JOIN game_sessions s ON p.session_id = s.id
       WHERE p.id = ?`,
      [targetId]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Player not found' });
    if (req.admin.role === 'teacher' && rows[0].admin_id !== req.admin.id)
      return res.status(403).json({ error: 'Teachers can only delete players from their own sessions' });

    await db.query('DELETE FROM players WHERE id = ?', [targetId]);
    await logActivity(req.admin.id, 'Deleted player', `Deleted player: ${rows[0].nickname} (id ${targetId})`);
    res.json({ message: 'Player deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── updateAdminRole ──────────────────────────────────────────────────────────
// Only main_admin can change another admin's role (admin ↔ teacher).
const updateAdminRole = async (req, res) => {
  if (req.admin.role !== 'main_admin')
    return res.status(403).json({ error: 'Only the Main Admin can change roles' });

  const targetId = parseInt(req.params.id, 10);
  if (!targetId || targetId <= 0)
    return res.status(400).json({ error: 'Invalid admin ID' });
  if (targetId === req.admin.id)
    return res.status(400).json({ error: 'Cannot change your own role' });

  const { role } = req.body;
  if (!['admin', 'teacher'].includes(role))
    return res.status(400).json({ error: 'Role must be "admin" or "teacher"' });

  try {
    const [rows] = await db.query('SELECT name, email, role FROM admins WHERE id = ?', [targetId]);
    if (rows.length === 0)
      return res.status(404).json({ error: 'Admin not found' });
    if (rows[0].role === 'main_admin')
      return res.status(403).json({ error: 'Cannot change the role of another main admin' });
    if (rows[0].role === role)
      return res.json({ message: `${rows[0].name} is already a ${role}` });

    await db.query('UPDATE admins SET role = ? WHERE id = ?', [role, targetId]);
    await logActivity(req.admin.id, 'Changed admin role', `Changed ${rows[0].email} from ${rows[0].role} to ${role}`);
    res.json({ message: `${rows[0].name}'s role changed to ${role === 'teacher' ? 'Teacher' : 'Admin'}` });
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getPlayers, downloadCSV, getAnalytics, getSessionComparison,
  getAllAdmins, inviteAdmin, resendInvite, cancelInvite,
  completeRegistration, verifyInviteToken,
  deleteAdmin, deletePlayer, updateProfile, changePassword,
  updateAdminRole
};
