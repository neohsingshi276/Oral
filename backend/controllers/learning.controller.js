// ============================================
// controllers/learning.controller.js
// ============================================

const db = require('../db');
const { translateBmToBi, translateBiToBm } = require('../services/translate.service');

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

const resolveVideoTranslations = async ({ title, description, body }) => {
  const sourceLanguage = body.source_language === 'bi' ? 'bi' : 'bm';
  const manualTitle = (body.title_translation || body.title_bi || body.title_bm || '').trim();
  const manualDescription = (body.description_translation || body.description_bi || body.description_bm || '').trim();
  const sourceDescription = description?.trim() || '';

  if (sourceLanguage === 'bi') {
    return {
      titleBm: manualTitle || await translateBiToBm(title.trim()),
      descriptionBm: manualDescription || await translateBiToBm(sourceDescription),
      titleBi: title.trim(),
      descriptionBi: sourceDescription,
    };
  }

  return {
    titleBm: title.trim(),
    descriptionBm: sourceDescription,
    titleBi: manualTitle || await translateBmToBi(title.trim()),
    descriptionBi: manualDescription || await translateBmToBi(sourceDescription),
  };
};

const addVideo = async (req, res) => {
  const { title, description, youtube_url, order_num } = req.body;
  if (!title || !youtube_url) {
    return res.status(400).json({ error: 'Title and YouTube URL are required' });
  }
  if (title.length > 150) return res.status(400).json({ error: 'Title too long (max 150 characters)' });
  if (description && description.length > 500) return res.status(400).json({ error: 'Description too long (max 500 characters)' });
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]{11}/;
  if (!youtubeRegex.test(youtube_url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL. Use a youtube.com or youtu.be link.' });
  }
  const parsedOrder = parseOrderNum(order_num);
  if (order_num !== '' && order_num !== null && order_num !== undefined && parsedOrder === null) {
    return res.status(400).json({ error: 'Order number must be 1 or greater' });
  }

  const { titleBm, descriptionBm, titleBi, descriptionBi } = await resolveVideoTranslations({ title, description, body: req.body });

  try {
    const finalOrder = parsedOrder ?? (await getNextOrderNum());
    const [result] = await db.query(
      'INSERT INTO learning_videos (title, description, youtube_url, order_num, title_bi, description_bi) VALUES (?, ?, ?, ?, ?, ?)',
      [titleBm, descriptionBm, youtube_url.trim(), finalOrder, titleBi, descriptionBi]
    );
    res.status(201).json({ message: 'Video added', videoId: result.insertId });
  } catch (err) {
    console.error('Add video error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

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

  const { titleBm, descriptionBm, titleBi, descriptionBi } = await resolveVideoTranslations({ title, description, body: req.body });

  try {
    await db.query(
      'UPDATE learning_videos SET title=?, description=?, youtube_url=?, order_num=?, title_bi=?, description_bi=? WHERE id=?',
      [titleBm, descriptionBm, youtube_url.trim(), parsedOrder, titleBi, descriptionBi, req.params.id]
    );
    res.json({ message: 'Video updated' });
  } catch (err) {
    console.error('Update video error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

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
