const express = require('express');
const router = express.Router();
const { joinGame, savePosition, getPosition, recordAttempt, completeCheckpoint, getProgress, getCheckpointVideos } = require('../controllers/game.controller');

router.post('/join/:token', joinGame);
router.post('/position', savePosition);
router.get('/position/:player_id', getPosition);
router.post('/attempt', recordAttempt);
router.post('/complete', completeCheckpoint);
router.get('/progress/:player_id', getProgress);
router.get('/videos', getCheckpointVideos);

module.exports = router;
