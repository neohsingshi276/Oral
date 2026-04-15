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

// Player routes (no auth — players don't have JWT)
router.post('/', sendMessage);
router.get('/:player_id', getMessages);

// Admin routes (JWT required)
router.post('/admin/reply', verifyToken, adminSendMessage);
router.get('/admin/messages/:player_id', verifyToken, adminGetMessages);
router.get('/', verifyToken, getAllChats);

module.exports = router;
