const express = require('express');
const router  = express.Router();
const { getConversation, sendMessage, getContacts } = require('../controllers/staffChat.controller');
const verifyToken = require('../middleware/verifyToken');

// All staff-chat routes require a valid admin JWT
router.get('/contacts',          verifyToken, getContacts);
router.get('/:admin_id',         verifyToken, getConversation);
router.post('/',                 verifyToken, sendMessage);

module.exports = router;
