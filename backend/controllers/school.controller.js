const db = require('../db');

const getSchools = async (req, res) => {
    try {
        const [schools] = await db.query(
            'SELECT * FROM schools ORDER BY school_name ASC'
        );

        res.json({ schools });
    } catch (err) {
        console.error('Get schools error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};


const createSchool = async (req, res) => {
  if (!['main_admin', 'admin'].includes(req.admin.role))
    return res.status(403).json({ error: 'Forbidden' });
  const { school_name } = req.body;
  if (!school_name?.trim())
    return res.status(400).json({ error: 'School name required' });
  try {
    const [existing] = await db.query('SELECT id FROM schools WHERE school_name = ?', [school_name.trim()]);
    if (existing.length > 0)
      return res.status(400).json({ error: 'School already exists' });
    const [result] = await db.query('INSERT INTO schools (school_name) VALUES (?)', [school_name.trim()]);
    res.status(201).json({ message: 'School created', school: { id: result.insertId, school_name: school_name.trim() } });
  } catch (err) {
    console.error('Create school error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteSchool = async (req, res) => {
  if (req.admin.role !== 'main_admin')
    return res.status(403).json({ error: 'Only main admin can delete schools' });
  try {
    await db.query('DELETE FROM schools WHERE id = ?', [req.params.id]);
    res.json({ message: 'School deleted' });
  } catch (err) {
    console.error('Delete school error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getSchools, createSchool, deleteSchool };
