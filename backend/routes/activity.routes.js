const express = require('express');
const router = express.Router();
const { getActivityLogs, getAdminMonitoring } = require('../controllers/activity.controller');
const verifyToken = require('../middleware/verifyToken');

router.get('/logs', verifyToken, getActivityLogs);
router.get('/monitoring', verifyToken, getAdminMonitoring);

module.exports = router;
