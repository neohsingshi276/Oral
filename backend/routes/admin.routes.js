const express = require('express');
const router = express.Router();
const { getPlayers, downloadCSV, getAnalytics, getAllAdmins, inviteAdmin, resendInvite, cancelInvite, completeRegistration, verifyInviteToken, deleteAdmin, deletePlayer, updateProfile, changePassword, updateAdminRole, getTeacherSessions, getSessionPlayersByMonth } = require('../controllers/admin.controller');
const verifyToken = require('../middleware/verifyToken');

router.get('/players', verifyToken, getPlayers);
router.get('/download-csv', verifyToken, downloadCSV);
router.get('/analytics', verifyToken, getAnalytics);
router.get('/admins', verifyToken, getAllAdmins);
router.post('/invite', verifyToken, inviteAdmin);
router.post('/invitations/:id/resend', verifyToken, resendInvite);
router.delete('/invitations/:id', verifyToken, cancelInvite);
router.post('/complete-registration', completeRegistration);
router.get('/verify-invite/:token', verifyInviteToken);
router.delete('/admins/:id', verifyToken, deleteAdmin);
router.put('/admins/:id/role', verifyToken, updateAdminRole);
router.delete('/players/:id', verifyToken, deletePlayer);
router.put('/profile', verifyToken, updateProfile);
router.put('/password', verifyToken, changePassword);
router.get('/teacher-sessions', verifyToken, getTeacherSessions);
router.get('/session-players/:id', verifyToken, getSessionPlayersByMonth);

module.exports = router;