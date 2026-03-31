const db = require('../db');

const getSettings = async (req, res) => {
  try {
    const { session_id } = req.params;
    const [rows] = await db.query('SELECT * FROM cp3_settings WHERE session_id = ?', [session_id]);
    res.json({ settings: rows[0] || { timer_seconds: 60, target_score: 0 } });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};


const saveScore = async (req, res) => {
  const { player_id, session_id, score } = req.body;
  try {
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
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

const getLeaderboard = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.player_id, c.score, p.nickname
      FROM cp3_scores c
      JOIN players p ON c.player_id = p.id
      WHERE c.session_id = ?
      ORDER BY c.score DESC LIMIT 20
    `, [req.params.session_id]);
    res.json({ leaderboard: rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// Get crossword leaderboard — completed = 100, not completed = 0
const getCrosswordLeaderboard = async (req, res) => {
  try {
    const { session_id } = req.params;
    const [players] = await db.query(
      'SELECT id, nickname FROM players WHERE session_id = ?', [session_id]
    );
    const [done] = await db.query(`
      SELECT DISTINCT ca.player_id FROM checkpoint_attempts ca
      JOIN players p ON ca.player_id = p.id
      WHERE ca.checkpoint_number = 2 AND ca.completed = 1 AND p.session_id = ?
    `, [session_id]);

    const leaderboard = players.map(p => ({
      player_id: p.id,
      nickname: p.nickname,
      completed: !!done.find(d => d.player_id === p.id),
      score: done.find(d => d.player_id === p.id) ? 100 : 0,
    })).sort((a, b) => b.score - a.score);

    res.json({ leaderboard });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// Final leaderboard — CP1 (quiz) /maxQuiz * 33 + CP2 (crossword) /100 * 33 + CP3 /maxCP3 * 33
const getFinalLeaderboard = async (req, res) => {
  try {
    const { session_id } = req.params;

    const [players] = await db.query(
      'SELECT id, nickname FROM players WHERE session_id = ?', [session_id]
    );

    // CP1: quiz highest score per player
    const [quizScores] = await db.query(`
      SELECT player_id, MAX(score) as score, MAX(correct_answers) as correct, MAX(total_questions) as total
      FROM quiz_scores WHERE session_id = ? GROUP BY player_id
    `, [session_id]);

    // CP2: crossword completed or not
    const [crosswordDone] = await db.query(`
      SELECT DISTINCT ca.player_id FROM checkpoint_attempts ca
      JOIN players p ON ca.player_id = p.id
      WHERE ca.checkpoint_number = 2 AND ca.completed = 1 AND p.session_id = ?
    `, [session_id]);

    // CP3: food game score
    const [cp3Scores] = await db.query(
      'SELECT player_id, score FROM cp3_scores WHERE session_id = ?', [session_id]
    );

    // Get max scores for normalization
    const maxQuiz = Math.max(...quizScores.map(s => s.score), 1);
    const maxCP3 = Math.max(...cp3Scores.map(s => s.score), 1);

    const leaderboard = players.map(player => {
      const quiz = quizScores.find(s => s.player_id === player.id);
      const cp3 = cp3Scores.find(s => s.player_id === player.id);
      const crosswordCompleted = !!crosswordDone.find(s => s.player_id === player.id);

      // Formula: score / max * 33 for each CP
      const cp1Mark = quiz ? Math.round((quiz.score / maxQuiz) * 33) : 0;
      const cp2Mark = crosswordCompleted ? 33 : 0;
      const cp3Mark = cp3 ? Math.round((cp3.score / maxCP3) * 33) : 0;
      const total = cp1Mark + cp2Mark + cp3Mark;

      return {
        player_id: player.id,
        nickname: player.nickname,
        cp1_raw: quiz?.score || 0,
        cp1_correct: quiz?.correct || 0,
        cp1_total: quiz?.total || 0,
        cp1_mark: cp1Mark,
        cp2_completed: crosswordCompleted,
        cp2_mark: cp2Mark,
        cp3_raw: cp3?.score || 0,
        cp3_mark: cp3Mark,
        total_mark: total,
      };
    }).sort((a, b) => b.total_mark - a.total_mark);

    res.json({ leaderboard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { saveScore, getLeaderboard, getCrosswordLeaderboard, getFinalLeaderboard, getSettings };
