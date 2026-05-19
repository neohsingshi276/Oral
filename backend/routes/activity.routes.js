const express = require('express');
const router = express.Router();
const { createActivityLog, getActivityLogs, getAdminMonitoring } = require('../controllers/activity.controller');
const verifyToken = require('../middleware/verifyToken');

// Only Main Admin should access activity logs and monitoring
const requireMainAdmin = (req, res, next) => {
  if (req.admin?.role !== 'main_admin')
    return res.status(403).json({ error: 'Only the Main Admin can view activity logs' });
  next();
};

router.get('/logs',       verifyToken, requireMainAdmin, getActivityLogs);
router.get('/monitoring', verifyToken, requireMainAdmin, getAdminMonitoring);
router.post('/log',       verifyToken, createActivityLog);

module.exports = router;
