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
    const [scores] = await db.query(`
      SELECT player_id, MAX(words_correct) AS words_correct, MAX(total_words) AS total_words
      FROM crossword_scores
      WHERE session_id = ?
      GROUP BY player_id
    `, [sessionId]);
    const [done] = await db.query(
      'SELECT player_id FROM checkpoint_attempts WHERE session_id = ? AND checkpoint_number = 2 AND completed = 1',
      [sessionId]
    );

    const scoreMap = Object.fromEntries(scores.map(s => [s.player_id, s]));
    const doneSet = new Set(done.map(d => d.player_id));
    const leaderboard = players
      .map(p => ({
        player_id: p.id,
        nickname:  p.nickname,
        words_correct: scoreMap[p.id]?.words_correct || 0,
        total_words: scoreMap[p.id]?.total_words || 0,
        completed: doneSet.has(p.id),
        score: scoreMap[p.id]?.words_correct || 0,
      }))
      .sort((a, b) => {
        if (b.completed !== a.completed) return Number(b.completed) - Number(a.completed);
        if (b.words_correct !== a.words_correct) return b.words_correct - a.words_correct;
        return a.nickname.localeCompare(b.nickname);
      });

    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── getFinalLeaderboard ──────────────────────────────────────────────────────
// Absolute marking scheme — scores based on actual performance, not relative
// to best player in session:
//
//  CP1 Quiz      /33.33 = (correct_answers / total_questions) × (100/3)
//  CP2 Crossword /33.33 = (words_correct / total_words)       × (100/3)
//  CP3 Food Game /33.33 = (score / target_or_max)             × (100/3)
//
//  Total = /100  (rounded: >= 99.5 → 100, otherwise floor)
//
// Each CP mark is rounded to nearest integer for display.
const CP_WEIGHT = 100 / 3; // 33.333...

const getFinalLeaderboard = async (req, res) => {
  const sessionId = parseInt(req.params.session_id, 10);
  if (!sessionId || sessionId <= 0)
    return res.status(400).json({ error: 'Invalid session ID' });

  try {
    const [players] = await db.query(
      'SELECT id, nickname FROM players WHERE session_id = ?', [sessionId]
    );

    // CP1: use correct_answers and total_questions directly
    const [quizScores] = await db.query(`
      SELECT player_id,
             MAX(correct_answers) as correct,
             MAX(total_questions) as total
      FROM quiz_scores WHERE session_id = ? GROUP BY player_id
    `, [sessionId]);

    // CP2: use words_correct / total_words for partial credit
    const [crosswordScores] = await db.query(`
      SELECT player_id,
             MAX(words_correct) as words_correct,
             MAX(total_words)   as total_words
      FROM crossword_scores WHERE session_id = ? GROUP BY player_id
    `, [sessionId]);

    // CP3: raw game score + admin-set target
    const [cp3Scores] = await db.query(
      'SELECT player_id, score FROM cp3_scores WHERE session_id = ?', [sessionId]
    );
    const [cp3Settings] = await db.query(
      'SELECT target_score FROM cp3_settings WHERE session_id = ?', [sessionId]
    );

    const adminTarget = cp3Settings[0]?.target_score || 0;
    const maxCP3raw   = cp3Scores.length > 0 ? Math.max(...cp3Scores.map(s => s.score)) : 1;
    const cp3Denom    = adminTarget > 0 ? adminTarget : maxCP3raw;

    const quizMap      = Object.fromEntries(quizScores.map(s     => [s.player_id, s]));
    const crosswordMap = Object.fromEntries(crosswordScores.map(s => [s.player_id, s]));
    const cp3Map       = Object.fromEntries(cp3Scores.map(s       => [s.player_id, s]));

    const leaderboard = players.map(player => {
      const quiz = quizMap[player.id];
      const cw   = crosswordMap[player.id];
      const cp3  = cp3Map[player.id];

      // CP1: absolute — based on how many they got right
      const cp1Correct = quiz?.correct || 0;
      const cp1Total   = quiz?.total   || 0;
      const cp1Exact   = cp1Total > 0 ? (cp1Correct / cp1Total) * CP_WEIGHT : 0;
      const cp1Mark    = Math.round(cp1Exact); // rounded for display

      // CP2: partial credit — based on words solved
      const cwCorrect = cw?.words_correct || 0;
      const cwTotal   = cw?.total_words   || 0;
      const cp2Exact  = cwTotal > 0 ? (cwCorrect / cwTotal) * CP_WEIGHT : 0;
      const cp2Mark   = Math.round(cp2Exact);

      // CP3: based on target or session max, capped at 33.33
      const cp3Raw   = cp3?.score || 0;
      const cp3Exact = cp3Raw > 0 ? Math.min(CP_WEIGHT, (cp3Raw / Math.max(1, cp3Denom)) * CP_WEIGHT) : 0;
      const cp3Mark  = Math.round(cp3Exact);

      // Total: sum exact values, then round properly
      // >= 99.5 → 100, otherwise floor
      const totalExact = cp1Exact + cp2Exact + cp3Exact;
      const totalMark  = totalExact >= 99.5 ? 100 : Math.floor(totalExact);

      return {
        player_id:     player.id,
        nickname:      player.nickname,
        cp1_correct:   cp1Correct,
        cp1_total:     cp1Total,
        cp1_mark:      cp1Mark,
        cp2_words:     cwCorrect,
        cp2_total:     cwTotal,
        cp2_completed: cwCorrect > 0 && cwCorrect >= cwTotal,
        cp2_mark:      cp2Mark,
        cp3_raw:       cp3Raw,
        cp3_target:    cp3Denom,
        cp3_mark:      cp3Mark,
        total_mark:    totalMark,
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
