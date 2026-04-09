const db = require('../db');

// ============================================
// AUTO-LAYOUT GENERATOR
// ============================================
function generateCrosswordLayout(wordsData) {
  const placedWords = [];
  const sorted = [...wordsData].sort((a, b) => b.word.length - a.word.length);

  function checkCollision(word, row, col, direction) {
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const r = row + (direction === 'down' ? i : 0);
      const c = col + (direction === 'across' ? i : 0);
      if (r < 0 || c < 0) return false;
      for (const p of placedWords) {
        if (p.direction === 'down') {
          if (p.start_col === c && p.start_row <= r && r < p.start_row + p.word.length) {
            if (p.word[r - p.start_row] !== char) return false;
          }
        } else {
          if (p.start_row === r && p.start_col <= c && c < p.start_col + p.word.length) {
            if (p.word[c - p.start_col] !== char) return false;
          }
        }
      }
    }
    return true;
  }

  // FIX: Track the next safe fallback row so floated words never stack on
  // each other when many words fail to intersect.
  let nextFallbackRow = 10;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const word = item.word.toUpperCase().trim();
    const clue = item.clue;
    const id   = item.id;

    if (i === 0) {
      placedWords.push({ id, word, clue, direction: 'across', start_row: 10, start_col: 10 });
      continue;
    }

    let foundFit = false;
    for (const placed of placedWords) {
      if (foundFit) break;
      for (let pIdx = 0; pIdx < placed.word.length; pIdx++) {
        if (foundFit) break;
        for (let wIdx = 0; wIdx < word.length; wIdx++) {
          if (placed.word[pIdx] === word[wIdx]) {
            const newDir = placed.direction === 'across' ? 'down' : 'across';
            const newRow = newDir === 'down'
              ? placed.start_row - wIdx + (placed.direction === 'across' ? 0 : pIdx)
              : placed.start_row + pIdx;
            const newCol = newDir === 'across'
              ? placed.start_col - wIdx + (placed.direction === 'across' ? pIdx : 0)
              : placed.start_col + pIdx;

            if (checkCollision(word, newRow, newCol, newDir)) {
              placedWords.push({ id, word, clue, direction: newDir, start_row: newRow, start_col: newCol });
              foundFit = true;
              break;
            }
          }
        }
      }
    }

    if (!foundFit) {
      // FIX: Each fallback word gets its own row (3 rows apart) so they
      // never overlap each other in the rendered grid.
      placedWords.push({ id, word, clue, direction: 'across', start_row: nextFallbackRow, start_col: 20 });
      nextFallbackRow += 3;
    }
  }

  // Normalize positions
  let minRow = Infinity, minCol = Infinity;
  for (const w of placedWords) {
    minRow = Math.min(minRow, w.start_row);
    minCol = Math.min(minCol, w.start_col);
  }
  for (const w of placedWords) {
    w.start_row -= minRow;
    w.start_col -= minCol;
  }

  let maxRow = 0, maxCol = 0;
  for (const w of placedWords) {
    const endRow = w.start_row + (w.direction === 'down' ? w.word.length : 1);
    const endCol = w.start_col + (w.direction === 'across' ? w.word.length : 1);
    maxRow = Math.max(maxRow, endRow);
    maxCol = Math.max(maxCol, endCol);
  }

  return { words: placedWords, gridSize: Math.max(maxRow, maxCol) };
}

