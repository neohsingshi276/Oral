const express = require('express');
const router = express.Router();
const { joinGame, savePosition, getPosition, recordAttempt, completeCheckpoint, getProgress, getCertificate, getCheckpointVideos, playerExists } = require('../controllers/game.controller');
const verifyPlayerChatToken = require('../middleware/verifyPlayerChatToken');

router.post('/join/:token', joinGame);
router.post('/position', verifyPlayerChatToken, savePosition);
router.get('/position/:player_id', verifyPlayerChatToken, getPosition);
router.post('/attempt', verifyPlayerChatToken, recordAttempt);
router.post('/complete', verifyPlayerChatToken, completeCheckpoint);
router.get('/progress/:player_id', verifyPlayerChatToken, getProgress);
router.get('/certificate/:player_id', verifyPlayerChatToken, getCertificate);
router.get('/videos', getCheckpointVideos);
router.get('/player-exists/:player_id', playerExists);

module.exports = router;
