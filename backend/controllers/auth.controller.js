const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../services/email.service');

// Store OTPs temporarily in memory
const otpStore = {};

const register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

  try {
    const [existing] = await db.query('SELECT id FROM admins WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already registered' });
    const password_hash = await bcrypt.hash(password, 10);
    const [count] = await db.query('SELECT COUNT(*) as cnt FROM admins');
    const role = count[0].cnt === 0 ? 'main_admin' : 'admin';
    const [result] = await db.query(
      'INSERT INTO admins (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, password_hash, role]
    );
    res.status(201).json({ message: 'Admin registered', adminId: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const [rows] = await db.query('SELECT * FROM admins WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'No Email Exists' });
    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid Password' });
    const token = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, created_at: admin.created_at } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

const getMe = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, email, role, created_at FROM admins WHERE id = ?', [req.admin.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Admin not found' });
    res.json({ admin: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// Send OTP to email
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const [rows] = await db.query('SELECT id, name, email FROM admins WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(404).json({ error: 'No account found with this email' });

    const admin = rows[0];
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore[email] = { otp, expiry, adminId: admin.id };

    await sendOTPEmail(email, otp, admin.name);
    res.json({ message: 'OTP sent to your email!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send email. Please check your email address.' });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

  const stored = otpStore[email];
  if (!stored) return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
  if (Date.now() > stored.expiry) {
    delete otpStore[email];
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }
  if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP. Please try again.' });

  // OTP valid — generate reset token
  const resetToken = jwt.sign({ adminId: stored.adminId, email }, process.env.JWT_SECRET, { expiresIn: '15m' });
  delete otpStore[email];
  res.json({ message: 'OTP verified!', resetToken });
};

// Reset password
const resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) return res.status(400).json({ error: 'All fields required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE admins SET password_hash = ? WHERE id = ?', [hash, decoded.adminId]);
    res.json({ message: 'Password reset successfully!' });
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired reset token' });
  }
};

module.exports = { register, login, getMe, forgotPassword, verifyOTP, resetPassword };
