
const db = require('../db');
const bcrypt = require('bcryptjs');

const getClasses = async (req, res) => {
    try {
        let query = `
      SELECT
        c.id,
        c.school_id,
        c.teacher_id,
        c.class_name,
        c.created_at,
        s.school_name,
        a.name AS teacher_name,
        a.email AS teacher_email
      FROM classes c
      JOIN schools s ON c.school_id = s.id
      JOIN admins a ON c.teacher_id = a.id
    `;

        const params = [];

        if (req.admin.role !== 'main_admin') {
            query += ` WHERE c.teacher_id = ?`;
            params.push(req.admin.id);
        }

        query += ` ORDER BY s.school_name ASC, c.class_name ASC`;

        const [classes] = await db.query(query, params);
        res.json({ classes });
    } catch (err) {
        console.error('Get classes error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { getClasses };