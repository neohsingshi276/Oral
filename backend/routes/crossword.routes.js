const express = require('express');
const router = express.Router();
const { getCrossword, getAllWords, addWord, updateWord, deleteWord, submitScore, getLeaderboard } = require('../controllers/crossword.controller');
const verifyToken = require('../middleware/verifyToken');

router.get('/:session_id', getCrossword);
router.post('/submit', submitScore);
router.get('/leaderboard/:session_id', getLeaderboard);
router.get('/admin', verifyToken, getAllWords);
router.post('/admin', verifyToken, addWord);
router.put('/admin/:id', verifyToken, updateWord);
router.delete('/admin/:id', verifyToken, deleteWord);

module.exports = router;
