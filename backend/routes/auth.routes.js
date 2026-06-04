const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, forgotPassword, verifyOTP, resetPassword } = require('../controllers/auth.controller');
const verifyToken = require('../middleware/verifyToken');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
// FIX: Logout route increments token_version to invalidate all existing sessions
router.post('/logout', verifyToken, logout);
router.get('/me', verifyToken, getMe);
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/verify-otp', otpLimiter, verifyOTP);
router.post('/reset-password', authLimiter, resetPassword);

module.exports = router;