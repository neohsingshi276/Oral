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
  if (typeof session_name !== 'string' || session_name.trim().length === 0) return res.status(400).json({ error: 'Invalid session name' });
  if (session_name.length > 80) return res.status(400).json({ error: 'Session name too long (max 80 characters)' });

  // Sanitise all numeric fields to integers to prevent decimal / injection crashes
  const safeInt = (val, fallback, min = 0, max = 9999) => {
    const n = parseInt(val, 10);
    if (isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  };

  try {
    const unique_token = await generateCode();
    const [result] = await db.query('INSERT INTO game_sessions (admin_id, session_name, unique_token) VALUES (?, ?, ?)', [req.admin.id, session_name.trim(), unique_token]);
    const sessionId = result.insertId;

    if (quiz_settings) await db.query('INSERT INTO quiz_settings (session_id, timer_seconds, question_order, question_count, minimum_correct, selected_questions) VALUES (?,?,?,?,?,?)', [sessionId, safeInt(quiz_settings.timer_seconds, 15, 5, 120), ['shuffle', 'sequential'].includes(quiz_settings.question_order) ? quiz_settings.question_order : 'shuffle', safeInt(quiz_settings.question_count, 10, 1, 100), safeInt(quiz_settings.minimum_correct, 0, 0, 100), JSON.stringify(quiz_settings.selected_questions || [])]);
    if (crossword_settings) await db.query('INSERT INTO crossword_settings (session_id, word_count, selected_words, minimum_correct) VALUES (?,?,?,?)', [sessionId, safeInt(crossword_settings.word_count, 8, 3, 50), JSON.stringify(crossword_settings.selected_words || []), safeInt(crossword_settings.minimum_correct, 0, 0, 50)]);
    if (cp3_settings) await db.query('INSERT INTO cp3_settings (session_id, timer_seconds, target_score) VALUES (?,?,?)', [sessionId, safeInt(cp3_settings.timer_seconds, 60, 10, 600), safeInt(cp3_settings.target_score, 0, 0, 9999)]);

    res.status(201).json({ message: 'Session created!', sessionId, unique_token });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

const updateSession = async (req, res) => {
  const { is_active, session_name, quiz_settings, crossword_settings, cp3_settings } = req.body;
  const sessionId = req.params.id;

  const safeInt = (val, fallback, min = 0, max = 9999) => {
    const n = parseInt(val, 10);
    if (isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  };

  try {
    if (is_active !== undefined) await db.query('UPDATE game_sessions SET is_active = ? WHERE id = ?', [is_active, sessionId]);
    if (session_name) {
      if (session_name.length > 80) return res.status(400).json({ error: 'Session name too long (max 80 characters)' });
      await db.query('UPDATE game_sessions SET session_name = ? WHERE id = ?', [session_name.trim(), sessionId]);
    }

    if (quiz_settings) await db.query('UPDATE quiz_settings SET timer_seconds=?, question_order=?, question_count=?, minimum_correct=?, selected_questions=? WHERE session_id=?', [safeInt(quiz_settings.timer_seconds, 15, 5, 120), ['shuffle', 'sequential'].includes(quiz_settings.question_order) ? quiz_settings.question_order : 'shuffle', safeInt(quiz_settings.question_count, 10, 1, 100), safeInt(quiz_settings.minimum_correct, 0, 0, 100), JSON.stringify(quiz_settings.selected_questions || []), sessionId]);
    if (crossword_settings) await db.query('UPDATE crossword_settings SET word_count=?, selected_words=?, minimum_correct=? WHERE session_id=?', [safeInt(crossword_settings.word_count, 8, 3, 50), JSON.stringify(crossword_settings.selected_words || []), safeInt(crossword_settings.minimum_correct, 0, 0, 50), sessionId]);
    if (cp3_settings) await db.query('UPDATE cp3_settings SET timer_seconds=?, target_score=? WHERE session_id=?', [safeInt(cp3_settings.timer_seconds, 60, 10, 600), safeInt(cp3_settings.target_score, 0, 0, 9999), sessionId]);

    res.json({ message: 'Session updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
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
