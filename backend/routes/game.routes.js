const express = require('express');
const router = express.Router();
const { joinGame, savePosition, getPosition, recordAttempt, completeCheckpoint, getProgress, getCheckpointVideos, playerExists } = require('../controllers/game.controller');

router.post('/join/:token', joinGame);
router.post('/position', savePosition);
router.get('/position/:player_id', getPosition);
router.post('/attempt', recordAttempt);
router.post('/complete', completeCheckpoint);
router.get('/progress/:player_id', getProgress);
router.get('/videos', getCheckpointVideos);
router.get('/player-exists/:player_id', playerExists);

module.exports = router;
