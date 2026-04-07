const db = require('../db');

// Join game via session token
const joinGame = async (req, res) => {
  const { token } = req.params;
  const { nickname } = req.body;
  if (!nickname || typeof nickname !== 'string') return res.status(400).json({ error: 'Nickname required' });
  const cleanNick = nickname.trim().slice(0, 20); // enforce 20-char limit server-side
  if (cleanNick.length < 1) return res.status(400).json({ error: 'Nickname cannot be empty' });

  try {
    const [sessions] = await db.query(
      'SELECT * FROM game_sessions WHERE unique_token = ? AND is_active = true',
      [token]
    );
    if (sessions.length === 0) return res.status(404).json({ error: 'Session not found or inactive' });
    const session = sessions[0];

    // Create player
    const [result] = await db.query(
      'INSERT INTO players (session_id, nickname) VALUES (?, ?)',
      [session.id, cleanNick]
    );
    const playerId = result.insertId;

    // Create initial position
    await db.query(
      'INSERT INTO player_positions (player_id, pos_x, pos_y, last_checkpoint) VALUES (?, ?, ?, ?)',
      [playerId, 390, 1000, 0]
    );

    // Create checkpoint attempt records
    for (let cp = 1; cp <= 3; cp++) {
      await db.query(
        'INSERT INTO checkpoint_attempts (player_id, session_id, checkpoint_number, attempts, completed) VALUES (?, ?, ?, 0, false)',
        [playerId, session.id, cp]
      );
    }

    res.status(201).json({
      message: 'Joined successfully',
      player: { id: playerId, nickname: cleanNick, session_id: session.id, session_name: session.session_name }
    });
  } catch (err) {
    console.error('Join game error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// Validate integer helper
const safeId = (val) => {
  const n = parseInt(val, 10);
  return isNaN(n) || n <= 0 ? null : n;
};

// Save player position
const savePosition = async (req, res) => {
  const player_id = safeId(req.body.player_id);
  const pos_x = parseInt(req.body.pos_x, 10);
  const pos_y = parseInt(req.body.pos_y, 10);
  const last_checkpoint = parseInt(req.body.last_checkpoint, 10);

  if (!player_id || isNaN(pos_x) || isNaN(pos_y) || isNaN(last_checkpoint)) {
    return res.status(400).json({ error: 'Invalid position data' });
  }
  try {
    await db.query(
      'UPDATE player_positions SET pos_x=?, pos_y=?, last_checkpoint=? WHERE player_id=?',
      [pos_x, pos_y, last_checkpoint, player_id]
    );
    res.json({ message: 'Position saved' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get player position
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

// Record checkpoint attempt
const recordAttempt = async (req, res) => {
  const player_id = safeId(req.body.player_id);
  const checkpoint_number = parseInt(req.body.checkpoint_number, 10);
  if (!player_id || isNaN(checkpoint_number) || checkpoint_number < 1 || checkpoint_number > 3) {
    return res.status(400).json({ error: 'Invalid data' });
  }
  try {
    await db.query(
      'UPDATE checkpoint_attempts SET attempts = attempts + 1 WHERE player_id=? AND checkpoint_number=?',
      [player_id, checkpoint_number]
    );
    res.json({ message: 'Attempt recorded' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Complete checkpoint
const completeCheckpoint = async (req, res) => {
  const player_id = safeId(req.body.player_id);
  const checkpoint_number = parseInt(req.body.checkpoint_number, 10);
  if (!player_id || isNaN(checkpoint_number) || checkpoint_number < 1 || checkpoint_number > 3) {
    return res.status(400).json({ error: 'Invalid data' });
  }
  try {
    await db.query(
      'UPDATE checkpoint_attempts SET completed=true, completed_at=NOW() WHERE player_id=? AND checkpoint_number=?',
      [player_id, checkpoint_number]
    );
    res.json({ message: 'Checkpoint completed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get player progress
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

// Get checkpoint videos
const getCheckpointVideos = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM checkpoint_videos ORDER BY checkpoint_number');
    res.json({ videos: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { joinGame, savePosition, getPosition, recordAttempt, completeCheckpoint, getProgress, getCheckpointVideos };
