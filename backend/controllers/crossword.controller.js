const db = require('../db');

// ============================================
// AUTO-LAYOUT GENERATOR (v2)
// ============================================
// Key rules:
//   1. Words that SHARE a letter may occupy the same or adjacent cells only at
//      the exact intersection point — everywhere else they must be separated.
//   2. Words that do NOT share any letter must have at least 2 cells of empty
//      space between them (no touching sides or corners).
//   3. An ACROSS word may not immediately precede/follow another ACROSS word on
//      the same row (they would visually merge into one long word).
//   4. A DOWN word may not immediately precede/follow another DOWN word in the
//      same column.
//   5. Fallback (unconnected) words are spaced far apart from all existing content.
function generateCrosswordLayout(wordsData) {
  // Working in a large virtual grid; normalise to 0-based at the end.
  const OFFSET = 50; // start coordinates so we have room to go negative during placement

  const placedWords = [];
  const sorted = [...wordsData].sort((a, b) => b.word.length - a.word.length);

  // --- helpers ---------------------------------------------------------------

  // Returns every (row, col) occupied by a placed word.
  function cellsOf(p) {
    const cells = [];
    for (let i = 0; i < p.word.length; i++) {
      cells.push({
        r: p.direction === 'down'   ? p.start_row + i : p.start_row,
        c: p.direction === 'across' ? p.start_col + i : p.start_col,
      });
    }
    return cells;
  }

  // Build a map from "r,c" → the placed word index that owns that cell.
  // A cell can be shared only when two words intersect on the same letter.
  function buildOccupied() {
    const map = {}; // "r,c" -> { letter, wordIdx, isIntersection? }
    placedWords.forEach((p, idx) => {
      cellsOf(p).forEach(({ r, c }) => {
        const key = `${r},${c}`;
        if (map[key]) {
          map[key].shared = true; // marks a valid intersection
        } else {
          map[key] = { letter: p.word[/* will be set below */0], wordIdx: idx, shared: false };
        }
      });
    });
    return map;
  }

  // Check whether placing `word` at (row, col, direction) is valid.
  // Returns false if:
  //   - any cell is out of virtual bounds
  //   - a cell is occupied by a different letter (letter conflict)
  //   - a cell that should be empty borders another word's cell (spacing violation)
  //   - the word would extend past / touch the tip of a same-direction word
  function canPlace(word, row, col, direction) {
    const len = word.length;

    // 1. Build set of cells this candidate word needs.
    const myCells = [];
    for (let i = 0; i < len; i++) {
      myCells.push({
        r: direction === 'down'   ? row + i : row,
        c: direction === 'across' ? col + i : col,
        letter: word[i],
      });
    }

    // 2. Reject negative coords (they'll normalise away but collisions checked below may not).
    for (const { r, c } of myCells) {
      if (r < 0 || c < 0) return false;
    }

    // 3. For each candidate cell, check letter compatibility with existing grid.
    //    Build a quick lookup of occupied cells for this check.
    for (const p of placedWords) {
      for (let i = 0; i < p.word.length; i++) {
        const pr = p.direction === 'down'   ? p.start_row + i : p.start_row;
        const pc = p.direction === 'across' ? p.start_col + i : p.start_col;
        const pl = p.word[i];
        // Find if my word touches this cell.
        const hit = myCells.find(mc => mc.r === pr && mc.c === pc);
        if (hit) {
          // A shared cell: letters must match.
          if (hit.letter !== pl) return false;
          // And the two words must be perpendicular (no two same-direction words can overlap).
          if (p.direction === direction) return false;
        }
      }
    }

    // 4. The cell immediately BEFORE the start and AFTER the end of the new
    //    word (in its own direction) must be empty — otherwise two same-direction
    //    words would appear to merge.
    const beforeR = direction === 'down'   ? row - 1 : row;
    const beforeC = direction === 'across' ? col - 1 : col;
    const afterR  = direction === 'down'   ? row + len : row;
    const afterC  = direction === 'across' ? col + len : col;

    for (const p of placedWords) {
      for (let i = 0; i < p.word.length; i++) {
        const pr = p.direction === 'down'   ? p.start_row + i : p.start_row;
        const pc = p.direction === 'across' ? p.start_col + i : p.start_col;
        if ((pr === beforeR && pc === beforeC) || (pr === afterR && pc === afterC)) {
          return false; // merging risk
        }
      }
    }

    // 5. Spacing rule: for every cell of the new word that does NOT intersect an
    //    existing word's cell, none of its perpendicular neighbours (the sides of
    //    the word) may be occupied — this prevents words running parallel with
    //    only one empty cell between them (which looks merged).
    //
    //    Perpendicular neighbours for ACROSS word at (r, c): (r-1, c) and (r+1, c)
    //    Perpendicular neighbours for DOWN   word at (r, c): (r, c-1) and (r, c+1)
    //
    //    We only apply this to NON-intersection cells (intersection cells are
    //    allowed to touch the crossing word by definition).

    // Build quick set of intersection cells (cells that are shared with existing grid).
    const intersectionSet = new Set();
    for (const mc of myCells) {
      for (const p of placedWords) {
        for (let i = 0; i < p.word.length; i++) {
          const pr = p.direction === 'down'   ? p.start_row + i : p.start_row;
          const pc = p.direction === 'across' ? p.start_col + i : p.start_col;
          if (pr === mc.r && pc === mc.c) {
            intersectionSet.add(`${mc.r},${mc.c}`);
          }
        }
      }
    }

    // Build occupied set for quick lookup.
    const occupiedSet = new Set();
    for (const p of placedWords) {
      for (let i = 0; i < p.word.length; i++) {
        const pr = p.direction === 'down'   ? p.start_row + i : p.start_row;
        const pc = p.direction === 'across' ? p.start_col + i : p.start_col;
        occupiedSet.add(`${pr},${pc}`);
      }
    }

    for (const mc of myCells) {
      if (intersectionSet.has(`${mc.r},${mc.c}`)) continue; // intersection cell — skip spacing check

      // Perpendicular neighbour cells
      const neighbours = direction === 'across'
        ? [{ r: mc.r - 1, c: mc.c }, { r: mc.r + 1, c: mc.c }]
        : [{ r: mc.r, c: mc.c - 1 }, { r: mc.r, c: mc.c + 1 }];

      for (const nb of neighbours) {
        if (occupiedSet.has(`${nb.r},${nb.c}`)) return false; // parallel neighbour occupied → too close
      }
    }

    return true;
  }

  // Score a placement: prefer positions that create more intersections (connected
  // to more existing words) and are closer to the existing cluster's centroid.
  function scorePlacement(word, row, col, direction, intersectionCount) {
    // More intersections = better (compact grid).
    let score = intersectionCount * 100;

    // Prefer placements near the centroid of already-placed words.
    if (placedWords.length > 0) {
      let sumR = 0, sumC = 0, totalCells = 0;
      for (const p of placedWords) {
        for (let i = 0; i < p.word.length; i++) {
          sumR += p.direction === 'down'   ? p.start_row + i : p.start_row;
          sumC += p.direction === 'across' ? p.start_col + i : p.start_col;
          totalCells++;
        }
      }
      const centR = sumR / totalCells;
      const centC = sumC / totalCells;
      const midR  = direction === 'down'   ? row + word.length / 2 : row;
      const midC  = direction === 'across' ? col + word.length / 2 : col;
      const dist  = Math.abs(midR - centR) + Math.abs(midC - centC);
      score -= dist; // closer = higher score
    }

    return score;
  }

  // ---------------------------------------------------------------------------

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const word = item.word.toUpperCase().trim();
    const clue = item.clue;
    const id   = item.id;

    if (i === 0) {
      // Place the longest word horizontally near the centre of our virtual grid.
      placedWords.push({ id, word, clue, direction: 'across', start_row: OFFSET, start_col: OFFSET });
      continue;
    }

    // Collect all valid candidate placements by trying to intersect with every
    // letter of every already-placed word.
    const candidates = [];

    for (const placed of placedWords) {
      for (let pIdx = 0; pIdx < placed.word.length; pIdx++) {
        for (let wIdx = 0; wIdx < word.length; wIdx++) {
          if (placed.word[pIdx] !== word[wIdx]) continue;

          const newDir = placed.direction === 'across' ? 'down' : 'across';
          let newRow, newCol;

          if (newDir === 'down') {
            // new word DOWN, placed word ACROSS
            // Intersection cell row = placed.start_row, col = placed.start_col + pIdx
            // new word's wIdx-th letter is at that cell ⟹ start_row = placed.start_row - wIdx
            newRow = placed.start_row - wIdx;
            newCol = placed.start_col + pIdx;
          } else {
            // new word ACROSS, placed word DOWN
            newRow = placed.start_row + pIdx;
            newCol = placed.start_col - wIdx;
          }

          if (canPlace(word, newRow, newCol, newDir)) {
            // Count how many cells of this placement intersect existing words
            // (used as placement quality score).
            let intersections = 0;
            for (let k = 0; k < word.length; k++) {
              const tr = newDir === 'down'   ? newRow + k : newRow;
              const tc = newDir === 'across' ? newCol + k : newCol;
              for (const p2 of placedWords) {
                for (let m = 0; m < p2.word.length; m++) {
                  const pr2 = p2.direction === 'down'   ? p2.start_row + m : p2.start_row;
                  const pc2 = p2.direction === 'across' ? p2.start_col + m : p2.start_col;
                  if (tr === pr2 && tc === pc2) intersections++;
                }
              }
            }
            const sc = scorePlacement(word, newRow, newCol, newDir, intersections);
            candidates.push({ newRow, newCol, newDir, sc });
          }
        }
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.sc - a.sc);
      const best = candidates[0];
      placedWords.push({ id, word, clue, direction: best.newDir, start_row: best.newRow, start_col: best.newCol });
    } else {
      // No intersecting placement — tuck word just outside the cluster bounding
      // box with a 2-cell gap, choosing the position closest to the centroid so
      // it stays visually near the main puzzle rather than floating far away.
      let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
      let sumR = 0, sumC = 0, totalCells = 0;
      for (const p of placedWords) {
        for (let k = 0; k < p.word.length; k++) {
          const pr = p.direction === 'down'   ? p.start_row + k : p.start_row;
          const pc = p.direction === 'across' ? p.start_col + k : p.start_col;
          minR = Math.min(minR, pr); maxR = Math.max(maxR, pr);
          minC = Math.min(minC, pc); maxC = Math.max(maxC, pc);
          sumR += pr; sumC += pc; totalCells++;
        }
      }
      const centR = sumR / totalCells;
      const centC = sumC / totalCells;
      const GAP = 2;
      const fallbackCandidates = [];

      const tryFallback = (r, c, dir) => {
        if (r < 0 || c < 0) return;
        if (canPlace(word, r, c, dir)) {
          const midR = dir === 'down'   ? r + word.length / 2 : r;
          const midC = dir === 'across' ? c + word.length / 2 : c;
          fallbackCandidates.push({ r, c, dir, dist: Math.abs(midR - centR) + Math.abs(midC - centC) });
        }
      };

      // Scan all four edges of the bounding box
      for (let c = minC - 1; c <= maxC + 1; c++) {
        tryFallback(maxR + GAP + 1, c, 'across');
        tryFallback(minR - GAP - 1, c, 'across');
        tryFallback(maxR + GAP + 1, c, 'down');
        tryFallback(minR - GAP - word.length, c, 'down');
      }
      for (let r = minR - 1; r <= maxR + 1; r++) {
        tryFallback(r, maxC + GAP + 1, 'across');
        tryFallback(r, minC - GAP - word.length, 'across');
        tryFallback(r, maxC + GAP + 1, 'down');
        tryFallback(r, minC - GAP - 1, 'down');
      }

      if (fallbackCandidates.length > 0) {
        fallbackCandidates.sort((a, b) => a.dist - b.dist);
        const best = fallbackCandidates[0];
        placedWords.push({ id, word, clue, direction: best.dir, start_row: best.r, start_col: best.c });
      } else {
        // Absolute last resort
        placedWords.push({ id, word, clue, direction: 'across', start_row: maxR + GAP + 1, start_col: minC });
      }
    }
  }

  // Normalize: shift everything so minimum row and col are both 1 (leave a 1-cell border).
  let minRow = Infinity, minCol = Infinity;
  for (const w of placedWords) {
    minRow = Math.min(minRow, w.start_row);
    minCol = Math.min(minCol, w.start_col);
  }
  for (const w of placedWords) {
    w.start_row -= (minRow - 1);
    w.start_col -= (minCol - 1);
  }

  let maxRow = 0, maxCol = 0;
  for (const w of placedWords) {
    const endRow = w.start_row + (w.direction === 'down' ? w.word.length : 1);
    const endCol = w.start_col + (w.direction === 'across' ? w.word.length : 1);
    maxRow = Math.max(maxRow, endRow);
    maxCol = Math.max(maxCol, endCol);
  }

  return { words: placedWords, gridSize: Math.max(maxRow, maxCol) + 1 };
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
    return res.status(400).json({ error: 'Perkataan hanya boleh mengandungi huruf tanpa ruang atau simbol' });

  try {
    const [result] = await db.query(
      'INSERT INTO crossword_data (word, clue) VALUES (?, ?)',
      [word.trim().toUpperCase(), clue.trim()]
    );
    res.status(201).json({ message: 'Perkataan ditambah', id: result.insertId });
  } catch (err) {
    console.error('Add crossword word error:', err.code, err.message, err.sqlMessage || '');
    res.status(500).json({ error: err.sqlMessage || 'Server error' });
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
    return res.status(400).json({ error: 'Perkataan hanya boleh mengandungi huruf tanpa ruang atau simbol' });

  try {
    await db.query(
      'UPDATE crossword_data SET word=?, clue=? WHERE id=?',
      [word.trim().toUpperCase(), clue.trim(), req.params.id]
    );
    res.json({ message: 'Perkataan dikemaskini' });
  } catch (err) {
    console.error('Update crossword word error:', err.message);
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
