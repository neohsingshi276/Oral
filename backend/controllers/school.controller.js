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

module.exports = { getSchools };