// ─── getCrossword ─────────────────────────────────────────────────────────────
const getCrossword = async (req, res) => {
  const sessionId = parseInt(req.params.session_id, 10);
  if (!sessionId || sessionId <= 0)
    return res.status(400).json({ error: 'Invalid session ID' });

  try {
    const [settingsRows] = await db.query(
      'SELECT * FROM crossword_settings WHERE session_id = ?', [sessionId]
    );
    const cfg = settingsRows[0] || { word_count: 8, selected_words: null };

    let query = 'SELECT * FROM crossword_data';
    let queryParams = [];

    let selectedIds = [];
    try {
      if (cfg.selected_words) {
        selectedIds = typeof cfg.selected_words === 'string'
          ? JSON.parse(cfg.selected_words)
          : cfg.selected_words;
      }
    } catch (e) {
      console.error('Failed to parse selected_words JSON:', e.message);
    }

    if (selectedIds && selectedIds.length > 0) {
      const placeholders = selectedIds.map(() => '?').join(',');
      query += ` WHERE id IN (${placeholders})`;
      queryParams.push(...selectedIds);
    }

    const [rows] = await db.query(query, queryParams);
    const shuffled = rows.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(shuffled.length, cfg.word_count || 8));

    const layout = generateCrosswordLayout(selected);
    res.json({ ...layout, settings: cfg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── submitScore ──────────────────────────────────────────────────────────────
const submitScore = async (req, res) => {
  const { player_id, session_id, words_correct, total_words, time_taken, time_remaining } = req.body;

  if (!player_id || !session_id)
    return res.status(400).json({ error: 'player_id and session_id required' });

  const safeWordsCorrect  = Math.max(0, parseInt(words_correct,  10) || 0);
  const safeTotalWords    = Math.max(0, parseInt(total_words,    10) || 0);
  const safeTimeRemaining = Math.max(0, parseInt(time_remaining, 10) || 0);
  const safeTimeTaken     = Math.max(0, parseInt(time_taken,     10) || 0);

  try {
    const [playerRows] = await db.query(
      'SELECT id FROM players WHERE id = ? AND session_id = ?',
      [player_id, session_id]
    );
    if (playerRows.length === 0)
      return res.status(403).json({ error: 'Player does not belong to this session' });

    const score = safeWordsCorrect * 100 + safeTimeRemaining;

    const [existing] = await db.query(
      'SELECT id, score FROM crossword_scores WHERE player_id = ? AND session_id = ?',
      [player_id, session_id]
    );

    if (existing.length > 0) {
      if (score > existing[0].score) {
        await db.query(
          'UPDATE crossword_scores SET score=?, words_correct=?, total_words=?, time_taken=? WHERE id=?',
          [score, safeWordsCorrect, safeTotalWords, safeTimeTaken, existing[0].id]
        );
      }
    } else {
      await db.query(
        'INSERT INTO crossword_scores (player_id, session_id, score, words_correct, total_words, time_taken) VALUES (?,?,?,?,?,?)',
        [player_id, session_id, score, safeWordsCorrect, safeTotalWords, safeTimeTaken]
      );
    }

    res.json({ score, words_correct: safeWordsCorrect, total_words: safeTotalWords });
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
      SELECT s.player_id, s.score, s.words_correct,
             s.total_words, s.time_taken, s.completed_at, p.nickname
      FROM crossword_scores s
      JOIN players p ON s.player_id = p.id
      WHERE s.session_id = ?
      ORDER BY s.score DESC
    `, [sessionId]);

    const seen = {};
    const leaderboard = [];
    for (const row of rows) {
      if (!seen[row.player_id]) {
        seen[row.player_id] = true;
        leaderboard.push(row);
      }
    }

    res.json({ leaderboard: leaderboard.slice(0, 20) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── getAllWords ───────────────────────────────────────────────────────────────
const getAllWords = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM crossword_data ORDER BY id');
    res.json({ words: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── addWord ──────────────────────────────────────────────────────────────────
// FIX: Added full input validation — presence, type, length, and letter-only
// check for word — preventing DB errors and bad crossword data.
const addWord = async (req, res) => {
  const { word, clue } = req.body;

  if (!word || typeof word !== 'string' || word.trim().length === 0)
    return res.status(400).json({ error: 'Word is required' });
  if (!clue || typeof clue !== 'string' || clue.trim().length === 0)
    return res.status(400).json({ error: 'Clue is required' });
  if (word.trim().length > 50)
    return res.status(400).json({ error: 'Word too long (max 50 characters)' });
  if (clue.trim().length > 200)
    return res.status(400).json({ error: 'Clue too long (max 200 characters)' });
  if (!/^[a-zA-Z]+$/.test(word.trim()))
    return res.status(400).json({ error: 'Word must contain letters only (no spaces or symbols)' });

  try {
    const [result] = await db.query(
      'INSERT INTO crossword_data (word, clue) VALUES (?,?)',
      [word.trim().toUpperCase(), clue.trim()]
    );
    res.status(201).json({ message: 'Word added', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── updateWord ───────────────────────────────────────────────────────────────
const updateWord = async (req, res) => {
  const { word, clue } = req.body;

  if (!word || typeof word !== 'string' || word.trim().length === 0)
    return res.status(400).json({ error: 'Word is required' });
  if (!clue || typeof clue !== 'string' || clue.trim().length === 0)
    return res.status(400).json({ error: 'Clue is required' });
  if (word.trim().length > 50)
    return res.status(400).json({ error: 'Word too long (max 50 characters)' });
  if (clue.trim().length > 200)
    return res.status(400).json({ error: 'Clue too long (max 200 characters)' });
  if (!/^[a-zA-Z]+$/.test(word.trim()))
    return res.status(400).json({ error: 'Word must contain letters only (no spaces or symbols)' });

  try {
    await db.query(
      'UPDATE crossword_data SET word=?, clue=? WHERE id=?',
      [word.trim().toUpperCase(), clue.trim(), req.params.id]
    );
    res.json({ message: 'Word updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── deleteWord ───────────────────────────────────────────────────────────────
const deleteWord = async (req, res) => {
  try {
    await db.query('DELETE FROM crossword_data WHERE id=?', [req.params.id]);
    res.json({ message: 'Word deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getCrossword, getAllWords,
  addWord, updateWord, deleteWord,
  submitScore, getLeaderboard
};
