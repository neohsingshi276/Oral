// ============================================
// controllers/learning.controller.js
// ============================================

const db = require('../db');

// GET /api/videos — get all learning videos
const getAllVideos = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM learning_videos ORDER BY order_num ASC'
    );
    res.json({ videos: rows });
  } catch (err) {
    console.error('Get videos error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/videos/:id — get single video
const getVideoById = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM learning_videos WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Video not found' });
    res.json({ video: rows[0] });
  } catch (err) {
    console.error('Get video error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/videos — add new video (admin only)
const addVideo = async (req, res) => {
  const { title, description, youtube_url, order_num } = req.body;
  if (!title || !youtube_url) {
    return res.status(400).json({ error: 'Title and YouTube URL are required' });
  }
  try {
    const [result] = await db.query(
      'INSERT INTO learning_videos (title, description, youtube_url, order_num) VALUES (?, ?, ?, ?)',
      [title, description || '', youtube_url, order_num || 0]
    );
    res.status(201).json({ message: 'Video added', videoId: result.insertId });
  } catch (err) {
    console.error('Add video error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/videos/:id — update video (admin only)
const updateVideo = async (req, res) => {
  const { title, description, youtube_url, order_num } = req.body;
  try {
    await db.query(
      'UPDATE learning_videos SET title=?, description=?, youtube_url=?, order_num=? WHERE id=?',
      [title, description, youtube_url, order_num, req.params.id]
    );
    res.json({ message: 'Video updated' });
  } catch (err) {
    console.error('Update video error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /api/videos/:id — delete video (admin only)
const deleteVideo = async (req, res) => {
  try {
    await db.query('DELETE FROM learning_videos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Video deleted' });
  } catch (err) {
    console.error('Delete video error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllVideos, getVideoById, addVideo, updateVideo, deleteVideo };
