const express = require('express');
const router = express.Router();
const c = require('../controllers/quiz.controller');
const verifyToken = require('../middleware/verifyToken');
const upload = require('../middleware/upload');

// Player routes
router.get('/session/:session_id', c.getSessionQuestions);
router.post('/submit', c.submitQuiz);
router.get('/leaderboard/:session_id', c.getLeaderboard);

// Admin routes
router.get('/admin/questions', verifyToken, c.getAllQuestions);
router.post('/admin/questions', verifyToken, upload.single('image'), c.addQuestion);
router.put('/admin/questions/:id', verifyToken, upload.single('image'), c.updateQuestion);
router.delete('/admin/questions/:id', verifyToken, c.deleteQuestion);
router.get('/admin/settings/:session_id', verifyToken, c.getQuizSettings);
router.post('/admin/settings', verifyToken, c.saveQuizSettings);

module.exports = router;
