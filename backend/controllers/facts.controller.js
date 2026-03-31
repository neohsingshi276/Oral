const db = require('../db');
const fs = require('fs');
const path = require('path');

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
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  try {
    const [result] = await db.query(
      'INSERT INTO facts (created_by, title, content, image_url) VALUES (?, ?, ?, ?)',
      [req.admin.id, title, content, image_url]
    );
    res.status(201).json({ message: 'Fact added', factId: result.insertId });
  } catch (err) {
    console.error('Add fact error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateFact = async (req, res) => {
  const { title, content } = req.body;
  try {
    if (req.file) {
      // Delete old image if exists
      const [rows] = await db.query('SELECT image_url FROM facts WHERE id = ?', [req.params.id]);
      if (rows[0]?.image_url) {
        const oldPath = path.join(__dirname, '..', rows[0].image_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      const image_url = `/uploads/${req.file.filename}`;
      await db.query('UPDATE facts SET title=?, content=?, image_url=? WHERE id=?', [title, content, image_url, req.params.id]);
    } else {
      await db.query('UPDATE facts SET title=?, content=? WHERE id=?', [title, content, req.params.id]);
    }
    res.json({ message: 'Fact updated' });
  } catch (err) {
    console.error('Update fact error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteFact = async (req, res) => {
  try {
    // Delete image file if exists
    const [rows] = await db.query('SELECT image_url FROM facts WHERE id = ?', [req.params.id]);
    if (rows[0]?.image_url) {
      const filePath = path.join(__dirname, '..', rows[0].image_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.query('DELETE FROM facts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Fact deleted' });
  } catch (err) {
    console.error('Delete fact error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllFacts, addFact, updateFact, deleteFact };
