const express = require('express');
const router = express.Router();
const { sendMessage, getMessages, getAllChats } = require('../controllers/chat.controller');
const verifyToken = require('../middleware/verifyToken');

router.post('/', sendMessage);
router.get('/:player_id', getMessages);
router.get('/', verifyToken, getAllChats);

module.exports = router;
