const express = require('express');
const router = express.Router();
const { register, login, getMe, forgotPassword, verifyOTP, resetPassword } = require('../controllers/auth.controller');
const verifyToken = require('../middleware/verifyToken');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', verifyToken, getMe);
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/verify-otp', otpLimiter, verifyOTP);
router.post('/reset-password', authLimiter, resetPassword);

module.exports = router;
