const { logActivity } = require('./activity.controller');
// ============================================
// controllers/learning.controller.js
// ============================================

const db = require('../db');

const parseOrderNum = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = parseInt(value, 10);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
};

const getNextOrderNum = async (language) => {
  const [rows] = await db.query(
    `SELECT COALESCE(MAX(order_num), 0) + 1 AS next_order
     FROM learning_videos
     WHERE order_num >= 1
     AND language = ?`,
    [language]
  );

  const next = rows[0]?.next_order;

  return Number.isInteger(next) && next >= 1
    ? next
    : Number(next) || 1;
};

// I replace this part...
const getAllVideos = async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const order = req.query.order === 'desc' ? 'DESC' : 'ASC';
    const language = req.query.language;

    let sql = `
      SELECT *
      FROM learning_videos
      WHERE (
        title LIKE ?
        OR COALESCE(description, '') LIKE ?
      )
    `;

    const params = [];

    const searchTerm = `%${search}%`;

    params.push(searchTerm, searchTerm);

    if (language === 'bm' || language === 'bi') {
      sql += ` AND language = ?`;
      params.push(language);
    }

    sql += `
      ORDER BY CAST(order_num AS UNSIGNED) ${order},
      id ${order}
    `;

    const [rows] = await db.query(sql, params);

    res.json({ videos: rows });

  } catch (err) {
    console.error('Get videos error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

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

const addVideo = async (req, res) => {
  const { title, description, youtube_url, order_num, language } = req.body;
  if (!title || !youtube_url) {
    return res.status(400).json({ error: 'Title and YouTube URL are required' });
  }
  if (!['bm', 'bi'].includes(language)) { return res.status(400).json({ error: 'Language must be BM or English' }); }
  if (title.length > 150) return res.status(400).json({ error: 'Title too long (max 150 characters)' });
  if (description && description.length > 500) return res.status(400).json({ error: 'Description too long (max 500 characters)' });
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]{11}/;
  if (!youtubeRegex.test(youtube_url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL. Use a youtube.com or youtu.be link.' });
  }
  const parsedOrder = parseOrderNum(order_num);
  if (order_num !== '' && order_num !== null && order_num !== undefined && parsedOrder === null) {
    return res.status(400).json({ error: 'Order number must be 1 or greater' });
  }


  try {
    const finalOrder = parsedOrder ?? (await getNextOrderNum(language));
    const [result] = await db.query(
      `INSERT INTO learning_videos
       (title, description, youtube_url, order_num, language)
       VALUES (?, ?, ?, ?, ?)`,
      [
        title.trim(),
        description?.trim() || '',
        youtube_url.trim(),
        finalOrder,
        language
      ]
    );
    await logActivity(req.admin.id, 'Added learning video', `Video: ${title.trim()}`);
    res.status(201).json({ message: 'Video added', videoId: result.insertId });
  } catch (err) {
    console.error('Add video error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateVideo = async (req, res) => {
  const {
    title,
    description,
    youtube_url,
    order_num,
    language
  } = req.body;

  if (!title || !youtube_url) {
    return res.status(400).json({
      error: 'Title and YouTube URL are required'
    });
  }

  if (!['bm', 'bi'].includes(language)) {
    return res.status(400).json({
      error: 'Language must be BM or English'
    });
  }

  const parsedOrder = parseOrderNum(order_num);

  if (parsedOrder === null) {
    return res.status(400).json({
      error: 'Order number must be 1 or greater'
    });
  }

  try {

    await db.query(
      `UPDATE learning_videos
       SET title = ?,
           description = ?,
           youtube_url = ?,
           order_num = ?,
           language = ?
       WHERE id = ?`,
      [
        title.trim(),
        description?.trim() || '',
        youtube_url.trim(),
        parsedOrder,
        language,
        req.params.id
      ]
    );

    await logActivity(
      req.admin.id,
      'Updated learning video',
      `Video ID: ${req.params.id}`
    );

    res.json({
      message: 'Video updated'
    });

  } catch (err) {
    console.error('Update video error:', err.message);
    res.status(500).json({
      error: 'Server error'
    });
  }
};

const deleteVideo = async (req, res) => {
  try {
    await db.query('DELETE FROM learning_videos WHERE id = ?', [req.params.id]);
    await logActivity(req.admin.id, 'Deleted learning video', `Video ID: ${req.params.id}`);
    res.json({ message: 'Video deleted' });
  } catch (err) {
    console.error('Delete video error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllVideos, getVideoById, addVideo, updateVideo, deleteVideo };
