const express = require('express');
const router = express.Router();
const {
  sendMessage,
  adminSendMessage,
  getMessages,
  adminGetMessages,
  getAllChats,
} = require('../controllers/chat.controller');
const verifyToken = require('../middleware/verifyToken');
const verifyPlayerChatToken = require('../middleware/verifyPlayerChatToken');

// ── IMPORTANT: specific /admin/* routes MUST be registered BEFORE /:player_id
// otherwise Express matches "admin" as a player_id parameter and returns 404.

// Admin routes (JWT required)
router.post('/admin/reply',                  verifyToken, adminSendMessage);
router.get('/admin/messages/:player_id',     verifyToken, adminGetMessages);
router.get('/',                              verifyToken, getAllChats);

// Player routes (no JWT — players don't have tokens)
router.post('/', verifyPlayerChatToken, sendMessage);
router.get('/:player_id', verifyPlayerChatToken, getMessages);

module.exports = router;
