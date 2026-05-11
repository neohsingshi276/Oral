const db = require('../db');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateCode = async () => {
  let code, exists;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
    const [rows] = await db.query('SELECT id FROM game_sessions WHERE unique_token = ?', [code]);
    exists = rows.length > 0;
  } while (exists);
  return code;
};

const safeInt = (val, fallback, min = 0, max = 9999) => {
  const n = parseInt(val, 10);
  if (isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ─── getSessions ──────────────────────────────────────────────────────────────
const getSessions = async (req, res) => {
  try {
    // Use IFNULL on a.school so this query works even if the column doesn't
    // exist yet (schema.service.js will add it on next deploy/restart).
    let sessions;
    try {
      const [rows] = await db.query(
        `SELECT s.*, a.name as admin_name, IFNULL(a.school, '') as school
         FROM game_sessions s
         JOIN admins a ON s.admin_id = a.id
         ORDER BY s.created_at DESC`
      );
      sessions = rows;
    } catch (colErr) {
      // Fallback: school column may not exist yet — query without it
      const [rows] = await db.query(
        `SELECT s.*, a.name as admin_name, '' as school
         FROM game_sessions s
         JOIN admins a ON s.admin_id = a.id
         ORDER BY s.created_at DESC`
      );
      sessions = rows;
    }

    if (sessions.length === 0) return res.json({ sessions: [] });

    const sessionIds  = sessions.map(s => s.id);
    const placeholders = sessionIds.map(() => '?').join(',');

    const [qRows]   = await db.query(`SELECT * FROM quiz_settings      WHERE session_id IN (${placeholders})`, sessionIds);
    const [cRows]   = await db.query(`SELECT * FROM crossword_settings  WHERE session_id IN (${placeholders})`, sessionIds);
    const [cp3Rows] = await db.query(`SELECT * FROM cp3_settings        WHERE session_id IN (${placeholders})`, sessionIds);

    const quizMap      = Object.fromEntries(qRows.map(r   => [r.session_id, r]));
    const crosswordMap = Object.fromEntries(cRows.map(r   => [r.session_id, r]));
    const cp3Map       = Object.fromEntries(cp3Rows.map(r => [r.session_id, r]));

    for (const s of sessions) {
      s.quiz_settings      = quizMap[s.id]      || {};
      s.crossword_settings = crosswordMap[s.id] || {};
      s.cp3_settings       = cp3Map[s.id]       || {};
    }

    res.json({ sessions });
  } catch (err) {
    console.error('getSessions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── getTeachers ──────────────────────────────────────────────────────────────
// Returns list of all teachers so admins can assign sessions to them.
const getTeachers = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, IFNULL(school,'') as school FROM admins WHERE role = 'teacher' ORDER BY school, name"
    );
    res.json({ teachers: rows });
  } catch (err) {
    console.error('getTeachers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── createSession ────────────────────────────────────────────────────────────
// Admin/main_admin can optionally pass teacher_id to assign the session to a
// specific teacher. If omitted, the session belongs to the logged-in user.
const createSession = async (req, res) => {
  const { session_name, teacher_id, quiz_settings, crossword_settings, cp3_settings } = req.body;

  if (!session_name || typeof session_name !== 'string' || session_name.trim().length === 0)
    return res.status(400).json({ error: 'Session name required' });
  if (session_name.trim().length > 80)
    return res.status(400).json({ error: 'Session name too long (max 80 characters)' });

  try {
    // Determine owner: admin can assign to a teacher
    let ownerId = req.admin.id;
    if (teacher_id && ['admin', 'main_admin'].includes(req.admin.role)) {
      const tid = parseInt(teacher_id, 10);
      if (tid && tid > 0) {
        const [teacherRows] = await db.query(
          "SELECT id FROM admins WHERE id = ? AND role = 'teacher'", [tid]
        );
        if (teacherRows.length === 0)
          return res.status(400).json({ error: 'Teacher not found' });
        ownerId = tid;
      }
    }
    const unique_token = await generateCode();

    const [result] = await db.query(
      'INSERT INTO game_sessions (admin_id, session_name, unique_token) VALUES (?, ?, ?)',
      [ownerId, session_name.trim(), unique_token]
    );

    const sessionId = result.insertId;

    if (quiz_settings) {
      const qTimer = safeInt(quiz_settings.timer_seconds, 15, 5, 120);
      const qOrder = ['shuffle', 'sequential'].includes(quiz_settings.question_order) ? quiz_settings.question_order : 'shuffle';
      const qCount = safeInt(quiz_settings.question_count, 10, 1, 100);
      const qMin   = safeInt(quiz_settings.minimum_correct, 0, 0, 100);
      const qSel   = JSON.stringify(quiz_settings.selected_questions || []);
      await db.query(
        `INSERT INTO quiz_settings (session_id, timer_seconds, question_order, question_count, minimum_correct, selected_questions)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           timer_seconds=VALUES(timer_seconds), question_order=VALUES(question_order),
           question_count=VALUES(question_count), minimum_correct=VALUES(minimum_correct),
           selected_questions=VALUES(selected_questions)`,
        [sessionId, qTimer, qOrder, qCount, qMin, qSel]
      );
    }

    if (crossword_settings) {
      const cwCount = safeInt(crossword_settings.word_count, 8, 3, 50);
      const cwSel   = JSON.stringify(crossword_settings.selected_words || []);
      const cwMin   = safeInt(crossword_settings.minimum_correct, 0, 0, 50);
      await db.query(
        `INSERT INTO crossword_settings (session_id, word_count, selected_words, minimum_correct)
         VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE
           word_count=VALUES(word_count), selected_words=VALUES(selected_words),
           minimum_correct=VALUES(minimum_correct)`,
        [sessionId, cwCount, cwSel, cwMin]
      );
    }

    if (cp3_settings) {
      const cp3Timer = safeInt(cp3_settings.timer_seconds, 60, 10, 600);
      const cp3Score = safeInt(cp3_settings.target_score, 0, 0, 9999);
      await db.query(
        `INSERT INTO cp3_settings (session_id, timer_seconds, target_score)
         VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE
           timer_seconds=VALUES(timer_seconds), target_score=VALUES(target_score)`,
        [sessionId, cp3Timer, cp3Score]
      );
    }

    res.status(201).json({ message: 'Session created!', sessionId, unique_token });
  } catch (err) {
    console.error('createSession error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── updateSession ────────────────────────────────────────────────────────────
const updateSession = async (req, res) => {
  const { is_active, session_name, quiz_settings, crossword_settings, cp3_settings } = req.body;
  const sessionId = req.params.id;

  try {
    const [rows] = await db.query('SELECT admin_id FROM game_sessions WHERE id = ?', [sessionId]);
    if (rows.length === 0)
      return res.status(404).json({ error: 'Session not found' });
    if (req.admin.role !== 'main_admin' && req.admin.role !== 'admin' && rows[0].admin_id !== req.admin.id)
      return res.status(403).json({ error: 'You can only edit your own sessions' });

    if (is_active !== undefined) {
      const isOwner = rows[0].admin_id === req.admin.id;
      const isAdminOrAbove = req.admin.role === 'main_admin' || req.admin.role === 'admin';
      if (!isAdminOrAbove && !isOwner)
        return res.status(403).json({ error: 'Only Admins or the session owner can activate or deactivate session codes' });
      await db.query('UPDATE game_sessions SET is_active = ? WHERE id = ?', [!!is_active, sessionId]);
    }

    if (session_name !== undefined) {
      if (typeof session_name !== 'string' || session_name.trim().length === 0)
        return res.status(400).json({ error: 'Invalid session name' });
      if (session_name.trim().length > 80)
        return res.status(400).json({ error: 'Session name too long (max 80 characters)' });
      await db.query('UPDATE game_sessions SET session_name = ? WHERE id = ?', [session_name.trim(), sessionId]);
    }

    if (quiz_settings) {
      await db.query(
        'UPDATE quiz_settings SET timer_seconds=?, question_order=?, question_count=?, minimum_correct=?, selected_questions=? WHERE session_id=?',
        [
          safeInt(quiz_settings.timer_seconds, 15, 5, 120),
          ['shuffle', 'sequential'].includes(quiz_settings.question_order) ? quiz_settings.question_order : 'shuffle',
          safeInt(quiz_settings.question_count, 10, 1, 100),
          safeInt(quiz_settings.minimum_correct, 0, 0, 100),
          JSON.stringify(quiz_settings.selected_questions || []),
          sessionId
        ]
      );
    }

    if (crossword_settings) {
      await db.query(
        'UPDATE crossword_settings SET word_count=?, selected_words=?, minimum_correct=? WHERE session_id=?',
        [
          safeInt(crossword_settings.word_count, 8, 3, 50),
          JSON.stringify(crossword_settings.selected_words || []),
          safeInt(crossword_settings.minimum_correct, 0, 0, 50),
          sessionId
        ]
      );
    }

    if (cp3_settings) {
      await db.query(
        'UPDATE cp3_settings SET timer_seconds=?, target_score=? WHERE session_id=?',
        [
          safeInt(cp3_settings.timer_seconds, 60, 10, 600),
          safeInt(cp3_settings.target_score, 0, 0, 9999),
          sessionId
        ]
      );
    }

    res.json({ message: 'Session updated' });
  } catch (err) {
    console.error('updateSession error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── deleteSession ────────────────────────────────────────────────────────────
const deleteSession = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT admin_id FROM game_sessions WHERE id = ?', [req.params.id]);
    if (rows.length === 0)
      return res.status(404).json({ error: 'Session not found' });

    if (req.admin.role !== 'main_admin' && req.admin.role !== 'admin' && rows[0].admin_id !== req.admin.id)
      return res.status(403).json({ error: 'You can only delete your own sessions' });

    await db.query('DELETE FROM game_sessions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── validateSession ──────────────────────────────────────────────────────────
const validateSession = async (req, res) => {
  const { token } = req.params;
  if (!token || !/^\d{4}$/.test(token))
    return res.status(400).json({ error: 'Invalid session code format' });

  try {
    const [rows] = await db.query(
      'SELECT * FROM game_sessions WHERE unique_token = ? AND is_active = true',
      [token]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Invalid code or session inactive' });

    res.json({ session: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getSessions, getTeachers, createSession, updateSession, deleteSession, validateSession };
