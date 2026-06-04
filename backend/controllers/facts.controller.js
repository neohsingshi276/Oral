const { logActivity } = require('./activity.controller');
const db = require('../db');
const { translateBmToBi, translateBiToBm } = require('../services/translate.service');

// I replace this
const getAllFacts = async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

    const searchTerm = `%${search}%`;

    const [rows] = await db.query(
      `
      SELECT f.*, a.name as author
      FROM facts f
      JOIN admins a ON f.created_by = a.id
      WHERE (
        f.title LIKE ?
        OR COALESCE(f.content, '') LIKE ?
      )
      ORDER BY f.created_at ${order}, f.id ${order}
      `,
      [searchTerm, searchTerm]
    );

    res.json({ facts: rows });
  } catch (err) {
    console.error('Get facts error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

const resolveFactTranslations = async ({ title, content, body }) => {
  const sourceLanguage = body.source_language === 'bi' ? 'bi' : 'bm';
  const manualTitle = (body.title_translation || body.title_bi || body.title_bm || '').trim();
  const manualContent = (body.content_translation || body.content_bi || body.content_bm || '').trim();

  if (sourceLanguage === 'bi') {
    return {
      titleBm: manualTitle || await translateBiToBm(title.trim()),
      contentBm: manualContent || await translateBiToBm(content),
      titleBi: title.trim(),
      contentBi: content,
    };
  }

  return {
    titleBm: title.trim(),
    contentBm: content,
    titleBi: manualTitle || await translateBmToBi(title.trim()),
    contentBi: manualContent || await translateBmToBi(content),
  };
};

const addFact = async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
  if (typeof title !== 'string' || title.trim().length === 0) return res.status(400).json({ error: 'Invalid title' });
  if (title.length > 120) return res.status(400).json({ error: 'Title too long (max 120 characters)' });
  if (content.length > 1000) return res.status(400).json({ error: 'Content too long (max 1000 characters)' });

  let image_url = null;
  if (req.file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype))
      return res.status(400).json({ error: 'Only JPEG, PNG, GIF, or WebP images are allowed' });
    const base64 = req.file.buffer.toString('base64');
    image_url = `data:${req.file.mimetype};base64,${base64}`;
  }

  // Auto-translate to BI (fails silently — saves BM if API is down)
  const { titleBm, contentBm, titleBi, contentBi } = await resolveFactTranslations({ title, content, body: req.body });

  try {
    const [result] = await db.query(
      'INSERT INTO facts (created_by, title, content, image_url, title_bi, content_bi) VALUES (?, ?, ?, ?, ?, ?)',
      [req.admin.id, titleBm, contentBm, image_url, titleBi, contentBi]
    );
    await logActivity(req.admin.id, 'Added fact', `Fact: ${title.trim()}`);
    res.status(201).json({ message: 'Fact added', factId: result.insertId });
  } catch (err) {
    console.error('Add fact error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateFact = async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
  if (title.length > 120) return res.status(400).json({ error: 'Title too long (max 120 characters)' });
  if (content.length > 1000) return res.status(400).json({ error: 'Content too long (max 1000 characters)' });

  // Use manually provided BI if given, otherwise re-translate
  const { titleBm, contentBm, titleBi, contentBi } = await resolveFactTranslations({ title, content, body: req.body });

  try {
    if (req.file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype))
        return res.status(400).json({ error: 'Only JPEG, PNG, GIF, or WebP images are allowed' });
      const base64 = req.file.buffer.toString('base64');
      const image_url = `data:${req.file.mimetype};base64,${base64}`;
      await db.query(
        'UPDATE facts SET title=?, content=?, image_url=?, title_bi=?, content_bi=? WHERE id=?',
        [titleBm, contentBm, image_url, titleBi, contentBi, req.params.id]
      );
    } else {
      await db.query(
        'UPDATE facts SET title=?, content=?, title_bi=?, content_bi=? WHERE id=?',
        [titleBm, contentBm, titleBi, contentBi, req.params.id]
      );
    }
    await logActivity(req.admin.id, 'Updated fact', `Fact ID: ${req.params.id}`);
    res.json({ message: 'Fact updated' });
  } catch (err) {
    console.error('Update fact error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteFact = async (req, res) => {
  try {
    await db.query('DELETE FROM facts WHERE id = ?', [req.params.id]);
    await logActivity(req.admin.id, 'Deleted fact', `Fact ID: ${req.params.id}`);
    res.json({ message: 'Fact deleted' });
  } catch (err) {
    console.error('Delete fact error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllFacts, addFact, updateFact, deleteFact };
