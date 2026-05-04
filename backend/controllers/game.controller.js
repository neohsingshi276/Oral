const db = require('../db');
const jwt = require('jsonwebtoken');

const MAP_MIN_X = 0;
const MAP_MAX_X = 5600;
const MAP_MIN_Y = 0;
const MAP_MAX_Y = 7600;
const START_X = 1376;
const START_Y = 6784;

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
// FIX: Added duplicate-nickname check so the same nickname cannot join twice
// in the same session — prevents polluted analytics and leaderboards.
const joinGame = async (req, res) => {
  const { token } = req.params;
  const { nickname } = req.body;

  if (!nickname || typeof nickname !== 'string')
    return res.status(400).json({ error: 'Nickname required' });

  const cleanNick = nickname.trim().slice(0, 20);
  if (cleanNick.length < 1)
    return res.status(400).json({ error: 'Nickname cannot be empty' });

  // Extra guard: reject clearly invalid token formats before hitting DB
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

    // FIX: Prevent duplicate nicknames in the same session
    const [existing] = await db.query(
      'SELECT id FROM players WHERE session_id = ? AND nickname = ?',
      [session.id, cleanNick]
    );
    if (existing.length > 0)
      return res.status(409).json({ error: 'This nickname is already taken. Please choose a different one.' });

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
      player: {
        ...player,
        chat_token: createPlayerChatToken(player),
      }
    });
  } catch (err) {
    console.error('Join game error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── savePosition ─────────────────────────────────────────────────────────────
const savePosition = async (req, res) => {
  const player_id = safeId(req.body.player_id);
  const pos_x = parseInt(req.body.pos_x, 10);
  const pos_y = parseInt(req.body.pos_y, 10);
  const last_checkpoint = parseInt(req.body.last_checkpoint, 10);

  if (!player_id || isNaN(pos_x) || isNaN(pos_y) || isNaN(last_checkpoint))
    return res.status(400).json({ error: 'Invalid position data' });

  // Clamp coordinates to the actual playable map bounds.
  const clampedX = Math.max(MAP_MIN_X, Math.min(MAP_MAX_X, pos_x));
  const clampedY = Math.max(MAP_MIN_Y, Math.min(MAP_MAX_Y, pos_y));
  const clampedCP = Math.max(0, Math.min(3, last_checkpoint));

  try {
    await db.query(
      'UPDATE player_positions SET pos_x=?, pos_y=?, last_checkpoint=? WHERE player_id=?',
      [clampedX, clampedY, clampedCP, player_id]
    );
    res.json({ message: 'Position saved' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── getPosition ──────────────────────────────────────────────────────────────
const getPosition = async (req, res) => {
  const player_id = safeId(req.params.player_id);
  if (!player_id) return res.status(400).json({ error: 'Invalid player ID' });

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
const recordAttempt = async (req, res) => {
  const player_id = safeId(req.body.player_id);
  const checkpoint_number = parseInt(req.body.checkpoint_number, 10);

  if (!player_id || isNaN(checkpoint_number) || checkpoint_number < 1 || checkpoint_number > 3)
    return res.status(400).json({ error: 'Invalid data' });

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
const completeCheckpoint = async (req, res) => {
  const player_id = safeId(req.body.player_id);
  const checkpoint_number = parseInt(req.body.checkpoint_number, 10);

  if (!player_id || isNaN(checkpoint_number) || checkpoint_number < 1 || checkpoint_number > 3)
    return res.status(400).json({ error: 'Invalid data' });

  try {
    const [result] = await db.query(
      'UPDATE checkpoint_attempts SET completed=true, completed_at=NOW() WHERE player_id=? AND checkpoint_number=?',
      [player_id, checkpoint_number]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Checkpoint record not found for this player' });

    res.json({ message: 'Checkpoint completed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── getProgress ──────────────────────────────────────────────────────────────
const getProgress = async (req, res) => {
  const player_id = safeId(req.params.player_id);
  if (!player_id) return res.status(400).json({ error: 'Invalid player ID' });

  try {
    const [rows] = await db.query(
      'SELECT * FROM checkpoint_attempts WHERE player_id=? ORDER BY checkpoint_number',
      [player_id]
    );
    res.json({ progress: rows });
  } catch (err) {
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

// ─── checkPlayerExists ────────────────────────────────────────────────────────
// Lightweight endpoint for the game client to poll and detect if the player
// has been deleted by an admin while the game is still running.
const checkPlayerExists = async (req, res) => {
  const player_id = safeId(req.params.player_id);
  if (!player_id) return res.status(400).json({ exists: false });

  try {
    const [rows] = await db.query('SELECT id FROM players WHERE id = ?', [player_id]);
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ exists: false });
  }
};

module.exports = {
  joinGame, savePosition, getPosition,
  recordAttempt, completeCheckpoint,
  getProgress, getCheckpointVideos,
  checkPlayerExists
};
