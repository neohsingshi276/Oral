const express = require('express');
const router = express.Router();
const {
    getCrossword, getAllWords, addWord, updateWord, deleteWord,
    submitScore, getLeaderboard
} = require('../controllers/crossword.controller');
const verifyToken = require('../middleware/verifyToken');

// ─── IMPORTANT: Specific paths MUST come before /:session_id wildcard ─────────
// Express matches routes top-to-bottom. If /:session_id were first,
// GET /admin would be caught with session_id="admin" instead of hitting
// the /admin handler — causing a 400 "Invalid session ID" error.

router.get('/admin', verifyToken, getAllWords);
router.post('/admin', verifyToken, addWord);
router.put('/admin/:id', verifyToken, updateWord);
router.delete('/admin/:id', verifyToken, deleteWord);
router.post('/submit', submitScore);
router.get('/leaderboard/:session_id', getLeaderboard);

// Wildcard param route last — must not shadow any of the above
router.get('/:session_id', getCrossword);

module.exports = router;
