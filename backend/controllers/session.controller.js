const db = require('../db');

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

const normalizeMonth = (val) => {
  const n = parseInt(val, 10);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
};

const canAccessSession = (admin, session) => {
  if (['main_admin', 'admin'].includes(admin.role)) return true;
  return session.admin_id === admin.id;
};

const enrichSessionsWithSettings = async (sessions) => {
  if (sessions.length === 0) return sessions;

  const sessionIds = sessions.map(s => s.id);
  const placeholders = sessionIds.map(() => '?').join(',');

  const [qRows] = await db.query(`SELECT * FROM quiz_settings WHERE session_id IN (${placeholders})`, sessionIds);
  const [cRows] = await db.query(`SELECT * FROM crossword_settings WHERE session_id IN (${placeholders})`, sessionIds);
  const [cp3Rows] = await db.query(`SELECT * FROM cp3_settings WHERE session_id IN (${placeholders})`, sessionIds);

  const quizMap = Object.fromEntries(qRows.map(r => [r.session_id, r]));
  const crosswordMap = Object.fromEntries(cRows.map(r => [r.session_id, r]));
  const cp3Map = Object.fromEntries(cp3Rows.map(r => [r.session_id, r]));

  return sessions.map(s => ({
    ...s,
    month: s.session_month || new Date(s.created_at).getMonth() + 1,
    quiz_settings: quizMap[s.id] || {},
    crossword_settings: crosswordMap[s.id] || {},
    cp3_settings: cp3Map[s.id] || {}
  }));
};

