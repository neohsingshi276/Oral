const express = require('express');
const router = express.Router();
const { joinGame, savePosition, getPosition, recordAttempt, completeCheckpoint, getProgress, getCheckpointVideos, playerExists } = require('../controllers/game.controller');
const verifyPlayerToken = require('../middleware/verifyPlayerToken');

router.post('/join/:token', joinGame);
router.post('/position', verifyPlayerToken, savePosition);
router.get('/position/:player_id', verifyPlayerToken, getPosition);
router.post('/attempt', verifyPlayerToken, recordAttempt);
router.post('/complete', verifyPlayerToken, completeCheckpoint);
router.get('/progress/:player_id', verifyPlayerToken, getProgress);
router.get('/videos', getCheckpointVideos);
router.get('/player-exists/:player_id', verifyPlayerToken, playerExists);

module.exports = router;
