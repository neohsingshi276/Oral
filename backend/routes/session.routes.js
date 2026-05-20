const express = require('express');
const router = express.Router();
const {
    getSessions,
    createSession,
    updateSession,
    deleteSession,
    validateSession,
    revealSessionCode
} = require('../controllers/session.controller');
const verifyToken = require('../middleware/verifyToken');

router.get('/', verifyToken, getSessions);
router.post('/', verifyToken, createSession);
// ✅ /validate/:token must be declared BEFORE /:id to avoid Express
// treating "validate" as an :id param on future GET /:id routes
router.get('/validate/:token', validateSession);
router.post('/:id/reveal-code', verifyToken, revealSessionCode);
router.put('/:id', verifyToken, updateSession);
router.delete('/:id', verifyToken, deleteSession);

module.exports = router;