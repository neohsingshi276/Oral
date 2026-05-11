const express = require('express');
const router = express.Router();
const { getSessions, getTeachers, createSession, updateSession, deleteSession, validateSession } = require('../controllers/session.controller');
const verifyToken = require('../middleware/verifyToken');

router.get('/',                verifyToken, getSessions);
router.get('/teachers',        verifyToken, getTeachers);   // for teacher assignment dropdown
router.post('/',               verifyToken, createSession);
router.put('/:id',             verifyToken, updateSession);
router.delete('/:id',          verifyToken, deleteSession);
router.get('/validate/:token', validateSession);

module.exports = router;
