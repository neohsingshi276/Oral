const db = require('../db');

// ─── getSettings ──────────────────────────────────────────────────────────────
const getSettings = async (req, res) => {
  const sessionId = parseInt(req.params.session_id, 10);
  if (!sessionId || sessionId <= 0)
    return res.status(400).json({ error: 'Invalid session ID' });

  try {
    const [rows] = await db.query('SELECT * FROM cp3_settings WHERE session_id = ?', [sessionId]);
    res.json({ settings: rows[0] || { timer_seconds: 60, target_score: 0 } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── saveScore ────────────────────────────────────────────────────────────────
// FIX: Added player-session ownership check (same pattern as quiz/crossword)
// and score clamping to prevent arbitrary values being submitted.
const saveScore = async (req, res) => {
  const player_id  = parseInt(req.body.player_id, 10);
  const session_id = parseInt(req.body.session_id, 10);
  const rawScore   = parseInt(req.body.score, 10);

  if (!player_id  || player_id  <= 0) return res.status(400).json({ error: 'Invalid player_id' });
  if (!session_id || session_id <= 0) return res.status(400).json({ error: 'Invalid session_id' });
  if (isNaN(rawScore))                return res.status(400).json({ error: 'Score must be a number' });

  // Clamp score to a sane range — prevents spoofed giant scores
  const score = Math.max(0, Math.min(999999, rawScore));

  try {
    // FIX: Verify the player actually belongs to this session
    const [playerRows] = await db.query(
      'SELECT id FROM players WHERE id = ? AND session_id = ?',
      [player_id, session_id]
    );
    if (playerRows.length === 0)
      return res.status(403).json({ error: 'Player does not belong to this session' });

    const [existing] = await db.query(
      'SELECT id, score FROM cp3_scores WHERE player_id = ? AND session_id = ?',
      [player_id, session_id]
    );

    if (existing.length > 0) {
      if (score > existing[0].score) {
        await db.query('UPDATE cp3_scores SET score = ? WHERE id = ?', [score, existing[0].id]);
      }
    } else {
      await db.query(
        'INSERT INTO cp3_scores (player_id, session_id, score) VALUES (?, ?, ?)',
        [player_id, session_id, score]
      );
    }

    res.json({ message: 'Score saved!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── getLeaderboard ───────────────────────────────────────────────────────────
const getLeaderboard = async (req, res) => {
  const sessionId = parseInt(req.params.session_id, 10);
  if (!sessionId || sessionId <= 0)
    return res.status(400).json({ error: 'Invalid session ID' });

  try {
    const [rows] = await db.query(`
      SELECT c.player_id, c.score, p.nickname
      FROM cp3_scores c
      JOIN players p ON c.player_id = p.id
      WHERE c.session_id = ?
      ORDER BY c.score DESC LIMIT 20
    `, [sessionId]);
    res.json({ leaderboard: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── getCrosswordLeaderboard ──────────────────────────────────────────────────
const getCrosswordLeaderboard = async (req, res) => {
  const sessionId = parseInt(req.params.session_id, 10);
  if (!sessionId || sessionId <= 0)
    return res.status(400).json({ error: 'Invalid session ID' });

  try {
    const [players] = await db.query(
      'SELECT id, nickname FROM players WHERE session_id = ?', [sessionId]
    );
    const [done] = await db.query(`
      SELECT DISTINCT ca.player_id FROM checkpoint_attempts ca
      JOIN players p ON ca.player_id = p.id
      WHERE ca.checkpoint_number = 2 AND ca.completed = 1 AND p.session_id = ?
    `, [sessionId]);

    const doneSet = new Set(done.map(d => d.player_id));
    const leaderboard = players
      .map(p => ({
        player_id: p.id,
        nickname:  p.nickname,
        completed: doneSet.has(p.id),
        score:     doneSet.has(p.id) ? 100 : 0,
      }))
      .sort((a, b) => b.score - a.score);

    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── getFinalLeaderboard ──────────────────────────────────────────────────────
// FIX: Score formula now totals to 100 (33 + 33 + 34) instead of 99.
const getFinalLeaderboard = async (req, res) => {
  const sessionId = parseInt(req.params.session_id, 10);
  if (!sessionId || sessionId <= 0)
    return res.status(400).json({ error: 'Invalid session ID' });

  try {
    const [players] = await db.query(
      'SELECT id, nickname FROM players WHERE session_id = ?', [sessionId]
    );

    const [quizScores] = await db.query(`
      SELECT player_id, MAX(score) as score,
             MAX(correct_answers) as correct, MAX(total_questions) as total
      FROM quiz_scores WHERE session_id = ? GROUP BY player_id
    `, [sessionId]);

    const [crosswordDone] = await db.query(`
      SELECT DISTINCT ca.player_id FROM checkpoint_attempts ca
      JOIN players p ON ca.player_id = p.id
      WHERE ca.checkpoint_number = 2 AND ca.completed = 1 AND p.session_id = ?
    `, [sessionId]);

    const [cp3Scores] = await db.query(
      'SELECT player_id, score FROM cp3_scores WHERE session_id = ?', [sessionId]
    );

    // Use at least 1 as denominator to avoid division-by-zero
    // FIX: Guard against empty arrays — Math.max(...[]) = -Infinity, breaking all scores
    const maxQuiz = quizScores.length > 0 ? Math.max(...quizScores.map(s => s.score)) : 1;
    const maxCP3  = cp3Scores.length  > 0 ? Math.max(...cp3Scores.map(s  => s.score)) : 1;
    const doneSet = new Set(crosswordDone.map(d => d.player_id));

    const quizMap = Object.fromEntries(quizScores.map(s => [s.player_id, s]));
    const cp3Map  = Object.fromEntries(cp3Scores.map(s  => [s.player_id, s]));

    const leaderboard = players.map(player => {
      const quiz               = quizMap[player.id];
      const cp3                = cp3Map[player.id];
      const crosswordCompleted = doneSet.has(player.id);

      // CP1 = 33, CP2 = 33, CP3 = 34 → max total = 100
      const cp1Mark = quiz ? Math.round((quiz.score / maxQuiz) * 33) : 0;
      const cp2Mark = crosswordCompleted ? 33 : 0;
      const cp3Mark = cp3  ? Math.round((cp3.score  / maxCP3)  * 34) : 0;
      const total   = cp1Mark + cp2Mark + cp3Mark;

      return {
        player_id:       player.id,
        nickname:        player.nickname,
        cp1_raw:         quiz?.score   || 0,
        cp1_correct:     quiz?.correct || 0,
        cp1_total:       quiz?.total   || 0,
        cp1_mark:        cp1Mark,
        cp2_completed:   crosswordCompleted,
        cp2_mark:        cp2Mark,
        cp3_raw:         cp3?.score    || 0,
        cp3_mark:        cp3Mark,
        total_mark:      total,
      };
    }).sort((a, b) => b.total_mark - a.total_mark);

    res.json({ leaderboard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  saveScore, getLeaderboard,
  getCrosswordLeaderboard, getFinalLeaderboard,
  getSettings
};
