const express = require('express');
const router = express.Router();
const {
  sendMessage, sendAdminMessage,
  getMessages, getAdminMessages, getAllChats,
  sendAdminInternalMessage, getAdminInternalMessages
} = require('../controllers/chat.controller');
const verifyToken = require('../middleware/verifyToken');

// ── Player-facing routes (no auth) ──────────────────────────────────────────
router.post('/', sendMessage);
router.get('/:player_id', getMessages);

// ── Admin → Player chat (requires admin token) ────────────────────────────
router.post('/admin/send', verifyToken, sendAdminMessage);
router.get('/admin/player/:player_id', verifyToken, getAdminMessages);
router.get('/', verifyToken, getAllChats);

// ── Admin ↔ Main Admin internal chat ─────────────────────────────────────
router.post('/admin/internal', verifyToken, sendAdminInternalMessage);
router.get('/admin/internal', verifyToken, getAdminInternalMessages);

module.exports = router;
