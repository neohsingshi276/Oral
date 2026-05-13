const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { sendOTPEmail } = require('../services/email.service');

// ─── Shared helpers ───────────────────────────────────────────────────────────
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const setAdminCookie = (res, token) => {
  res.cookie('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearAdminCookie = (res) => {
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
};

// ─── register ─────────────────────────────────────────────────────────────────
// Only allowed when NO admins exist yet (first-time bootstrap).
// After that, all admin creation must go through the invite flow.
const register = async (req, res) => {
  try {
    const [count] = await db.query('SELECT COUNT(*) as cnt FROM admins');
    if (count[0].cnt > 0)
      return res.status(403).json({ error: 'Registration is closed. Use the invite link sent by the main admin.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }

  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

  if (typeof name !== 'string' || name.trim().length === 0)
    return res.status(400).json({ error: 'Invalid name' });
  if (name.trim().length > 80)
    return res.status(400).json({ error: 'Name too long (max 80 characters)' });
  if (typeof email !== 'string' || email.length > 120)
    return res.status(400).json({ error: 'Email too long (max 120 characters)' });
  if (!emailRegex.test(email))
    return res.status(400).json({ error: 'Invalid email format' });
  if (typeof password !== 'string' || password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (password.length > 128)
    return res.status(400).json({ error: 'Password too long (max 128 characters)' });

  try {
    const [existing] = await db.query('SELECT id FROM admins WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO admins (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email, password_hash, 'main_admin']
    );
    res.status(201).json({ message: 'Main admin registered', adminId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── login ────────────────────────────────────────────────────────────────────
// FIX: Return a single generic error for both "no email" and "wrong password"
// to prevent email enumeration attacks.
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (typeof email !== 'string' || email.length > 120)
    return res.status(400).json({ error: 'Invalid email' });
  if (typeof password !== 'string' || password.length > 128)
    return res.status(400).json({ error: 'Invalid password' });

  try {
    const [rows] = await db.query('SELECT * FROM admins WHERE email = ?', [email]);
    // Generic message — do not reveal whether the email exists
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role, token_version: admin.token_version || 0, jti: uuidv4() },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    setAdminCookie(res, token);
    res.json({
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, created_at: admin.created_at }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── getMe ────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, role, created_at FROM admins WHERE id = ?',
      [req.admin.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Admin not found' });
    res.json({ admin: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── forgotPassword ───────────────────────────────────────────────────────────
// FIX: OTP is now stored in the database instead of in-memory (otpStore),
// so it survives server restarts and works across multiple instances.
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string')
    return res.status(400).json({ error: 'Email required' });
  if (email.length > 120 || !emailRegex.test(email))
    return res.status(400).json({ error: 'Invalid email format' });

  try {
    const [rows] = await db.query('SELECT id, name, email FROM admins WHERE email = ?', [email]);
    const genericMessage = 'If that email exists, we have sent an OTP.';
    if (rows.length === 0) return res.json({ message: genericMessage });

    const admin = rows[0];
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // FIX: Hash the OTP before storing — plain text OTPs in DB are a security risk
    const otp_hash = await bcrypt.hash(otp, 10);

    // Upsert into DB — replaces any existing pending OTP for this email
    await db.query(
      `INSERT INTO otp_tokens (email, otp, admin_id, attempts, expires_at)
       VALUES (?, ?, ?, 0, ?)
       ON DUPLICATE KEY UPDATE
         otp = VALUES(otp),
         admin_id = VALUES(admin_id),
         attempts = 0,
         expires_at = VALUES(expires_at),
         created_at = NOW()`,
      [email, otp_hash, admin.id, expiresAt]
    );

    await sendOTPEmail(email, otp, admin.name);
    res.json({ message: genericMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send email. Please check your email address.' });
  }
};

// ─── verifyOTP ────────────────────────────────────────────────────────────────
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });
  if (typeof email !== 'string' || email.length > 120)
    return res.status(400).json({ error: 'Invalid email' });
  if (typeof otp !== 'string' || otp.length > 6)
    return res.status(400).json({ error: 'Invalid OTP format' });

  try {
    const [rows] = await db.query(
      'SELECT * FROM otp_tokens WHERE email = ? AND expires_at > NOW()',
      [email]
    );

    if (rows.length === 0)
      return res.status(400).json({ error: 'No OTP found or OTP has expired. Please request a new one.' });

    const stored = rows[0];
    if (stored.attempts >= 3) {
      await db.query('DELETE FROM otp_tokens WHERE email = ?', [email]);
      return res.status(429).json({ error: 'Too many invalid OTP attempts. Please request a new OTP.' });
    }
    // FIX: Compare against hashed OTP using bcrypt
    const isMatch = await bcrypt.compare(otp, stored.otp);
    if (!isMatch) {
      await db.query('UPDATE otp_tokens SET attempts = attempts + 1 WHERE email = ?', [email]);
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    // Valid — delete OTP from DB and issue a short-lived reset token
    await db.query('DELETE FROM otp_tokens WHERE email = ?', [email]);

    const resetToken = jwt.sign(
      { adminId: stored.admin_id, email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    res.json({ message: 'OTP verified!', resetToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── resetPassword ────────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword)
    return res.status(400).json({ error: 'All fields required' });
  if (typeof newPassword !== 'string' || newPassword.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (newPassword.length > 128)
    return res.status(400).json({ error: 'Password too long (max 128 characters)' });

  try {
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE admins SET password_hash = ?, token_version = token_version + 1 WHERE id = ?', [hash, decoded.adminId]);
    res.json({ message: 'Password reset successfully!' });
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired reset token' });
  }
};

const logout = async (req, res) => {
  try {
    if (req.admin?.jti && req.admin?.exp) {
      await db.query(
        'INSERT IGNORE INTO admin_token_blacklist (jti, admin_id, expires_at) VALUES (?, ?, FROM_UNIXTIME(?))',
        [req.admin.jti, req.admin.id, req.admin.exp]
      );
    }
    clearAdminCookie(res);
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { register, login, getMe, forgotPassword, verifyOTP, resetPassword, logout };
