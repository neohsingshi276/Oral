const express = require('express');
const router = express.Router();
const { getPlayers, downloadCSV, getAnalytics, getAllAdmins, inviteAdmin, completeRegistration, verifyInviteToken, deleteAdmin, updateProfile, changePassword } = require('../controllers/admin.controller');
const verifyToken = require('../middleware/verifyToken');

router.get('/players', verifyToken, getPlayers);
router.get('/download-csv', verifyToken, downloadCSV);
router.get('/analytics', verifyToken, getAnalytics);
router.get('/admins', verifyToken, getAllAdmins);
router.post('/invite', verifyToken, inviteAdmin);
router.post('/complete-registration', completeRegistration);
router.get('/verify-invite/:token', verifyInviteToken);
router.delete('/admins/:id', verifyToken, deleteAdmin);
router.put('/profile', verifyToken, updateProfile);
router.put('/password', verifyToken, changePassword);

module.exports = router;
