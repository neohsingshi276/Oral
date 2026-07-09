const db = require('../db');
const jwt = require('jsonwebtoken');

const MAP_MIN_X = 0;
const MAP_MAX_X = 5600;
const MAP_MIN_Y = 0;
const MAP_MAX_Y = 7600;
const START_X = 1376;
const START_Y = 6896;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeId = (val) => {
  const n = parseInt(val, 10);
  return isNaN(n) || n <= 0 ? null : n;
};

const createPlayerChatToken = (player) =>
  jwt.sign(
    {
      type: 'player_chat',
      player_id: player.id,
      session_id: player.session_id,
      nickname: player.nickname,
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

// ─── joinGame ─────────────────────────────────────────────────────────────────
// If the player sends their existing player_id (stored in localStorage) AND it
// matches the session + nickname, we resume their progress instead of creating
// a new record. Otherwise we always create a fresh player — duplicate nicknames
// in the same session are intentionally allowed so teachers can distinguish
// students by seating/context rather than being forced to use unique names.
const joinGame = async (req, res) => {
  const { token } = req.params;
  const { nickname, resume_player_id } = req.body;

  if (!nickname || typeof nickname !== 'string')
    return res.status(400).json({ error: 'Nickname required' });

  const cleanNick = nickname.trim().slice(0, 50);
  if (cleanNick.length < 1)
    return res.status(400).json({ error: 'Nickname cannot be empty' });

  if (!token || typeof token !== 'string' || token.length !== 4 || !/^\d{4}$/.test(token))
    return res.status(400).json({ error: 'Invalid session code' });

  try {
    const [sessions] = await db.query(
      'SELECT * FROM game_sessions WHERE unique_token = ? AND is_active = true',
      [token]
    );
    if (sessions.length === 0)
      return res.status(404).json({ error: 'Session not found or inactive' });

    const session = sessions[0];

    // ── Resume path: only if the client provides their own player ID ──────────
    const resumeId = safeId(resume_player_id);
    if (resumeId) {
      const [resumeRows] = await db.query(
        'SELECT * FROM players WHERE id = ? AND session_id = ?',
        [resumeId, session.id]
      );
      if (resumeRows.length > 0) {
        const p = {
          id: resumeRows[0].id,
          nickname: resumeRows[0].nickname,
          session_id: resumeRows[0].session_id,
          session_name: session.session_name,
        };
        return res.status(200).json({
          message: 'Resumed successfully',
          player: { ...p, chat_token: createPlayerChatToken(p) },
        });
      }
      // resume_player_id didn't match — fall through and create a new player
    }

    // ── New player path ───────────────────────────────────────────────────────
    const [result] = await db.query(
      'INSERT INTO players (session_id, nickname) VALUES (?, ?)',
      [session.id, cleanNick]
    );
    const playerId = result.insertId;

    await db.query(
      'INSERT INTO player_positions (player_id, pos_x, pos_y, last_checkpoint) VALUES (?, ?, ?, ?)',
      [playerId, START_X, START_Y, 0]
    );

    const player = {
      id: playerId,
      nickname: cleanNick,
      session_id: session.id,
      session_name: session.session_name,
    };

    for (let cp = 1; cp <= 3; cp++) {
      await db.query(
        'INSERT INTO checkpoint_attempts (player_id, session_id, checkpoint_number, attempts, completed) VALUES (?, ?, ?, 0, false)',
        [playerId, session.id, cp]
      );
    }

    res.status(201).json({
      message: 'Joined successfully',
      player: { ...player, chat_token: createPlayerChatToken(player) },
    });
  } catch (err) {
    console.error('Join game error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── ownsPlayer ───────────────────────────────────────────────────────────────
// FIX: Central ownership check — verifies that the player_id in the request
// matches the player_id encoded in the chat JWT (req.playerChat).
// This prevents any player from reading or writing another player's data.
const ownsPlayer = (req, player_id) =>
  req.playerChat && parseInt(req.playerChat.player_id, 10) === player_id;

// ─── savePosition ─────────────────────────────────────────────────────────────
// FIX: Added ownership check via chat token so a player can only save their
// own position, not overwrite another player's position.
const savePosition = async (req, res) => {
  const player_id = safeId(req.body.player_id);
  const pos_x = Number(req.body.pos_x);
  const pos_y = Number(req.body.pos_y);
  const last_checkpoint = parseInt(req.body.last_checkpoint, 10);

  if (!player_id || !Number.isFinite(pos_x) || !Number.isFinite(pos_y) || isNaN(last_checkpoint))
    return res.status(400).json({ error: 'Invalid position data' });

  // FIX: Reject requests where the token player_id does not match the body player_id
  if (!ownsPlayer(req, player_id))
    return res.status(403).json({ error: 'Access denied' });

  // Clamp coordinates to the actual playable map bounds.
  const clampedX = Math.max(MAP_MIN_X, Math.min(MAP_MAX_X, Math.round(pos_x)));
  const clampedY = Math.max(MAP_MIN_Y, Math.min(MAP_MAX_Y, Math.round(pos_y)));
  const clampedCP = Math.max(0, Math.min(3, last_checkpoint));

  try {
    await db.query(
      `INSERT INTO player_positions (player_id, pos_x, pos_y, last_checkpoint)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE pos_x = VALUES(pos_x), pos_y = VALUES(pos_y), last_checkpoint = VALUES(last_checkpoint)`,
      [player_id, clampedX, clampedY, clampedCP]
    );
    res.json({ message: 'Position saved' });
  } catch (err) {
    console.error('Save position error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── getPosition ──────────────────────────────────────────────────────────────
// FIX: Added ownership check — a player can only fetch their own position.
const getPosition = async (req, res) => {
  const player_id = safeId(req.params.player_id);
  if (!player_id) return res.status(400).json({ error: 'Invalid player ID' });

  if (!ownsPlayer(req, player_id))
    return res.status(403).json({ error: 'Access denied' });

  try {
    const [rows] = await db.query(
      'SELECT * FROM player_positions WHERE player_id = ?',
      [player_id]
    );
    res.json({ position: rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── recordAttempt ────────────────────────────────────────────────────────────
// FIX: Added ownership check — a player can only record attempts for themselves.
const recordAttempt = async (req, res) => {
  const player_id = safeId(req.body.player_id);
  const checkpoint_number = parseInt(req.body.checkpoint_number, 10);

  if (!player_id || isNaN(checkpoint_number) || checkpoint_number < 1 || checkpoint_number > 3)
    return res.status(400).json({ error: 'Invalid data' });

  if (!ownsPlayer(req, player_id))
    return res.status(403).json({ error: 'Access denied' });

  try {
    const [result] = await db.query(
      'UPDATE checkpoint_attempts SET attempts = attempts + 1 WHERE player_id=? AND checkpoint_number=?',
      [player_id, checkpoint_number]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Checkpoint record not found for this player' });

    res.json({ message: 'Attempt recorded' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── completeCheckpoint ───────────────────────────────────────────────────────
// FIX: Added ownership check — a player can only complete checkpoints for themselves.
const completeCheckpoint = async (req, res) => {
  const player_id = safeId(req.body.player_id);
  const checkpoint_number = parseInt(req.body.checkpoint_number, 10);

  if (!player_id || isNaN(checkpoint_number) || checkpoint_number < 1 || checkpoint_number > 3)
    return res.status(400).json({ error: 'Invalid data' });

  if (!ownsPlayer(req, player_id))
    return res.status(403).json({ error: 'Access denied' });

  try {
    if (checkpoint_number > 1) {
      const [previous] = await db.query(
        'SELECT completed FROM checkpoint_attempts WHERE player_id=? AND session_id=? AND checkpoint_number=?',
        [player_id, req.playerChat.session_id, checkpoint_number - 1]
      );
      if (!previous[0]?.completed) {
        return res.status(409).json({ error: 'Complete the previous checkpoint first' });
      }
    }

    const [result] = await db.query(
      'UPDATE checkpoint_attempts SET completed=true, completed_at=NOW() WHERE player_id=? AND session_id=? AND checkpoint_number=?',
      [player_id, req.playerChat.session_id, checkpoint_number]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Checkpoint record not found for this player' });

    res.json({ message: 'Checkpoint completed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── getProgress ──────────────────────────────────────────────────────────────
// FIX: Added ownership check + scoped query to session_id so data from other
// sessions can never leak even if player_id records are duplicated.
const getProgress = async (req, res) => {
  const player_id = safeId(req.params.player_id);
  if (!player_id) return res.status(400).json({ error: 'Invalid player ID' });

  if (!ownsPlayer(req, player_id))
    return res.status(403).json({ error: 'Access denied' });

  // FIX: Scope by session_id (from the token) to prevent cross-session data leak
  const session_id = parseInt(req.playerChat.session_id, 10);

  try {
    const [rows] = await db.query(
      'SELECT * FROM checkpoint_attempts WHERE player_id=? AND session_id=? ORDER BY checkpoint_number',
      [player_id, session_id]
    );
    res.json({ progress: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getCertificate = async (req, res) => {
  const player_id = safeId(req.params.player_id);
  if (!player_id) return res.status(400).json({ error: 'Invalid player ID' });

  if (!ownsPlayer(req, player_id))
    return res.status(403).json({ error: 'Access denied' });

  const session_id = parseInt(req.playerChat.session_id, 10);
  const CP_WEIGHT = 100 / 3;

  try {
    const [players] = await db.query(`
      SELECT p.id, p.nickname, p.joined_at, s.session_name,
        COALESCE(sch.school_name, '') as school_name,
        COALESCE(c.class_name, '') as class_name
      FROM players p
      JOIN game_sessions s ON p.session_id = s.id
      LEFT JOIN schools sch ON s.school_id = sch.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE p.id = ? AND p.session_id = ?
    `, [player_id, session_id]);

    if (players.length === 0)
      return res.status(404).json({ error: 'Player not found' });

    const [progress] = await db.query(
      'SELECT checkpoint_number, completed, attempts, completed_at FROM checkpoint_attempts WHERE player_id=? AND session_id=? ORDER BY checkpoint_number',
      [player_id, session_id]
    );

    // ── CP1 score: quiz ──────────────────────────────────────────────────
    const [quizRows] = await db.query(
      'SELECT score, correct_answers, total_questions FROM quiz_scores WHERE player_id = ? AND session_id = ? ORDER BY id DESC LIMIT 1',
      [player_id, session_id]
    );
    const quiz = quizRows[0] || {};
    let cp1Exact = 0;
    if (quiz.total_questions > 0 && quiz.correct_answers != null) {
      cp1Exact = (quiz.correct_answers / quiz.total_questions) * CP_WEIGHT;
    } else if (quiz.score > 0) {
      // Fallback: normalize against max quiz score in session
      const [[{ maxQuiz }]] = await db.query(
        'SELECT COALESCE(MAX(score), 1) as maxQuiz FROM quiz_scores WHERE session_id = ?',
        [session_id]
      );
      cp1Exact = (quiz.score / Math.max(1, maxQuiz)) * CP_WEIGHT;
    }

    // ── CP2 score: crossword (full marks if completed) ───────────────────
    const cp2Done = progress.find(p => p.checkpoint_number === 2)?.completed;
    const cp2Exact = cp2Done ? CP_WEIGHT : 0;

    // ── CP3 score: food game ─────────────────────────────────────────────
    const [cp3Rows] = await db.query(
      'SELECT score FROM cp3_scores WHERE player_id = ? AND session_id = ? ORDER BY id DESC LIMIT 1',
      [player_id, session_id]
    );
    const cp3Raw = cp3Rows[0]?.score || 0;
    let cp3Exact = 0;
    if (cp3Raw > 0) {
      const [[{ maxCP3 }]] = await db.query(
        'SELECT COALESCE(MAX(score), 1) as maxCP3 FROM cp3_scores WHERE session_id = ?',
        [session_id]
      );
      cp3Exact = Math.min(CP_WEIGHT, (cp3Raw / Math.max(1, maxCP3)) * CP_WEIGHT);
    }

    // ── Overall score ────────────────────────────────────────────────────
    const totalExact = cp1Exact + cp2Exact + cp3Exact;
    const score = totalExact >= 99.5 ? 100 : Math.floor(totalExact);

    const completedCount = progress.filter(p => p.completed).length;
    const completedAtValues = progress
      .filter(p => p.completed_at)
      .map(p => new Date(p.completed_at).getTime());
    const completedAt = completedAtValues.length
      ? new Date(Math.max(...completedAtValues))
      : new Date();

    res.json({
      certificate: {
        ...players[0],
        score,
        completed_checkpoints: completedCount,
        total_checkpoints: 3,
        completed_at: completedAt,
      },
    });
  } catch (err) {
    console.error('Certificate error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── getCheckpointVideos ──────────────────────────────────────────────────────
const getCheckpointVideos = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM checkpoint_videos ORDER BY checkpoint_number');
    res.json({ videos: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── playerExists ─────────────────────────────────────────────────────────────
// Polled every 5 s by the game client to detect if the admin deleted the player.
const playerExists = async (req, res) => {
  const player_id = safeId(req.params.player_id);
  if (!player_id) return res.status(400).json({ error: 'Invalid player ID' });
  try {
    const [rows] = await db.query('SELECT id FROM players WHERE id = ?', [player_id]);
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  joinGame, savePosition, getPosition,
  recordAttempt, completeCheckpoint,
  getProgress, getCertificate, getCheckpointVideos, playerExists
};
