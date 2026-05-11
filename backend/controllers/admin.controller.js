const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logActivity } = require('./activity.controller');
const { sendInviteEmail } = require('../services/email.service');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── getPlayers ───────────────────────────────────────────────────────────────
const getPlayers = async (req, res) => {
  try {
    const { school, session_id, month } = req.query;
    const isTeacher = req.admin.role === 'teacher';
    const conditions = [];
    const params = [];

    if (isTeacher) {
      conditions.push('s.admin_id = ?');
      params.push(req.admin.id);
    } else if (school) {
      conditions.push('a.school = ?');
      params.push(school);
    }
    if (session_id) { conditions.push('p.session_id = ?'); params.push(session_id); }
    if (month)      { conditions.push('s.session_month = ?'); params.push(month); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.query(`
      SELECT p.*, s.session_name, s.session_month, s.unique_token as game_code,
        a.name as admin_name, a.school,
        MAX(CASE WHEN ca.checkpoint_number = 1 THEN ca.completed END) as cp1_completed,
        MAX(CASE WHEN ca.checkpoint_number = 1 THEN ca.attempts  END) as cp1_attempts,
        MAX(CASE WHEN ca.checkpoint_number = 2 THEN ca.completed END) as cp2_completed,
        MAX(CASE WHEN ca.checkpoint_number = 2 THEN ca.attempts  END) as cp2_attempts,
        MAX(CASE WHEN ca.checkpoint_number = 3 THEN ca.completed END) as cp3_completed,
        MAX(CASE WHEN ca.checkpoint_number = 3 THEN ca.attempts  END) as cp3_attempts,
        MAX(qs.score) as quiz_score, MAX(qs.correct_answers) as quiz_correct,
        MAX(qs.total_questions) as quiz_total, MAX(cp3s.score) as cp3_score
      FROM players p
      JOIN game_sessions s ON p.session_id = s.id
      JOIN admins a ON s.admin_id = a.id
      LEFT JOIN checkpoint_attempts ca ON ca.player_id = p.id
      LEFT JOIN quiz_scores qs ON qs.player_id = p.id
      LEFT JOIN cp3_scores cp3s ON cp3s.player_id = p.id
      ${where}
      GROUP BY p.id ORDER BY p.joined_at DESC
    `, params);

    const [schoolRows] = await db.query(
      'SELECT DISTINCT school FROM admins WHERE school IS NOT NULL AND school != "" ORDER BY school'
    );
    const [sessionRows] = await db.query(
      isTeacher
        ? 'SELECT id, session_name, session_month FROM game_sessions WHERE admin_id = ? ORDER BY session_name'
        : 'SELECT id, session_name, session_month FROM game_sessions ORDER BY session_name',
      isTeacher ? [req.admin.id] : []
    );

    res.json({ players: rows, schools: schoolRows.map(r => r.school), sessions: sessionRows });
  } catch (err) {
    console.error('getPlayers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── downloadCSV ──────────────────────────────────────────────────────────────
const downloadCSV = async (req, res) => {
  try {
    const isTeacher = req.admin.role === 'teacher';
    const teacherClause = isTeacher ? 'AND s.admin_id = ?' : '';
    const teacherParam = isTeacher ? [req.admin.id] : [];

    const [rows] = await db.query(`
      SELECT p.nickname, s.session_name, s.session_month, a.school, p.joined_at,
        MAX(CASE WHEN ca.checkpoint_number = 1 THEN ca.completed END) as cp1_completed,
        MAX(CASE WHEN ca.checkpoint_number = 1 THEN ca.attempts  END) as cp1_attempts,
        MAX(CASE WHEN ca.checkpoint_number = 2 THEN ca.completed END) as cp2_completed,
        MAX(CASE WHEN ca.checkpoint_number = 2 THEN ca.attempts  END) as cp2_attempts,
        MAX(CASE WHEN ca.checkpoint_number = 3 THEN ca.completed END) as cp3_completed,
        MAX(CASE WHEN ca.checkpoint_number = 3 THEN ca.attempts  END) as cp3_attempts,
        MAX(qs.score) as quiz_score, MAX(qs.correct_answers) as quiz_correct,
        MAX(cp3.score) as cp3_score
      FROM players p
      JOIN game_sessions s ON p.session_id = s.id
      JOIN admins a ON s.admin_id = a.id
      LEFT JOIN checkpoint_attempts ca ON ca.player_id = p.id
      LEFT JOIN quiz_scores qs ON qs.player_id = p.id
      LEFT JOIN cp3_scores cp3 ON cp3.player_id = p.id
      WHERE 1=1 ${teacherClause}
      GROUP BY p.id ORDER BY s.session_name, p.nickname
    `, teacherParam);

    const csvEscape = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n'))
        return '"' + str.replace(/"/g, '""') + '"';
      return str;
    };
    const headers = ['Nickname','Session','Month','School','Joined At','CP1 Completed','CP1 Attempts','CP2 Completed','CP2 Attempts','CP3 Completed','CP3 Attempts','Quiz Score','Quiz Correct','Food Game Score'];
    const csvRows = [headers.map(csvEscape).join(',')];
    rows.forEach(r => {
      csvRows.push([r.nickname,r.session_name,r.session_month||'',r.school||'',
        new Date(r.joined_at).toLocaleDateString(),
        r.cp1_completed?'Yes':'No',r.cp1_attempts||0,
        r.cp2_completed?'Yes':'No',r.cp2_attempts||0,
        r.cp3_completed?'Yes':'No',r.cp3_attempts||0,
        r.quiz_score||0,r.quiz_correct||0,r.cp3_score||0
      ].map(csvEscape).join(','));
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=player_data.csv');
    res.send(csvRows.join('\n'));
    await logActivity(req.admin.id, 'Downloaded player data CSV');
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ─── getAnalytics ─────────────────────────────────────────────────────────────
const getAnalytics = async (req, res) => {
  try {
    const isTeacher = req.admin.role === 'teacher';
    const { school } = req.query;
    const conditions = [];
    const params = [];

    if (isTeacher)       { conditions.push('s.admin_id = ?'); params.push(req.admin.id); }
    else if (school)     { conditions.push('a.school = ?');   params.push(school); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const wAnd  = where ? where + ' AND ' : 'WHERE ';

    const [[{ total_players }]]  = await db.query(`SELECT COUNT(DISTINCT p.id) as total_players FROM players p JOIN game_sessions s ON p.session_id=s.id JOIN admins a ON s.admin_id=a.id ${where}`, params);
    const [[{ total_sessions }]] = await db.query(`SELECT COUNT(DISTINCT s.id) as total_sessions FROM game_sessions s JOIN admins a ON s.admin_id=a.id ${where}`, params);
    const [[{ cp1_completed }]]  = await db.query(`SELECT COUNT(*) as cp1_completed FROM checkpoint_attempts ca JOIN players p ON ca.player_id=p.id JOIN game_sessions s ON p.session_id=s.id JOIN admins a ON s.admin_id=a.id ${wAnd}ca.checkpoint_number=1 AND ca.completed=1`, params);
    const [[{ cp2_completed }]]  = await db.query(`SELECT COUNT(*) as cp2_completed FROM checkpoint_attempts ca JOIN players p ON ca.player_id=p.id JOIN game_sessions s ON p.session_id=s.id JOIN admins a ON s.admin_id=a.id ${wAnd}ca.checkpoint_number=2 AND ca.completed=1`, params);
    const [[{ cp3_completed }]]  = await db.query(`SELECT COUNT(*) as cp3_completed FROM checkpoint_attempts ca JOIN players p ON ca.player_id=p.id JOIN game_sessions s ON p.session_id=s.id JOIN admins a ON s.admin_id=a.id ${wAnd}ca.checkpoint_number=3 AND ca.completed=1`, params);

    const [players] = await db.query(`
      SELECT p.*, s.session_name, s.session_month, a.school, a.name as admin_name,
        MAX(CASE WHEN ca.checkpoint_number = 1 THEN ca.completed END) as cp1_completed,
        MAX(CASE WHEN ca.checkpoint_number = 1 THEN ca.attempts  END) as cp1_attempts,
        MAX(CASE WHEN ca.checkpoint_number = 2 THEN ca.completed END) as cp2_completed,
        MAX(CASE WHEN ca.checkpoint_number = 2 THEN ca.attempts  END) as cp2_attempts,
        MAX(CASE WHEN ca.checkpoint_number = 3 THEN ca.completed END) as cp3_completed,
        MAX(CASE WHEN ca.checkpoint_number = 3 THEN ca.attempts  END) as cp3_attempts,
        MAX(qs.score) as quiz_score, MAX(qs.correct_answers) as quiz_correct,
        MAX(qs.total_questions) as quiz_total, MAX(cp3s.score) as cp3_score
      FROM players p
      JOIN game_sessions s ON p.session_id=s.id
      JOIN admins a ON s.admin_id=a.id
      LEFT JOIN checkpoint_attempts ca ON ca.player_id=p.id
      LEFT JOIN quiz_scores qs ON qs.player_id=p.id
      LEFT JOIN cp3_scores cp3s ON cp3s.player_id=p.id
      ${where} GROUP BY p.id ORDER BY p.joined_at DESC
    `, params);

    const [schoolRows] = await db.query('SELECT DISTINCT school FROM admins WHERE school IS NOT NULL AND school != "" ORDER BY school');
    res.json({ total_players, total_sessions, cp1_completed, cp2_completed, cp3_completed, players, schools: schoolRows.map(r => r.school) });
  } catch (err) {
    console.error('getAnalytics error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── compareSessions ──────────────────────────────────────────────────────────
const compareSessions = async (req, res) => {
  const { session_a, session_b } = req.query;
  if (!session_a || !session_b)
    return res.status(400).json({ error: 'session_a and session_b are required' });
  if (session_a === session_b)
    return res.status(400).json({ error: 'Choose two different sessions' });

  try {
    const isTeacher = req.admin.role === 'teacher';
    if (isTeacher) {
      const [owned] = await db.query(
        'SELECT id FROM game_sessions WHERE id IN (?,?) AND admin_id = ?',
        [session_a, session_b, req.admin.id]
      );
      if (owned.length < 2)
        return res.status(403).json({ error: 'You can only compare your own sessions' });
    }

    const fetchData = async (sid) => {
      const [[session]] = await db.query(
        `SELECT s.id,s.session_name,s.session_month,s.unique_token,a.name as admin_name,a.school
         FROM game_sessions s JOIN admins a ON s.admin_id=a.id WHERE s.id=?`, [sid]
      );
      if (!session) return null;
      const [players] = await db.query(`
        SELECT p.*,
          MAX(CASE WHEN ca.checkpoint_number=1 THEN ca.completed END) as cp1_completed,
          MAX(CASE WHEN ca.checkpoint_number=1 THEN ca.attempts  END) as cp1_attempts,
          MAX(CASE WHEN ca.checkpoint_number=2 THEN ca.completed END) as cp2_completed,
          MAX(CASE WHEN ca.checkpoint_number=2 THEN ca.attempts  END) as cp2_attempts,
          MAX(CASE WHEN ca.checkpoint_number=3 THEN ca.completed END) as cp3_completed,
          MAX(CASE WHEN ca.checkpoint_number=3 THEN ca.attempts  END) as cp3_attempts,
          MAX(qs.score) as quiz_score, MAX(qs.correct_answers) as quiz_correct,
          MAX(qs.total_questions) as quiz_total, MAX(cp3s.score) as cp3_score
        FROM players p
        LEFT JOIN checkpoint_attempts ca ON ca.player_id=p.id
        LEFT JOIN quiz_scores qs ON qs.player_id=p.id
        LEFT JOIN cp3_scores cp3s ON cp3s.player_id=p.id
        WHERE p.session_id=? GROUP BY p.id
      `, [sid]);
      const total = players.length;
      const pct = (n) => total ? Math.round(n/total*100) : 0;
      const avg = (arr) => arr.length ? Math.round(arr.reduce((s,v)=>s+v,0)/arr.length) : 0;
      // avg_quiz is a raw score (e.g. 7 correct out of 10).
      // Normalise to 0-100 using quiz_total so the radar chart stays on a % scale.
      const avgQuizRaw = total ? Math.round(players.reduce((s,p)=>s+(p.quiz_score||0),0)/total) : 0;
      const avgQuizTotal = total ? Math.round(players.reduce((s,p)=>s+(p.quiz_total||0),0)/total) : 0;
      const avgQuizPct = avgQuizTotal > 0 ? Math.round(avgQuizRaw / avgQuizTotal * 100) : 0;
      // avg_cp3 is a raw game score (can be > 100). Use cp3_settings.target_score as ceiling if available,
      // otherwise cap to 5000 for the radar chart normalisation.
      const avgCp3Raw = avg(players.filter(p=>p.cp3_score!=null).map(p=>p.cp3_score));
      const cp3Ceiling = 5000;
      const avgCp3Pct = Math.min(Math.round(avgCp3Raw / cp3Ceiling * 100), 100);
      return {
        session, players,
        stats: {
          total,
          cp1_rate: pct(players.filter(p=>p.cp1_completed).length),
          cp2_rate: pct(players.filter(p=>p.cp2_completed).length),
          cp3_rate: pct(players.filter(p=>p.cp3_completed).length),
          avg_quiz:     avgQuizRaw,
          avg_quiz_pct: avgQuizPct,
          avg_cp3:      avgCp3Raw,
          avg_cp3_pct:  avgCp3Pct,
          avg_cp1_att:  avg(players.filter(p=>p.cp1_attempts>0).map(p=>p.cp1_attempts||0)),
          avg_cp2_att:  avg(players.filter(p=>p.cp2_attempts>0).map(p=>p.cp2_attempts||0)),
          avg_cp3_att:  avg(players.filter(p=>p.cp3_attempts>0).map(p=>p.cp3_attempts||0)),
        }
      };
    };

    const [dataA, dataB] = await Promise.all([fetchData(session_a), fetchData(session_b)]);
    if (!dataA || !dataB) return res.status(404).json({ error: 'One or both sessions not found' });
    res.json({ session_a: dataA, session_b: dataB });
  } catch (err) {
    console.error('compareSessions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── getTeacherSessions ───────────────────────────────────────────────────────
// Month is auto-derived from players.joined_at — no manual input from admin.
// The same session used in Jan and March shows under both months automatically.
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const ymToLabel = (ym) => {
  // ym is 'YYYY-MM' e.g. '2026-01' → 'January 2026'
  const [year, month] = ym.split('-').map(Number);
  return (MONTH_NAMES[month - 1] || ym) + ' ' + year;
};

const getTeacherSessions = async (req, res) => {
  try {
    const isTeacher = req.admin.role === 'teacher';
    const cond = isTeacher ? 'WHERE s.admin_id = ?' : '';
    const params = isTeacher ? [req.admin.id] : [];

    // Step 1: fetch all sessions (no aggregation — avoid ONLY_FULL_GROUP_BY issues)
    const [sessions] = await db.query(`
      SELECT s.id, s.session_name, s.unique_token, s.is_active, s.created_at,
             a.id as admin_id, a.name as admin_name, IFNULL(a.school,'') as school
      FROM game_sessions s
      JOIN admins a ON s.admin_id = a.id
      ${cond}
      ORDER BY a.school, a.name, s.session_name
    `, params);

    // Step 2: fetch player counts per session
    const sessionIds = sessions.map(s => s.id);
    const playerCountMap = {};
    const playerMonthCountMap = {};
    const usageBySession = {};

    if (sessionIds.length > 0) {
      const ph = sessionIds.map(() => '?').join(',');

      // Count players per session
      const [countRows] = await db.query(
        `SELECT session_id, COUNT(*) as cnt FROM players WHERE session_id IN (${ph}) GROUP BY session_id`,
        sessionIds
      );
      countRows.forEach(r => { playerCountMap[r.session_id] = Number(r.cnt); });

      // Find which YYYY-MM each session was used (only group by session_id + ym — both in SELECT)
      const [usageRows] = await db.query(
        `SELECT session_id, DATE_FORMAT(joined_at, '%Y-%m') as ym, COUNT(*) as cnt
         FROM players
         WHERE session_id IN (${ph})
         GROUP BY session_id, ym
         ORDER BY session_id, ym`,
        sessionIds
      );
      usageRows.forEach(r => {
        if (!usageBySession[r.session_id]) usageBySession[r.session_id] = [];
        usageBySession[r.session_id].push(r.ym);
        playerMonthCountMap[`${r.session_id}-${r.ym}`] = Number(r.cnt);
      });
    }

    // Step 3: attach counts + usage months to each session
    sessions.forEach(s => {
      s.player_count = playerCountMap[s.id] || 0;
      s.usage_months = (usageBySession[s.id] || []).map(ym => ({ ym, label: ymToLabel(ym) }));
    });

    if (isTeacher) {
      // Group sessions by the month they were actually used.
      // Sessions with no players yet → 'Belum Digunakan'.
      const byMonth = {};
      sessions.forEach(s => {
        if (s.usage_months.length === 0) {
          if (!byMonth['Belum Digunakan']) byMonth['Belum Digunakan'] = [];
          byMonth['Belum Digunakan'].push(s);
        } else {
          s.usage_months.forEach(({ ym, label }) => {
            if (!byMonth[label]) byMonth[label] = [];
            byMonth[label].push({
              ...s,
              _ym: ym,
              player_count: playerMonthCountMap[`${s.id}-${ym}`] || 0
            });
          });
        }
      });
      // Sort chronologically (YYYY-MM string sort works naturally)
      const sortedByMonth = Object.fromEntries(
        Object.entries(byMonth).sort(([a], [b]) => {
          if (a === 'Belum Digunakan') return 1;
          if (b === 'Belum Digunakan') return -1;
          return a.localeCompare(b);
        })
      );
      return res.json({ school: req.admin.school || '', admin_name: req.admin.name, by_month: sortedByMonth, sessions });
    }

    // Admin view: group by school → teacher → month
    const bySchool = {};
    sessions.forEach(s => {
      const school   = s.school || 'Tiada Sekolah';
      const teacher  = s.admin_name;
      const months   = s.usage_months.length > 0 ? s.usage_months.map(u => u.label) : ['Belum Digunakan'];
      if (!bySchool[school]) bySchool[school] = {};
      if (!bySchool[school][teacher]) bySchool[school][teacher] = { admin_id: s.admin_id, months: {} };
      months.forEach(month => {
        if (!bySchool[school][teacher].months[month]) bySchool[school][teacher].months[month] = [];
        const usage = s.usage_months.find(u => u.label === month);
        bySchool[school][teacher].months[month].push(usage
          ? { ...s, _ym: usage.ym, player_count: playerMonthCountMap[`${s.id}-${usage.ym}`] || 0 }
          : s);
      });
    });
    res.json({ by_school: bySchool, sessions });
  } catch (err) {
    console.error('getTeacherSessions error:', err.message, err.stack);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};

// ─── getSessionPlayers ────────────────────────────────────────────────────────
const getSessionPlayers = async (req, res) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  if (!sessionId) return res.status(400).json({ error: 'Invalid session ID' });
  const { month } = req.query;
  if (month && !/^\d{4}-\d{2}$/.test(month))
    return res.status(400).json({ error: 'Invalid month format' });
  try {
    const isTeacher = req.admin.role === 'teacher';
    if (isTeacher) {
      const [rows] = await db.query('SELECT admin_id FROM game_sessions WHERE id=?', [sessionId]);
      if (!rows.length || rows[0].admin_id !== req.admin.id)
        return res.status(403).json({ error: 'Access denied' });
    }
    const monthClause = month ? "AND DATE_FORMAT(p.joined_at, '%Y-%m') = ?" : '';
    const queryParams = month ? [sessionId, month] : [sessionId];
    const [players] = await db.query(`
      SELECT p.*,
        MAX(CASE WHEN ca.checkpoint_number=1 THEN ca.completed END) as cp1_completed,
        MAX(CASE WHEN ca.checkpoint_number=1 THEN ca.attempts  END) as cp1_attempts,
        MAX(CASE WHEN ca.checkpoint_number=2 THEN ca.completed END) as cp2_completed,
        MAX(CASE WHEN ca.checkpoint_number=2 THEN ca.attempts  END) as cp2_attempts,
        MAX(CASE WHEN ca.checkpoint_number=3 THEN ca.completed END) as cp3_completed,
        MAX(CASE WHEN ca.checkpoint_number=3 THEN ca.attempts  END) as cp3_attempts,
        MAX(qs.score) as quiz_score, MAX(qs.correct_answers) as quiz_correct,
        MAX(qs.total_questions) as quiz_total, MAX(cp3s.score) as cp3_score
      FROM players p
      LEFT JOIN checkpoint_attempts ca ON ca.player_id=p.id
      LEFT JOIN quiz_scores qs ON qs.player_id=p.id
      LEFT JOIN cp3_scores cp3s ON cp3s.player_id=p.id
      WHERE p.session_id=? ${monthClause} GROUP BY p.id ORDER BY p.nickname
    `, queryParams);
    res.json({ players });
  } catch (err) {
    console.error('getSessionPlayers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── getAllAdmins ─────────────────────────────────────────────────────────────
const getAllAdmins = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id,name,email,role,school,created_at FROM admins ORDER BY role DESC, created_at ASC');
    const [invites] = await db.query('SELECT * FROM admin_invitations WHERE used=FALSE AND expires_at>NOW() ORDER BY created_at DESC');
    res.json({ admins: rows, pending_invites: invites });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ─── inviteAdmin ──────────────────────────────────────────────────────────────
const inviteAdmin = async (req, res) => {
  if (!['main_admin','admin'].includes(req.admin.role))
    return res.status(403).json({ error: 'You do not have permission to invite users' });

  const { email, role, school } = req.body;
  const inviteRole = ['admin','teacher'].includes(role) ? role : 'admin';

  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Email required' });
  if (email.length > 120) return res.status(400).json({ error: 'Email too long (max 120 characters)' });
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });
  if (inviteRole === 'teacher' && (!school || typeof school !== 'string' || !school.trim()))
    return res.status(400).json({ error: 'School name is required when inviting a teacher' });

  const cleanSchool = (inviteRole === 'teacher' && school) ? school.trim().substring(0,120) : null;

  try {
    const [existing] = await db.query('SELECT id FROM admins WHERE email=?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'This email is already registered as an admin' });
    const [existingInvite] = await db.query('SELECT id FROM admin_invitations WHERE email=? AND used=FALSE AND expires_at>NOW()', [email]);
    if (existingInvite.length > 0) return res.status(400).json({ error: 'An invitation has already been sent to this email' });

    const token = jwt.sign({ email, type: 'admin_invite', role: inviteRole }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const expiresAt = new Date(Date.now() + 7*24*60*60*1000);
    await db.query('INSERT INTO admin_invitations (email,token,role,school,expires_at) VALUES (?,?,?,?,?)', [email, token, inviteRole, cleanSchool, expiresAt]);

    const inviteLink = `${process.env.ADMIN_URL||process.env.CLIENT_URL}/admin/register?token=${token}`;
    try { await sendInviteEmail(email, inviteLink); } catch(e) { console.error('Invite email failed:', e.message); }

    await logActivity(req.admin.id, 'Sent admin invitation', `Invited: ${email} (${inviteRole})${cleanSchool ? ' - '+cleanSchool : ''}`);
    res.json({ message: 'Invitation sent to ' + email });
  } catch (err) {
    console.error('Invite admin error:', err);
    res.status(500).json({ error: err.sqlMessage || 'Server error' });
  }
};

// ─── completeRegistration ─────────────────────────────────────────────────────
const completeRegistration = async (req, res) => {
  const { token, name, password } = req.body;
  if (!token || !name || !password) return res.status(400).json({ error: 'All fields required' });
  if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'Invalid name' });
  if (name.trim().length > 80) return res.status(400).json({ error: 'Name too long (max 80 characters)' });
  if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (password.length > 128) return res.status(400).json({ error: 'Password too long (max 128 characters)' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'admin_invite') return res.status(400).json({ error: 'Invalid invitation token' });
    const [invites] = await db.query('SELECT * FROM admin_invitations WHERE token=? AND used=FALSE AND expires_at>NOW()', [token]);
    if (!invites.length) return res.status(400).json({ error: 'Invitation has expired or already been used' });

    const { email, role: inviteRole, school: inviteSchool } = invites[0];
    const [existing] = await db.query('SELECT id FROM admins WHERE email=?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'This email is already registered' });

    const role = inviteRole || decoded.role || 'admin';
    const password_hash = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO admins (name,email,password_hash,role,school) VALUES (?,?,?,?,?)',
      [name.trim(), email, password_hash, role, inviteSchool||null]);
    await db.query('UPDATE admin_invitations SET used=TRUE WHERE token=?', [token]);
    res.json({ message: 'Account created successfully! You can now login.' });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
      return res.status(400).json({ error: 'Invalid or expired invitation link' });
    console.error('Complete registration error:', err);
    res.status(500).json({ error: err.sqlMessage || 'Server error' });
  }
};

// ─── verifyInviteToken ────────────────────────────────────────────────────────
const verifyInviteToken = async (req, res) => {
  const { token } = req.params;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'admin_invite') return res.status(400).json({ error: 'Invalid token' });
    const [invites] = await db.query('SELECT * FROM admin_invitations WHERE token=? AND used=FALSE AND expires_at>NOW()', [token]);
    if (!invites.length) return res.status(400).json({ error: 'Invitation expired or already used' });
    res.json({ email: invites[0].email, role: invites[0].role||decoded.role||'admin', school: invites[0].school||null, valid: true });
  } catch (err) { res.status(400).json({ error: 'Invalid or expired invitation link' }); }
};

// ─── deleteAdmin ──────────────────────────────────────────────────────────────
const deleteAdmin = async (req, res) => {
  if (req.admin.role !== 'main_admin') return res.status(403).json({ error: 'Only the Main Admin can remove admins' });
  const targetId = parseInt(req.params.id, 10);
  if (!targetId || targetId <= 0) return res.status(400).json({ error: 'Invalid admin ID' });
  if (targetId === req.admin.id) return res.status(400).json({ error: 'Cannot delete yourself!' });
  try {
    const [rows] = await db.query('SELECT name,email,role FROM admins WHERE id=?', [targetId]);
    if (!rows.length) return res.status(404).json({ error: 'Admin not found' });
    if (rows[0].role === 'main_admin') return res.status(403).json({ error: 'Cannot delete the main admin account' });
    await db.query('DELETE FROM admins WHERE id=?', [targetId]);
    await db.query('UPDATE game_sessions SET is_active=FALSE WHERE admin_id=?', [targetId]);
    await logActivity(req.admin.id, 'Deleted admin', `Deleted: ${rows[0].email}`);
    res.json({ message: 'Admin deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ─── updateProfile ────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  const { name, email } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'Name required' });
  if (name.trim().length > 80) return res.status(400).json({ error: 'Name too long' });
  if (!email || typeof email !== 'string' || email.length > 120) return res.status(400).json({ error: 'Invalid email' });
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });
  try {
    const [existing] = await db.query('SELECT id FROM admins WHERE email=? AND id!=?', [email, req.admin.id]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already in use by another admin' });
    await db.query('UPDATE admins SET name=?,email=? WHERE id=?', [name.trim(), email, req.admin.id]);
    await logActivity(req.admin.id, 'Updated profile');
    res.json({ message: 'Profile updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ─── changePassword ───────────────────────────────────────────────────────────
const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
  if (typeof new_password !== 'string' || new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (new_password.length > 128 || (typeof current_password === 'string' && current_password.length > 128))
    return res.status(400).json({ error: 'Password too long' });
  try {
    const [rows] = await db.query('SELECT password_hash FROM admins WHERE id=?', [req.admin.id]);
    const isMatch = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE admins SET password_hash=? WHERE id=?', [hash, req.admin.id]);
    await logActivity(req.admin.id, 'Changed password');
    res.json({ message: 'Password changed successfully' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ─── resendInvite ─────────────────────────────────────────────────────────────
const resendInvite = async (req, res) => {
  if (!['main_admin','admin'].includes(req.admin.role))
    return res.status(403).json({ error: 'You do not have permission to resend invitations' });
  try {
    const [invites] = await db.query('SELECT * FROM admin_invitations WHERE id=? AND used=FALSE AND expires_at>NOW()', [req.params.id]);
    if (!invites.length) return res.status(404).json({ error: 'Invitation not found or already used' });
    const invite = invites[0];
    const inviteRole = invite.role||'admin';
    const token = jwt.sign({ email: invite.email, type: 'admin_invite', role: inviteRole }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const newExpiry = new Date(Date.now() + 7*24*60*60*1000);
    await db.query('UPDATE admin_invitations SET token=?,expires_at=? WHERE id=?', [token, newExpiry, invite.id]);
    const inviteLink = `${process.env.ADMIN_URL||process.env.CLIENT_URL}/admin/register?token=${token}`;
    try { await sendInviteEmail(invite.email, inviteLink); } catch(e) { console.error('Resend email failed:', e.message); }
    res.json({ message: 'Invitation resent!' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ─── cancelInvite ─────────────────────────────────────────────────────────────
const cancelInvite = async (req, res) => {
  if (req.admin.role !== 'main_admin') return res.status(403).json({ error: 'Only the main admin can cancel invitations' });
  try {
    const [invites] = await db.query('SELECT id FROM admin_invitations WHERE id=?', [req.params.id]);
    if (!invites.length) return res.status(404).json({ error: 'Invitation not found' });
    await db.query('DELETE FROM admin_invitations WHERE id=?', [req.params.id]);
    res.json({ message: 'Invitation cancelled' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ─── deletePlayer ─────────────────────────────────────────────────────────────
const deletePlayer = async (req, res) => {
  if (!['main_admin','admin','teacher'].includes(req.admin.role))
    return res.status(403).json({ error: 'You do not have permission to delete players' });
  const targetId = parseInt(req.params.id, 10);
  if (!targetId || targetId <= 0) return res.status(400).json({ error: 'Invalid player ID' });
  try {
    const [rows] = await db.query('SELECT nickname,session_id FROM players WHERE id=?', [targetId]);
    if (!rows.length) return res.status(404).json({ error: 'Player not found' });
    if (req.admin.role === 'teacher') {
      const [sess] = await db.query('SELECT admin_id FROM game_sessions WHERE id=?', [rows[0].session_id]);
      if (!sess.length || sess[0].admin_id !== req.admin.id)
        return res.status(403).json({ error: 'You can only delete players from your own sessions' });
    }
    await db.query('DELETE FROM players WHERE id=?', [targetId]);
    await logActivity(req.admin.id, 'Deleted player', `Deleted player: ${rows[0].nickname} (id ${targetId})`);
    res.json({ message: 'Player deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ─── updateAdminRole ──────────────────────────────────────────────────────────
const updateAdminRole = async (req, res) => {
  if (req.admin.role !== 'main_admin') return res.status(403).json({ error: 'Only the Main Admin can change roles' });
  const targetId = parseInt(req.params.id, 10);
  if (!targetId || targetId <= 0) return res.status(400).json({ error: 'Invalid admin ID' });
  if (targetId === req.admin.id) return res.status(400).json({ error: 'Cannot change your own role' });
  const { role } = req.body;
  if (!['admin','teacher'].includes(role)) return res.status(400).json({ error: 'Role must be "admin" or "teacher"' });
  try {
    const [rows] = await db.query('SELECT name,email,role FROM admins WHERE id=?', [targetId]);
    if (!rows.length) return res.status(404).json({ error: 'Admin not found' });
    if (rows[0].role === 'main_admin') return res.status(403).json({ error: 'Cannot change the role of another main admin' });
    if (rows[0].role === role) return res.json({ message: `${rows[0].name} is already a ${role}` });
    await db.query('UPDATE admins SET role=? WHERE id=?', [role, targetId]);
    await logActivity(req.admin.id, 'Changed admin role', `Changed ${rows[0].email} from ${rows[0].role} to ${role}`);
    res.json({ message: `${rows[0].name}'s role changed to ${role === 'teacher' ? 'Teacher' : 'Admin'}` });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

module.exports = {
  getPlayers, downloadCSV, getAnalytics,
  compareSessions, getTeacherSessions, getSessionPlayers,
  getAllAdmins, inviteAdmin, resendInvite, cancelInvite,
  completeRegistration, verifyInviteToken,
  deleteAdmin, deletePlayer, updateProfile, changePassword, updateAdminRole,
};
