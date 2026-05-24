const db = require('../db');
const bcrypt = require('bcryptjs');
const { logActivity } = require('./activity.controller');

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

// ─── getSessions ──────────────────────────────────────────────────────────────
// Teachers see sessions in two ways:
//   (a) Sessions they have already unlocked via reveal-code (teacher_session_access)
//   (b) Sessions not yet unlocked — shown so they CAN unlock them via reveal-code
//       (these are all sessions; teacher uses the password to prove they own them)
// main_admin / admin see everything.
const getSessions = async (req, res) => {
  try {
    const { search = '', status = 'all', sort = 'newest' } = req.query;
    // Explicitly list columns — include reveal_password_plain for display, never include reveal_password_hash
    let query = `
      SELECT
        s.id, s.admin_id, s.school_id, s.class_id, s.session_name, s.session_month,
        s.unique_token, s.is_active, s.created_at,
        s.reveal_password_plain,
        a.name AS admin_name,
        sch.school_name,
        c.class_name,
        c.teacher_id
      FROM game_sessions s
      JOIN admins a ON s.admin_id = a.id
      LEFT JOIN schools sch ON s.school_id = sch.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE 1=1
      `;
    const params = [];

    // Teachers see ALL sessions — they use reveal-code (password) to prove ownership.
    // No WHERE filter needed; the password modal is the access control.
    // (Previously filtered by teacher_id which was always the admin's id — so always 0 results.)

if (search.trim()) {
  query += `
    AND (
      s.session_name LIKE ?
      OR sch.school_name LIKE ?
      OR c.class_name LIKE ?
    )
  `;
  const keyword = `%${search.trim()}%`;
  params.push(keyword, keyword, keyword);
}

if (status === 'active') {
  query += ` AND s.is_active = TRUE`;
}

if (status === 'inactive') {
  query += ` AND s.is_active = FALSE`;
}

if (sort === 'oldest') {
  query += ` ORDER BY s.created_at ASC`;
} else if (sort === 'az') {
  query += ` ORDER BY sch.school_name ASC, c.class_name ASC, s.session_name ASC`;
} else if (sort === 'za') {
  query += ` ORDER BY sch.school_name DESC, c.class_name DESC, s.session_name DESC`;
} else {
  query += ` ORDER BY s.created_at DESC`;
}

    const [sessions] = await db.query(query, params);

    if (sessions.length === 0) return res.json({ sessions: [] });

    // Bulk-fetch all settings for the returned sessions in 3 queries total
    const sessionIds = sessions.map(s => s.id);
    const placeholders = sessionIds.map(() => '?').join(',');

    const [qRows] = await db.query(`SELECT * FROM quiz_settings      WHERE session_id IN (${placeholders})`, sessionIds);
    const [cRows] = await db.query(`SELECT * FROM crossword_settings  WHERE session_id IN (${placeholders})`, sessionIds);
    const [cp3Rows] = await db.query(`SELECT * FROM cp3_settings        WHERE session_id IN (${placeholders})`, sessionIds);

    const quizMap = Object.fromEntries(qRows.map(r => [r.session_id, r]));
    const crosswordMap = Object.fromEntries(cRows.map(r => [r.session_id, r]));
    const cp3Map = Object.fromEntries(cp3Rows.map(r => [r.session_id, r]));

    for (const s of sessions) {
      s.quiz_settings = quizMap[s.id] || {};
      s.crossword_settings = crosswordMap[s.id] || {};
      s.cp3_settings = cp3Map[s.id] || {};
    }

    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── createSession ────────────────────────────────────────────────────────────
const createSession = async (req, res) => {
  const { school_name, class_name, session_name, reveal_password, quiz_settings, crossword_settings, cp3_settings } = req.body;

  if (!session_name || typeof session_name !== 'string' || session_name.trim().length === 0)
    return res.status(400).json({ error: 'Session name required' });
  if (session_name.trim().length > 80)
    return res.status(400).json({ error: 'Session name too long (max 80 characters)' });

  try {
    const unique_token = await generateCode();

    if (!school_name?.trim()) {
      return res.status(400).json({ error: 'School name is required' });
    }

    if (!class_name?.trim()) {
      return res.status(400).json({ error: 'Class name is required' });
    }

    // Find existing school
    let [schoolRows] = await db.query(
      'SELECT id FROM schools WHERE school_name = ?',
      [school_name.trim()]
    );

    let schoolId;

    // Create school if not exist
    if (schoolRows.length > 0) {
      schoolId = schoolRows[0].id;
    } else {
      const [newSchool] = await db.query(
        'INSERT INTO schools (school_name) VALUES (?)',
        [school_name.trim()]
      );
      schoolId = newSchool.insertId;
    }

    // Find existing class
    let [classRows] = await db.query(
      'SELECT id FROM classes WHERE class_name = ? AND school_id = ?',
      [class_name.trim(), schoolId]
    );

    let classId;

    // Create class if not exist
    if (classRows.length > 0) {
      classId = classRows[0].id;
    } else {
      const [newClass] = await db.query(
        `INSERT INTO classes (school_id, teacher_id, class_name)
         VALUES (?, ?, ?)`,
        [schoolId, req.admin.id, class_name.trim()]
      );
      classId = newClass.insertId;
    }

    if (!reveal_password || reveal_password.length < 4) {
      return res.status(400).json({ error: 'Reveal password must be at least 4 characters' });
    }

    const revealPasswordHash = await bcrypt.hash(reveal_password, 10);

    // Create session
    const [result] = await db.query(
      `INSERT INTO game_sessions
       (admin_id, school_id, class_id, session_name, unique_token, reveal_password_hash, reveal_password_plain)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.admin.id, schoolId, classId, session_name.trim(), unique_token, revealPasswordHash, reveal_password]
    );
    const sessionId = result.insertId;

    if (quiz_settings) {
      await db.query(
        'INSERT INTO quiz_settings (session_id, timer_seconds, question_order, question_count, minimum_correct, selected_questions) VALUES (?,?,?,?,?,?)',
        [
          sessionId,
          safeInt(quiz_settings.timer_seconds, 15, 5, 120),
          ['shuffle', 'sequential'].includes(quiz_settings.question_order) ? quiz_settings.question_order : 'shuffle',
          safeInt(quiz_settings.question_count, 10, 1, 100),
          safeInt(quiz_settings.minimum_correct, 0, 0, 100),
          JSON.stringify(quiz_settings.selected_questions || [])
        ]
      );
    }

    if (crossword_settings) {
      await db.query(
        'INSERT INTO crossword_settings (session_id, word_count, selected_words, minimum_correct) VALUES (?,?,?,?)',
        [
          sessionId,
          safeInt(crossword_settings.word_count, 8, 3, 50),
          JSON.stringify(crossword_settings.selected_words || []),
          safeInt(crossword_settings.minimum_correct, 0, 0, 50)
        ]
      );
    }

    if (cp3_settings) {
      await db.query(
        'INSERT INTO cp3_settings (session_id, timer_seconds, target_score) VALUES (?,?,?)',
        [
          sessionId,
          safeInt(cp3_settings.timer_seconds, 60, 10, 600),
          safeInt(cp3_settings.target_score, 0, 0, 9999)
        ]
      );
    }

    await logActivity(req.admin.id, 'Created game session', `Created session "${session_name.trim()}" for ${school_name.trim()} / ${class_name.trim()}`);
    res.status(201).json({ message: 'Session created!', sessionId, unique_token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── updateSession ────────────────────────────────────────────────────────────
const updateSession = async (req, res) => {
  const { is_active, school_id, class_id, session_name, reveal_password, quiz_settings, crossword_settings, cp3_settings } = req.body;
  const sessionId = req.params.id;

  try {
    const [rows] = await db.query(
      `SELECT s.admin_id, s.session_name, c.teacher_id
       FROM game_sessions s
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.id = ?`,
      [sessionId]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Session not found' });
    if (req.admin.role !== 'main_admin' && rows[0].admin_id !== req.admin.id)
      return res.status(403).json({ error: 'You can only edit your own sessions' });

    // Allow admin and teacher to activate/deactivate sessions
    if (is_active !== undefined) {
      if (req.admin.role !== 'main_admin' && req.admin.role !== 'admin' && req.admin.role !== 'teacher')
        return res.status(403).json({ error: 'Only Admins or Teachers can activate or deactivate session codes' });
      await db.query('UPDATE game_sessions SET is_active = ? WHERE id = ?', [!!is_active, sessionId]);
      await logActivity(req.admin.id, !!is_active ? 'Activated game session' : 'Deactivated game session', `Session: ${rows[0].session_name}`);
    }

    if (school_id !== undefined || class_id !== undefined) {
      await db.query(
        'UPDATE game_sessions SET school_id = COALESCE(?, school_id), class_id = COALESCE(?, class_id) WHERE id = ?',
        [school_id || null, class_id || null, sessionId]
      );
    }

    if (session_name !== undefined) {
      if (typeof session_name !== 'string' || session_name.trim().length === 0)
        return res.status(400).json({ error: 'Invalid session name' });
      if (session_name.trim().length > 80)
        return res.status(400).json({ error: 'Session name too long (max 80 characters)' });
      await db.query('UPDATE game_sessions SET session_name = ? WHERE id = ?', [session_name.trim(), sessionId]);
    }

    if (reveal_password && reveal_password.trim().length >= 4) {
      const revealPasswordHash = await bcrypt.hash(reveal_password.trim(), 10);
      await db.query(
        'UPDATE game_sessions SET reveal_password_hash = ?, reveal_password_plain = ? WHERE id = ?',
        [revealPasswordHash, reveal_password.trim(), sessionId]
      );
    }

    if (quiz_settings) {
      await db.query(
        `INSERT INTO quiz_settings (session_id, timer_seconds, question_order, question_count, minimum_correct, selected_questions)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           timer_seconds=VALUES(timer_seconds), question_order=VALUES(question_order),
           question_count=VALUES(question_count), minimum_correct=VALUES(minimum_correct),
           selected_questions=VALUES(selected_questions)`,
        [
          sessionId,
          safeInt(quiz_settings.timer_seconds, 15, 5, 120),
          ['shuffle', 'sequential'].includes(quiz_settings.question_order) ? quiz_settings.question_order : 'shuffle',
          safeInt(quiz_settings.question_count, 10, 1, 100),
          safeInt(quiz_settings.minimum_correct, 0, 0, 100),
          JSON.stringify(quiz_settings.selected_questions || []),
        ]
      );
    }

    if (crossword_settings) {
      await db.query(
        `INSERT INTO crossword_settings (session_id, word_count, selected_words, minimum_correct)
         VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE
           word_count=VALUES(word_count), selected_words=VALUES(selected_words),
           minimum_correct=VALUES(minimum_correct)`,
        [
          sessionId,
          safeInt(crossword_settings.word_count, 8, 3, 50),
          JSON.stringify(crossword_settings.selected_words || []),
          safeInt(crossword_settings.minimum_correct, 0, 0, 50),
        ]
      );
    }

    if (cp3_settings) {
      await db.query(
        `INSERT INTO cp3_settings (session_id, timer_seconds, target_score)
         VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE
           timer_seconds=VALUES(timer_seconds), target_score=VALUES(target_score)`,
        [
          sessionId,
          safeInt(cp3_settings.timer_seconds, 60, 10, 600),
          safeInt(cp3_settings.target_score, 0, 0, 9999),
        ]
      );
    }

    if (is_active === undefined) {
      await logActivity(req.admin.id, 'Updated game session', `Updated session: ${rows[0].session_name}`);
    }
    res.json({ message: 'Session updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── deleteSession ────────────────────────────────────────────────────────────
const deleteSession = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.admin_id, s.session_name FROM game_sessions s WHERE s.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Session not found' });

    if (req.admin.role !== 'main_admin' && rows[0].admin_id !== req.admin.id)
      return res.status(403).json({ error: 'You can only delete your own sessions' });

    await db.query('DELETE FROM game_sessions WHERE id = ?', [req.params.id]);
    await logActivity(req.admin.id, 'Deleted game session', `Deleted session: ${rows[0].session_name}`);
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
      `SELECT id, session_name, unique_token, school_id, class_id, is_active
       FROM game_sessions WHERE unique_token = ? AND is_active = true`,
      [token]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Invalid code or session inactive' });

    res.json({ session: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── revealSessionCode ────────────────────────────────────────────────────────
// FIX: Removed teacher_id ownership check — the reveal password IS the
// authorisation mechanism. Any teacher with the correct password can unlock
// a session. Previously teacher_id was always the admin's id (set at creation),
// so teachers were always blocked with 403.
const revealSessionCode = async (req, res) => {
  const { password } = req.body;
  const sessionId = req.params.id;

  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  try {
    const [rows] = await db.query(
      `SELECT s.unique_token, s.reveal_password_hash
       FROM game_sessions s
       WHERE s.id = ?`,
      [sessionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = rows[0];

    if (!session.reveal_password_hash) {
      return res.status(400).json({ error: 'Reveal password not set for this session' });
    }

    const isMatch = await bcrypt.compare(password, session.reveal_password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Wrong password' });
    }

    // Record teacher access so they can be filtered to their sessions later
    if (req.admin.role === 'teacher') {
      await db.query(
        `INSERT IGNORE INTO teacher_session_access (teacher_id, session_id)
         VALUES (?, ?)`,
        [req.admin.id, sessionId]
      );
    }

    await logActivity(req.admin.id, 'Revealed session code', `Session ID: ${sessionId}`);
    res.json({ unique_token: session.unique_token });
  } catch (err) {
    console.error('Reveal code error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  validateSession,
  revealSessionCode
};