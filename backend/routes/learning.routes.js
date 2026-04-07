// ============================================
// routes/learning.routes.js
// ============================================

const express = require('express');
const router = express.Router();
const { getAllVideos, getVideoById, addVideo, updateVideo, deleteVideo } = require('../controllers/learning.controller');
const verifyToken = require('../middleware/verifyToken');

// Public routes
router.get('/', getAllVideos);
router.get('/:id', getVideoById);

// Admin only routes
router.post('/', verifyToken, addVideo);
router.put('/:id', verifyToken, updateVideo);
router.delete('/:id', verifyToken, deleteVideo);

module.exports = router;
