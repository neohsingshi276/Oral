const express = require('express');
const router = express.Router();
const {
    getCrossword, getAllWords, addWord, updateWord, deleteWord,
    submitScore, getLeaderboard
} = require('../controllers/crossword.controller');
const verifyToken = require('../middleware/verifyToken');
const { scoreLimiter } = require('../middleware/rateLimiter');

// ─── IMPORTANT: Specific paths MUST come before /:session_id wildcard ─────────
router.get('/admin', verifyToken, getAllWords);
router.post('/admin', verifyToken, addWord);
router.put('/admin/:id', verifyToken, updateWord);
router.delete('/admin/:id', verifyToken, deleteWord);
router.post('/submit', scoreLimiter, submitScore);
router.get('/leaderboard/:session_id', getLeaderboard);

// Wildcard param route last — must not shadow any of the above
router.get('/:session_id', getCrossword);

module.exports = router;
