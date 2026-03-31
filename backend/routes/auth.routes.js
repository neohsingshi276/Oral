const express = require('express');
const router = express.Router();
const { register, login, getMe, forgotPassword, verifyOTP, resetPassword } = require('../controllers/auth.controller');
const verifyToken = require('../middleware/verifyToken');

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

module.exports = router;
