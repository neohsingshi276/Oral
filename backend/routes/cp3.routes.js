const express = require('express');
const router = express.Router();
const { saveScore, getLeaderboard, getCrosswordLeaderboard, getFinalLeaderboard, getSettings } = require('../controllers/cp3.controller');
const { scoreLimiter } = require('../middleware/rateLimiter');

router.post('/score', scoreLimiter, saveScore);
router.get('/leaderboard/:session_id', getLeaderboard);
router.get('/crossword-leaderboard/:session_id', getCrosswordLeaderboard);
router.get('/final/:session_id', getFinalLeaderboard);
router.get('/settings/:session_id', getSettings);

module.exports = router;
