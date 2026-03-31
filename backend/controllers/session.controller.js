const db = require('../db');

// Generate unique 4 digit code
const generateCode = async () => {
  let code, exists;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
    const [rows] = await db.query('SELECT id FROM game_sessions WHERE unique_token = ?', [code]);
    exists = rows.length > 0;
  } while (exists);
  return code;
};

const getSessions = async (req, res) => {
  try {
    const [sessions] = await db.query(
      'SELECT s.*, a.name as admin_name FROM game_sessions s JOIN admins a ON s.admin_id = a.id ORDER BY s.created_at DESC'
    );
    // Attach the hidden settings so the frontend can display them!
    for (let s of sessions) {
      const [qRows] = await db.query('SELECT * FROM quiz_settings WHERE session_id = ?', [s.id]);
      const [cRows] = await db.query('SELECT * FROM crossword_settings WHERE session_id = ?', [s.id]);
      const [cp3Rows] = await db.query('SELECT * FROM cp3_settings WHERE session_id = ?', [s.id]);
      s.quiz_settings = qRows[0] || {};
      s.crossword_settings = cRows[0] || {};
      s.cp3_settings = cp3Rows[0] || {};
    }
    res.json({ sessions });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const createSession = async (req, res) => {
  const { session_name, quiz_settings, crossword_settings, cp3_settings } = req.body;
  if (!session_name) return res.status(400).json({ error: 'Session name required' });
  try {
    const unique_token = await generateCode();
    const [result] = await db.query('INSERT INTO game_sessions (admin_id, session_name, unique_token) VALUES (?, ?, ?)', [req.admin.id, session_name, unique_token]);
    const sessionId = result.insertId;

    if (quiz_settings) await db.query('INSERT INTO quiz_settings (session_id, timer_seconds, question_order, question_count, minimum_correct, selected_questions) VALUES (?,?,?,?,?,?)', [sessionId, quiz_settings.timer_seconds || 15, quiz_settings.question_order || 'shuffle', quiz_settings.question_count || 10, quiz_settings.minimum_correct || 0, JSON.stringify(quiz_settings.selected_questions || [])]);
    if (crossword_settings) await db.query('INSERT INTO crossword_settings (session_id, word_count, selected_words, minimum_correct) VALUES (?,?,?,?)', [sessionId, crossword_settings.word_count || 8, JSON.stringify(crossword_settings.selected_words || []), crossword_settings.minimum_correct || 0]);
    if (cp3_settings) await db.query('INSERT INTO cp3_settings (session_id, timer_seconds, target_score) VALUES (?,?,?)', [sessionId, cp3_settings.timer_seconds || 60, cp3_settings.target_score || 0]);

    res.status(201).json({ message: 'Session created!', sessionId, unique_token });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const updateSession = async (req, res) => {
  const { is_active, session_name, quiz_settings, crossword_settings, cp3_settings } = req.body;
  const sessionId = req.params.id;
  try {
    if (is_active !== undefined) await db.query('UPDATE game_sessions SET is_active = ? WHERE id = ?', [is_active, sessionId]);
    if (session_name) await db.query('UPDATE game_sessions SET session_name = ? WHERE id = ?', [session_name, sessionId]);

    if (quiz_settings) await db.query('UPDATE quiz_settings SET timer_seconds=?, question_order=?, question_count=?, minimum_correct=?, selected_questions=? WHERE session_id=?', [quiz_settings.timer_seconds, quiz_settings.question_order, quiz_settings.question_count, quiz_settings.minimum_correct, JSON.stringify(quiz_settings.selected_questions || []), sessionId]);
    if (crossword_settings) await db.query('UPDATE crossword_settings SET word_count=?, selected_words=?, minimum_correct=? WHERE session_id=?', [crossword_settings.word_count, JSON.stringify(crossword_settings.selected_words || []), crossword_settings.minimum_correct || 0, sessionId]);
    if (cp3_settings) await db.query('UPDATE cp3_settings SET timer_seconds=?, target_score=? WHERE session_id=?', [cp3_settings.timer_seconds, cp3_settings.target_score, sessionId]);

    res.json({ message: 'Session updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};


const deleteSession = async (req, res) => {
  try {
    await db.query('DELETE FROM game_sessions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Session deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const validateSession = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM game_sessions WHERE unique_token = ? AND is_active = true',
      [req.params.token]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Invalid code or session inactive' });
    res.json({ session: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

module.exports = { getSessions, createSession, updateSession, deleteSession, validateSession };