const getSessions = async (req, res) => {
  try {
    const params = [];
    let where = '';
    if (req.admin.role === 'teacher') {
      where = 'WHERE s.admin_id = ?';
      params.push(req.admin.id);
    }

    const [sessions] = await db.query(
      `SELECT s.*, a.name as admin_name, a.school
       FROM game_sessions s
       JOIN admins a ON s.admin_id = a.id
       ${where}
       ORDER BY s.created_at DESC`,
      params
    );

    res.json({ sessions: await enrichSessionsWithSettings(sessions) });
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const createSession = async (req, res) => {
  const { session_name, session_month, quiz_settings, crossword_settings, cp3_settings } = req.body;

  if (!session_name || typeof session_name !== 'string' || session_name.trim().length === 0)
    return res.status(400).json({ error: 'Session name required' });
  if (session_name.trim().length > 80)
    return res.status(400).json({ error: 'Session name too long (max 80 characters)' });

  try {
    const unique_token = await generateCode();
    const month = normalizeMonth(session_month) || new Date().getMonth() + 1;
    const [result] = await db.query(
      'INSERT INTO game_sessions (admin_id, session_name, session_month, unique_token) VALUES (?, ?, ?, ?)',
      [req.admin.id, session_name.trim(), month, unique_token]
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

    res.status(201).json({ message: 'Session created!', sessionId, unique_token });
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateSession = async (req, res) => {
  const { is_active, session_name, session_month, quiz_settings, crossword_settings, cp3_settings } = req.body;
  const sessionId = req.params.id;

  try {
    const [rows] = await db.query('SELECT admin_id FROM game_sessions WHERE id = ?', [sessionId]);
    if (rows.length === 0)
      return res.status(404).json({ error: 'Session not found' });
    if (!canAccessSession(req.admin, rows[0]))
      return res.status(403).json({ error: 'You can only edit your own sessions' });

    if (is_active !== undefined) {
      if (!['main_admin', 'admin'].includes(req.admin.role))
        return res.status(403).json({ error: 'Only Admins can activate or deactivate session codes' });
      await db.query('UPDATE game_sessions SET is_active = ? WHERE id = ?', [!!is_active, sessionId]);
    }

    if (session_name !== undefined) {
      if (typeof session_name !== 'string' || session_name.trim().length === 0)
        return res.status(400).json({ error: 'Invalid session name' });
      if (session_name.trim().length > 80)
        return res.status(400).json({ error: 'Session name too long (max 80 characters)' });
      await db.query('UPDATE game_sessions SET session_name = ? WHERE id = ?', [session_name.trim(), sessionId]);
    }

    if (session_month !== undefined) {
      const month = normalizeMonth(session_month);
      if (!month) return res.status(400).json({ error: 'Session month must be between 1 and 12' });
      await db.query('UPDATE game_sessions SET session_month = ? WHERE id = ?', [month, sessionId]);
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
    console.error('Update session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteSession = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT admin_id FROM game_sessions WHERE id = ?', [req.params.id]);
    if (rows.length === 0)
      return res.status(404).json({ error: 'Session not found' });

    if (!canAccessSession(req.admin, rows[0]))
      return res.status(403).json({ error: 'You can only delete your own sessions' });

    await db.query('DELETE FROM game_sessions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Session deleted' });
  } catch (err) {
    console.error('Delete session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

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
    console.error('Validate session error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getTeacherSessions = async (req, res) => {
  try {
    const params = [];
    let where = '';
    if (req.admin.role === 'teacher') {
      where = 'WHERE s.admin_id = ?';
      params.push(req.admin.id);
    }

    const [sessions] = await db.query(
      `SELECT s.id, s.session_name, s.session_month, s.unique_token, s.is_active, s.created_at,
              a.id as teacher_id, a.name as teacher_name, a.school
       FROM game_sessions s
       JOIN admins a ON s.admin_id = a.id
       ${where}
       ORDER BY COALESCE(a.school, ''), a.name, COALESCE(s.session_month, MONTH(s.created_at)), s.created_at DESC`,
      params
    );

    if (sessions.length === 0) return res.json({ sessions: [], hierarchy: [] });

    const sessionIds = sessions.map(s => s.id);
    const placeholders = sessionIds.map(() => '?').join(',');
    const [players] = await db.query(
      `SELECT p.id, p.nickname, p.joined_at, p.session_id,
              MAX(CASE WHEN ca.checkpoint_number = 1 THEN ca.completed END) as cp1_completed,
              MAX(CASE WHEN ca.checkpoint_number = 2 THEN ca.completed END) as cp2_completed,
              MAX(CASE WHEN ca.checkpoint_number = 3 THEN ca.completed END) as cp3_completed
       FROM players p
       LEFT JOIN checkpoint_attempts ca ON ca.player_id = p.id
       WHERE p.session_id IN (${placeholders})
       GROUP BY p.id
       ORDER BY p.joined_at DESC`,
      sessionIds
    );

    const playersBySession = players.reduce((acc, player) => {
      acc[player.session_id] = acc[player.session_id] || [];
      acc[player.session_id].push(player);
      return acc;
    }, {});

    const enriched = sessions.map(session => ({
      ...session,
      month: session.session_month || new Date(session.created_at).getMonth() + 1,
      players: playersBySession[session.id] || []
    }));

    const schoolMap = new Map();
    enriched.forEach(session => {
      const schoolName = session.school || 'No school assigned';
      if (!schoolMap.has(schoolName)) schoolMap.set(schoolName, { school: schoolName, teachers: [] });
      const school = schoolMap.get(schoolName);
      let teacher = school.teachers.find(t => t.teacher_id === session.teacher_id);
      if (!teacher) {
        teacher = { teacher_id: session.teacher_id, teacher_name: session.teacher_name, months: [] };
        school.teachers.push(teacher);
      }
      let monthGroup = teacher.months.find(m => m.month === session.month);
      if (!monthGroup) {
        monthGroup = { month: session.month, sessions: [] };
        teacher.months.push(monthGroup);
      }
      monthGroup.sessions.push(session);
    });

    res.json({ sessions: enriched, hierarchy: Array.from(schoolMap.values()) });
  } catch (err) {
    console.error('Teacher sessions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getSessions, createSession, updateSession, deleteSession, validateSession, getTeacherSessions };
