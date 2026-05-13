const express = require('express');
const router = express.Router();
const c = require('../controllers/quiz.controller');
const verifyToken = require('../middleware/verifyToken');
const upload = require('../middleware/upload');

// Wrap multer so file type/size errors return 400 instead of crashing with 500
const multerHandler = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
};

// Player routes
router.get('/session/:session_id', c.getSessionQuestions);
router.post('/submit', c.submitQuiz);
router.get('/leaderboard/:session_id', c.getLeaderboard);

// Admin routes
router.get('/admin/questions', verifyToken, c.getAllQuestions);
router.post('/admin/questions', verifyToken, multerHandler, c.addQuestion);
router.put('/admin/questions/:id', verifyToken, multerHandler, c.updateQuestion);
router.delete('/admin/questions/:id', verifyToken, c.deleteQuestion);
router.get('/admin/settings/:session_id', verifyToken, c.getQuizSettings);
router.post('/admin/settings', verifyToken, c.saveQuizSettings);

module.exports = router;
