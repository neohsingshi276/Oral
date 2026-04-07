const db = require('../db');

// ============================================
// AUTO-LAYOUT GENERATOR (ported from friend's Python code)
// Places words by finding intersecting letters
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

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const word = item.word.toUpperCase().trim();
    const clue = item.clue;
    const id = item.id;

    if (i === 0) {
      // Place first word across at center-ish position
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
      // Couldn't intersect — place separately
      const newRow = 10 + (i * 2);
      placedWords.push({ id, word, clue, direction: 'across', start_row: newRow, start_col: 20 });
    }
  }

  // Normalize positions (shift so minimum row/col is 0)
  let minRow = Infinity, minCol = Infinity;
  for (const w of placedWords) {
    minRow = Math.min(minRow, w.start_row);
    minCol = Math.min(minCol, w.start_col);
  }
  for (const w of placedWords) {
    w.start_row -= minRow;
    w.start_col -= minCol;
  }

  // Calculate grid size needed
  let maxRow = 0, maxCol = 0;
  for (const w of placedWords) {
    const endRow = w.start_row + (w.direction === 'down' ? w.word.length : 1);
    const endCol = w.start_col + (w.direction === 'across' ? w.word.length : 1);
    maxRow = Math.max(maxRow, endRow);
    maxCol = Math.max(maxCol, endCol);
  }

  return { words: placedWords, gridSize: Math.max(maxRow, maxCol) };
}

// ============================================
// GET CROSSWORD (with auto-layout)
// ============================================

const getCrossword = async (req, res) => {
  try {
    const { session_id } = req.params;

    // Fetch custom settings for this session
    const [settingsRows] = await db.query('SELECT * FROM crossword_settings WHERE session_id = ?', [session_id]);
    const cfg = settingsRows[0] || { word_count: 8, selected_words: null };

    // Start building query
    let query = 'SELECT * FROM crossword_data';
    let queryParams = [];

    // Parse the selected specific words
    let selectedIds = [];
    try {
      if (cfg.selected_words) {
        selectedIds = typeof cfg.selected_words === 'string' ? JSON.parse(cfg.selected_words) : cfg.selected_words;
      }
    } catch (e) { }

    // Only get the specific words the admin selected!
    if (selectedIds && selectedIds.length > 0) {
      const placeholders = selectedIds.map(() => '?').join(',');
      query += ` WHERE id IN (${placeholders})`;
      queryParams.push(...selectedIds);
    }

    const [rows] = await db.query(query, queryParams);

    // Shuffle and pick the requested number of words
    const shuffled = rows.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(shuffled.length, cfg.word_count || 8));

    const layout = generateCrosswordLayout(selected);
    // Return settings alongside layout so frontend can use them
    res.json({ ...layout, settings: cfg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};


// ============================================
// SUBMIT CROSSWORD SCORE
// ============================================

const submitScore = async (req, res) => {
  const { player_id, session_id, words_correct, total_words, time_taken } = req.body;
  try {
    const score = words_correct * 100 + Math.max(0, time_taken);

    await db.query(
      'INSERT INTO crossword_scores (player_id, session_id, score, words_correct, total_words, time_taken) VALUES (?,?,?,?,?,?)',
      [player_id, session_id, score, words_correct, total_words, time_taken]
    );

    res.json({ score, words_correct, total_words });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ============================================
// GET CROSSWORD LEADERBOARD
// ============================================

const getLeaderboard = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.player_id, s.score, s.words_correct,
             s.total_words, s.time_taken, s.completed_at, p.nickname
      FROM crossword_scores s
      JOIN players p ON s.player_id = p.id
      WHERE s.session_id = ?
      ORDER BY s.score DESC
    `, [req.params.session_id]);

    // Keep only highest score per player
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

// ============================================
// ADMIN CRUD (unchanged pattern)
// ============================================

const getAllWords = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM crossword_data ORDER BY id');
    res.json({ words: rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const addWord = async (req, res) => {
  const { word, clue, direction, start_row, start_col } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO crossword_data (word, clue, direction, start_row, start_col) VALUES (?,?,?,?,?)',
      [word.toUpperCase(), clue, direction || 'across', start_row || 0, start_col || 0]
    );
    res.status(201).json({ message: 'Word added', id: result.insertId });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const updateWord = async (req, res) => {
  const { word, clue, direction, start_row, start_col } = req.body;
  try {
    await db.query(
      'UPDATE crossword_data SET word=?, clue=?, direction=?, start_row=?, start_col=? WHERE id=?',
      [word.toUpperCase(), clue, direction || 'across', start_row || 0, start_col || 0, req.params.id]
    );
    res.json({ message: 'Word updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const deleteWord = async (req, res) => {
  try {
    await db.query('DELETE FROM crossword_data WHERE id=?', [req.params.id]);
    res.json({ message: 'Word deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

module.exports = { getCrossword, getAllWords, addWord, updateWord, deleteWord, submitScore, getLeaderboard };
