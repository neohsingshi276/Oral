const express = require('express');
const router = express.Router();
const { sendReminder, getMyReminders, markRead, getSentReminders } = require('../controllers/email.controller');
const verifyToken = require('../middleware/verifyToken');

router.post('/send', verifyToken, sendReminder);
router.get('/inbox', verifyToken, getMyReminders);
router.put('/read/:id', verifyToken, markRead);
router.get('/sent', verifyToken, getSentReminders);

module.exports = router;
