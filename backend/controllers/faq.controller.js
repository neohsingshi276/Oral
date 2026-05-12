const db = require('../db');

exports.getFAQ = async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT
        fq.*,
        a1.name AS asked_by_name,
        a1.role AS asked_by_role,
        a2.name AS answered_by_name
      FROM faq_questions fq
      LEFT JOIN admins a1 ON fq.asked_by_admin_id = a1.id
      LEFT JOIN admins a2 ON fq.answered_by_admin_id = a2.id
      ORDER BY fq.created_at DESC
    `);

        res.json(rows);
    } catch (err) {
        console.error('FAQ fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch FAQ' });
    }
};

exports.askFAQ = async (req, res) => {
    try {
        const { question } = req.body;
        const adminId = req.admin?.id || req.user?.id || req.user?.admin_id;

        if (!adminId) {
            return res.status(401).json({ error: 'Admin ID not found from token' });
        }

        if (!question || !question.trim()) {
            return res.status(400).json({ error: 'Question is required' });
        }

        await db.query(
            `INSERT INTO faq_questions (question, asked_by_admin_id, status)
       VALUES (?, ?, 'pending')`,
            [question.trim(), adminId]
        );

        res.json({ success: true, message: 'Question submitted' });
    } catch (err) {
        console.error('FAQ submit error:', err);
        res.status(500).json({ error: 'Failed to submit question' });
    }
};

exports.answerFAQ = async (req, res) => {
    try {
        const admin = req.admin || req.user;

        if (admin.role !== 'main_admin') {
            return res.status(403).json({ error: 'Only Main Admin can answer FAQ' });
        }

        const { answer } = req.body;
        console.log("FAQ BODY:", req.body);
        console.log("REQ ADMIN:", req.admin);
        console.log("REQ USER:", req.user);

        const { id } = req.params;

        if (!answer || !answer.trim()) {
            return res.status(400).json({ error: 'Answer is required' });
        }

        await db.query(
            `UPDATE faq_questions
       SET answer = ?, answered_by_admin_id = ?, status = 'answered', answered_at = NOW()
       WHERE id = ?`,
            [answer.trim(), admin.id, id]
        );

        res.json({ success: true, message: 'FAQ answered' });
    } catch (err) {
        console.error('FAQ answer error:', err);
        res.status(500).json({ error: 'Failed to answer FAQ' });
    }
};

exports.getInstructions = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM faq_instructions ORDER BY id ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch instructions' });
    }
};

exports.updateInstruction = async (req, res) => {
    try {
        const admin = req.admin || req.user;

        if (!admin || admin.role !== 'main_admin') {
            return res.status(403).json({
                error: 'Only Main Admin can edit instructions'
            });
        }

        const { id } = req.params;
        const { title, content } = req.body;

        await db.query(
            `UPDATE faq_instructions
       SET title = ?, content = ?, updated_by_admin_id = ?
       WHERE id = ?`,
            [title, content, admin.id, id]
        );

        res.json({
            success: true,
            message: 'Instruction updated successfully'
        });
    } catch (err) {
        console.error('Update instruction error:', err);
        res.status(500).json({
            error: 'Failed to update instruction'
        });
    }
};

exports.updateFAQAnswer = async (req, res) => {
    try {
        const admin = req.admin || req.user;

        if (!admin || admin.role !== 'main_admin') {
            return res.status(403).json({
                error: 'Only Main Admin can edit FAQ'
            });
        }

        const { id } = req.params;
        const { answer } = req.body;

        await db.query(
            `UPDATE faq_questions
      SET answer = ?,
        answered_by_admin_id = ?,
        status = 'answered',
        answered_at = NOW()
      WHERE id = ?`,
            [answer, admin.id, id]
        );

        res.json({
            success: true,
            message: 'FAQ updated successfully'
        });
    } catch (err) {
        console.error('Update FAQ error:', err);
        res.status(500).json({
            error: 'Failed to update FAQ'
        });
    }
};