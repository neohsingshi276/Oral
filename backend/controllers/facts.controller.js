const db = require('../db');

const getAllFacts = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT f.*, a.name as author FROM facts f JOIN admins a ON f.created_by = a.id ORDER BY f.created_at DESC'
    );
    res.json({ facts: rows });
  } catch (err) {
    console.error('Get facts error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

const addFact = async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
  if (typeof title !== 'string' || title.trim().length === 0) return res.status(400).json({ error: 'Invalid title' });
  if (title.length > 120) return res.status(400).json({ error: 'Title too long (max 120 characters)' });
  if (content.length > 1000) return res.status(400).json({ error: 'Content too long (max 1000 characters)' });

  // FIX: Validate uploaded file is actually an image before storing
  let image_url = null;
  if (req.file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype))
      return res.status(400).json({ error: 'Only JPEG, PNG, GIF, or WebP images are allowed' });
    const base64 = req.file.buffer.toString('base64');
    image_url = `data:${req.file.mimetype};base64,${base64}`;
  }

  try {
    const [result] = await db.query(
      'INSERT INTO facts (created_by, title, content, image_url) VALUES (?, ?, ?, ?)',
      [req.admin.id, title.trim(), content, image_url]
    );
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

  try {
    if (req.file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype))
        return res.status(400).json({ error: 'Only JPEG, PNG, GIF, or WebP images are allowed' });
      // Convert new image to Base64 and overwrite — no old file to delete since it's in DB
      const base64 = req.file.buffer.toString('base64');
      const image_url = `data:${req.file.mimetype};base64,${base64}`;
      await db.query('UPDATE facts SET title=?, content=?, image_url=? WHERE id=?', [title.trim(), content, image_url, req.params.id]);
    } else {
      await db.query('UPDATE facts SET title=?, content=? WHERE id=?', [title.trim(), content, req.params.id]);
    }
    res.json({ message: 'Fact updated' });
  } catch (err) {
    console.error('Update fact error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteFact = async (req, res) => {
  try {
    // Image is stored in DB so just delete the row — nothing to clean up on disk
    await db.query('DELETE FROM facts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Fact deleted' });
  } catch (err) {
    console.error('Delete fact error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllFacts, addFact, updateFact, deleteFact };
