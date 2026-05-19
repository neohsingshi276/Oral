// ============================================
// controllers/learning.controller.js
// ============================================

const db = require('../db');

/** Order must be a positive integer (1, 2, 3…). Returns null if invalid. */
const parseOrderNum = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = parseInt(value, 10);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
};

const getNextOrderNum = async () => {
  const [rows] = await db.query(
    'SELECT COALESCE(MAX(order_num), 0) + 1 AS next_order FROM learning_videos WHERE order_num >= 1'
  );
  const next = rows[0]?.next_order;
  return Number.isInteger(next) && next >= 1 ? next : 1;
};

// GET /api/videos — get all learning videos
const getAllVideos = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM learning_videos ORDER BY order_num ASC, id ASC'
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
  if (title.length > 150) return res.status(400).json({ error: 'Title too long (max 150 characters)' });
  if (description && description.length > 500) return res.status(400).json({ error: 'Description too long (max 500 characters)' });
  // Accept youtube.com/watch?v=, youtu.be/, or youtube.com/embed/ links
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]{11}/;
  if (!youtubeRegex.test(youtube_url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL. Use a youtube.com or youtu.be link.' });
  }
  const parsedOrder = parseOrderNum(order_num);
  if (order_num !== '' && order_num !== null && order_num !== undefined && parsedOrder === null) {
    return res.status(400).json({ error: 'Order number must be 1 or greater' });
  }

  try {
    const finalOrder = parsedOrder ?? (await getNextOrderNum());
    const [result] = await db.query(
      'INSERT INTO learning_videos (title, description, youtube_url, order_num) VALUES (?, ?, ?, ?)',
      [title.trim(), description?.trim() || '', youtube_url.trim(), finalOrder]
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
  if (!title || !youtube_url) return res.status(400).json({ error: 'Title and YouTube URL are required' });
  if (title.length > 150) return res.status(400).json({ error: 'Title too long (max 150 characters)' });
  if (description && description.length > 500) return res.status(400).json({ error: 'Description too long (max 500 characters)' });
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]{11}/;
  if (!youtubeRegex.test(youtube_url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL. Use a youtube.com or youtu.be link.' });
  }
  const parsedOrder = parseOrderNum(order_num);
  if (parsedOrder === null) {
    return res.status(400).json({
      error: order_num === '' || order_num === null || order_num === undefined
        ? 'Order number is required when updating a video'
        : 'Order number must be 1 or greater',
    });
  }

  try {
    await db.query(
      'UPDATE learning_videos SET title=?, description=?, youtube_url=?, order_num=? WHERE id=?',
      [title.trim(), description?.trim() || '', youtube_url.trim(), parsedOrder, req.params.id]
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
