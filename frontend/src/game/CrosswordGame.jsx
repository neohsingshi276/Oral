import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const DEFAULT_TIMER = 300;
const DEFAULT_MIN_CORRECT = 0;
const MAX_HINTS = 3;

const CrosswordGame = ({ onComplete, onRetry, playerId, sessionId }) => {
  const [words, setWords] = useState([]);
  const [gridSize, setGridSize] = useState(10);
  const [grid, setGrid] = useState([]);
  const [userGrid, setUserGrid] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [phase, setPhase] = useState('loading');
  const [showCongrats, setShowCongrats] = useState(false);
  const [checked, setChecked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIMER);
  const [isGameOver, setIsGameOver] = useState(false);
  const [revealAll, setRevealAll] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintedCells, setHintedCells] = useState(new Set());
  const [showHintToast, setShowHintToast] = useState(false);
  const [hintToastMsg, setHintToastMsg] = useState('');
  const [showGiveUp, setShowGiveUp] = useState(false);
  const [showCheckResult, setShowCheckResult] = useState(false);
  const [checkResult, setCheckResult] = useState({ correct: 0, wrong: 0, total: 0 });
  const [reviewingAnswers, setReviewingAnswers] = useState(false);
  const [reviewPhase, setReviewPhase] = useState('viewing'); // 'viewing' | 'leaderboard'
  const inputRefs = useRef({});
  const timerRef = useRef(null);
  const [showLB, setShowLB] = useState(false);
  const [lbData, setLbData] = useState([]);
  const [settings, setSettings] = useState({ minimum_correct: DEFAULT_MIN_CORRECT });
  const [timerTotal, setTimerTotal] = useState(DEFAULT_TIMER);

  useEffect(() => {
    const endpoint = sessionId ? `/crossword/${sessionId}` : '/crossword';
    api.get(endpoint)
      .then(res => {
        const w = res.data.words;
        const gs = res.data.gridSize || 10;
        const cfg = res.data.settings || {};
        setWords(w);
        setGridSize(gs);
        setSettings(cfg);
        const timer = cfg.timer_seconds || DEFAULT_TIMER;
        setTimerTotal(timer);
        setTimeLeft(timer);
        buildGrid(w, gs);
        setPhase('playing');
      })
      .catch(() => setPhase('error'));
  }, [sessionId]);

  useEffect(() => {
    if (phase !== 'playing' || isGameOver || showCongrats) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, isGameOver, showCongrats]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const timerPct = (timeLeft / timerTotal) * 100;
  const timerColor = timeLeft > 120 ? '#16a34a' : timeLeft > 60 ? '#f59e0b' : '#e11d48';
  const hintsLeft = MAX_HINTS - hintsUsed;

  const buildGrid = (words, gs) => {
    const g = Array(gs).fill(null).map(() => Array(gs).fill(null));
    words.forEach(w => {
      w.word.toUpperCase().split('').forEach((letter, i) => {
        const row = w.direction === 'across' ? w.start_row : w.start_row + i;
        const col = w.direction === 'across' ? w.start_col + i : w.start_col;
        if (row < gs && col < gs) g[row][col] = letter;
      });
    });
    setGrid(g);
    setUserGrid(Array(gs).fill(null).map(() => Array(gs).fill('')));
  };

  const getCellWords = (row, col) => words.filter(w =>
    w.direction === 'across'
      ? w.start_row === row && col >= w.start_col && col < w.start_col + w.word.length
      : w.start_col === col && row >= w.start_row && row < w.start_row + w.word.length
  );

  const handleCellClick = (row, col) => {
    if (!grid[row]?.[col] || isGameOver) return;
    const cellWords = getCellWords(row, col);
    if (!cellWords.length) return;
    setSelectedCell({ row, col });
    if (selectedWord && cellWords.find(w => w.id === selectedWord.id)) {
      const other = cellWords.find(w => w.id !== selectedWord.id);
      if (other) setSelectedWord(other);
    } else {
      setSelectedWord(cellWords[0]);
    }
    inputRefs.current[`${row}-${col}`]?.focus();
  };

  const checkWords = (ug) => {
    const done = words.filter(w =>
      w.word.toUpperCase().split('').every((letter, i) => {
        const r = w.direction === 'across' ? w.start_row : w.start_row + i;
        const c = w.direction === 'across' ? w.start_col + i : w.start_col;
        return ug[r]?.[c] === letter;
      })
    ).map(w => w.id);
    setCompleted(done);
    if (done.length === words.length && words.length > 0) {
      clearInterval(timerRef.current);
      setShowCongrats(true);
    }
    return done;
  };

  const isWordCorrect = (wordObj) =>
    wordObj.word.toUpperCase().split('').every((letter, i) => {
      const r = wordObj.direction === 'across' ? wordObj.start_row : wordObj.start_row + i;
      const c = wordObj.direction === 'across' ? wordObj.start_col + i : wordObj.start_col;
      return userGrid[r]?.[c] === letter;
    });

  const isWordFilled = (wordObj) =>
    wordObj.word.split('').every((_, i) => {
      const r = wordObj.direction === 'across' ? wordObj.start_row : wordObj.start_row + i;
      const c = wordObj.direction === 'across' ? wordObj.start_col + i : wordObj.start_col;
      return userGrid[r]?.[c] !== '';
    });

  const submitScore = async (wordsCorrect) => {
    if (scoreSubmitted || !playerId || !sessionId) return;
    try {
      await api.post('/crossword/submit', {
        player_id: playerId,
        session_id: sessionId,
        words_correct: wordsCorrect,
        total_words: words.length,
        time_taken: timerTotal - timeLeft
      });
      setScoreSubmitted(true);
      fetchLeaderboard();
    } catch (err) { console.error('Score submit error:', err); }
  };

  const fetchLeaderboard = async () => {
    if (!sessionId) return;
    try {
      const res = await api.get(`/crossword/leaderboard/${sessionId}`);
      setLeaderboard(res.data.leaderboard || []);
      setShowLeaderboard(true);
    } catch (err) { console.error('Leaderboard error:', err); }
  };

  useEffect(() => {
    if (showCongrats && !scoreSubmitted) submitScore(completed.length);
  }, [showCongrats, completed]);

  useEffect(() => {
    if (isGameOver && !showCongrats && !scoreSubmitted) submitScore(completed.length);
  }, [isGameOver]);

  const handleInput = (row, col, e) => {
    // Fallback: still handle onChange for mobile/IME input
    if (isGameOver) return;
    const val = e.target.value;
    if (!grid[row]?.[col]) return;
    const letter = val.toUpperCase().replace(/[^A-Z]/g, '').slice(-1);
    if (!letter) return;
    const ng = userGrid.map(r => [...r]);
    ng[row][col] = letter;
    setUserGrid(ng);
    setChecked(false);
    checkWords(ng);
    if (selectedWord) {
      const next = selectedWord.direction === 'across'
        ? { row, col: col + 1 }
        : { row: row + 1, col };
      if (next.row < gridSize && next.col < gridSize && grid[next.row]?.[next.col]) {
        setSelectedCell(next);
        setTimeout(() => inputRefs.current[`${next.row}-${next.col}`]?.focus(), 10);
      }
    }
  };

  const handleKeyDown = (row, col, e) => {
    if (isGameOver) return;

    // Handle letter keys directly via keyDown for reliable input
    if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      if (!grid[row]?.[col]) return;
      const letter = e.key.toUpperCase();
      const ng = userGrid.map(r => [...r]);
      ng[row][col] = letter;
      setUserGrid(ng);
      setChecked(false);
      checkWords(ng);
      if (selectedWord) {
        const next = selectedWord.direction === 'across'
          ? { row, col: col + 1 }
          : { row: row + 1, col };
        if (next.row < gridSize && next.col < gridSize && grid[next.row]?.[next.col]) {
          setSelectedCell(next);
          setTimeout(() => inputRefs.current[`${next.row}-${next.col}`]?.focus(), 10);
        }
      }
      return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      let nR = row, nC = col;
      if (e.key === 'ArrowUp') nR--;
      else if (e.key === 'ArrowDown') nR++;
      else if (e.key === 'ArrowLeft') nC--;
      else nC++;
      if (nR >= 0 && nR < gridSize && nC >= 0 && nC < gridSize && grid[nR]?.[nC]) {
        setSelectedCell({ row: nR, col: nC });
        const cellWords = getCellWords(nR, nC);
        if (cellWords.length > 0) {
          const sameDir = cellWords.find(w => w.direction === selectedWord?.direction);
          setSelectedWord(sameDir || cellWords[0]);
        }
        setTimeout(() => inputRefs.current[`${nR}-${nC}`]?.focus(), 10);
      }
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      const ng = userGrid.map(r => [...r]);
      if (ng[row]?.[col]) {
        ng[row][col] = '';
        setUserGrid(ng);
        checkWords(ng);
      } else if (selectedWord) {
        const prev = selectedWord.direction === 'across' ? { row, col: col - 1 } : { row: row - 1, col };
        if (prev.row >= 0 && prev.col >= 0 && grid[prev.row]?.[prev.col]) {
          ng[prev.row][prev.col] = '';
          setUserGrid(ng);
          checkWords(ng);
          setSelectedCell(prev);
          setTimeout(() => inputRefs.current[`${prev.row}-${prev.col}`]?.focus(), 10);
        }
      }
    }
  };

  const handleCheck = () => {
    setChecked(true);
    const done = checkWords(userGrid);
    // Count filled words
    const filledWords = words.filter(w => isWordFilled(w));
    const correctCount = filledWords.filter(w => done.includes(w.id)).length;
    const wrongCount = filledWords.filter(w => !done.includes(w.id)).length;
    setCheckResult({ correct: correctCount, wrong: wrongCount, total: words.length });
    setShowCheckResult(true);
    setTimeout(() => setShowCheckResult(false), 3000);
  };

  const handleHint = () => {
    if (isGameOver || hintsUsed >= MAX_HINTS) return;
    if (!selectedWord) {
      setHintToastMsg('💡 Pilih perkataan dahulu sebelum guna petunjuk!');
      setShowHintToast(true);
      setTimeout(() => setShowHintToast(false), 2500);
      return;
    }
    // Reveal every letter of the selected word
    const ng = userGrid.map(r => [...r]);
    const newHinted = new Set(hintedCells);
    selectedWord.word.toUpperCase().split('').forEach((letter, i) => {
      const r = selectedWord.direction === 'across' ? selectedWord.start_row : selectedWord.start_row + i;
      const c = selectedWord.direction === 'across' ? selectedWord.start_col + i : selectedWord.start_col;
      ng[r][c] = letter;
      newHinted.add(`${r}-${c}`);
    });
    setUserGrid(ng);
    setHintedCells(newHinted);
    checkWords(ng);
    setHintsUsed(h => h + 1);
    const remaining = MAX_HINTS - hintsUsed - 1;
    setHintToastMsg(
      remaining === 0
        ? `💡 Petunjuk digunakan untuk "${selectedWord.word}"! Tiada petunjuk lagi.`
        : `💡 "${selectedWord.word}" didedahkan! ${remaining} petunjuk berbaki.`
    );
    setShowHintToast(true);
    setTimeout(() => setShowHintToast(false), 2500);
  };

  const handleReveal = () => {
    setRevealAll(true);
    const ng = grid.map(r => r.map(c => c || ''));
    setUserGrid(ng);
    checkWords(ng);
    // Close overlay and let user see the answers on the grid
    setReviewingAnswers(true);
    setReviewPhase('viewing');
  };

  const handleGiveUp = () => {
    clearInterval(timerRef.current);
    setIsGameOver(true);
    setShowGiveUp(false);
    if (!scoreSubmitted) submitScore(completed.length);
  };

  const isCellInWord = (row, col) => {
    if (!selectedWord) return false;
    return selectedWord.direction === 'across'
      ? selectedWord.start_row === row && col >= selectedWord.start_col && col < selectedWord.start_col + selectedWord.word.length
      : selectedWord.start_col === col && row >= selectedWord.start_row && row < selectedWord.start_row + selectedWord.word.length;
  };

  const getCellBg = (row, col) => {
    if (!grid[row]?.[col]) return '#1e293b';
    if (revealAll && userGrid[row]?.[col]) return '#bbf7d0';
    if (selectedCell?.row === row && selectedCell?.col === col) return '#FFD700';
    if (checked && userGrid[row]?.[col] && userGrid[row][col] === grid[row][col]) return '#bbf7d0';
    if (checked && userGrid[row]?.[col] && userGrid[row][col] !== grid[row][col]) return '#fecaca';
    if (hintedCells.has(`${row}-${col}`)) return '#fef3c7'; // amber tint for hinted cells
    if (isCellInWord(row, col)) return '#bfdbfe';
    return '#fff';
  };

  const getCellTextColor = (row, col) => {
    if (revealAll) return '#16a34a';
    const cellWords = getCellWords(row, col);
    for (const w of cellWords) { if (isWordCorrect(w)) return '#16a34a'; }
    for (const w of cellWords) { if (isWordFilled(w) && !isWordCorrect(w)) return '#e11d48'; }
    return '#1e293b';
  };

  const getWordNum = (row, col) => {
    const idx = words.findIndex(w => w.start_row === row && w.start_col === col);
    return idx >= 0 ? idx + 1 : null;
  };

  const cellSize = gridSize > 15 ? 40 : gridSize > 12 ? 46 : 56;
  const fontSize = gridSize > 15 ? '0.9rem' : gridSize > 12 ? '1.05rem' : '1.25rem';
  const minCorrect = settings.minimum_correct || DEFAULT_MIN_CORRECT;
  const passed = minCorrect > 0 ? completed.length >= minCorrect : true;
  const pct = words.length > 0 ? Math.round((completed.length / words.length) * 100) : 0;

  if (phase === 'loading') return (
    <div style={s.fullPage}>
      <div style={s.center}>
        <div style={s.spinner} />
        <p style={{ color: '#94a3b8', marginTop: '1rem' }}>Memuatkan crossword...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (phase === 'error') return (
    <div style={s.fullPage}><div style={s.center}><p style={{ color: '#e11d48' }}>❌ Gagal memuatkan crossword.</p></div></div>
  );

  const acrossWords = words.filter(w => w.direction === 'across');
  const downWords = words.filter(w => w.direction === 'down');

  return (
    <div style={s.fullPage}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pop{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}} @keyframes slideIn{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}} @keyframes hintPulse{0%,100%{background:#f59e0b}50%{background:#d97706}}`}</style>

      {/* Give Up Confirm Dialog */}
      {showGiveUp && (
        <div style={s.overlay}>
          <div style={{ ...s.congratsCard, maxWidth: '340px' }}>
            <div style={{ fontSize: '3rem' }}>🏳️</div>
            <h2 style={{ color: '#e11d48', fontSize: '1.3rem', fontWeight: '800', margin: '0.5rem 0' }}>Menyerah Kalah?</h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Kamu telah menjawab <strong style={{ color: '#2563eb' }}>{completed.length}/{words.length}</strong> perkataan dengan betul.
              Adakah kamu pasti mahu menyerah?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button style={{ ...s.doneBtn, background: '#64748b', flex: 1 }} onClick={() => setShowGiveUp(false)}>
                Batal
              </button>
              <button style={{ ...s.doneBtn, background: '#e11d48', flex: 1 }} onClick={handleGiveUp}>
                Ya, Menyerah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check Result Toast */}
      {showCheckResult && (
        <div style={s.toast}>
          <span style={{ color: '#16a34a', fontWeight: '700' }}>✅ {checkResult.correct} betul</span>
          {checkResult.wrong > 0 && <span style={{ color: '#e11d48', fontWeight: '700' }}>  ❌ {checkResult.wrong} salah</span>}
          {checkResult.correct === 0 && checkResult.wrong === 0 && <span style={{ color: '#f59e0b' }}>Tiada perkataan dilengkapkan lagi</span>}
        </div>
      )}

      {/* Hint Toast */}
      {showHintToast && (
        <div style={{ ...s.toast, top: showCheckResult ? '120px' : '70px', background: '#1c1917', border: '1px solid #a16207' }}>
          <span style={{ color: '#fbbf24', fontWeight: '600', fontSize: '0.88rem' }}>{hintToastMsg}</span>
        </div>
      )}

      {/* Congrats overlay */}
      {showCongrats && !showLB && !reviewingAnswers && (
        <div style={s.overlay}>
          <div style={s.congratsCard}>
            <div style={{ fontSize: '4rem' }}>🎉</div>
            <h2 style={{ color: '#16a34a', fontSize: '1.5rem', fontWeight: '800', margin: '0.5rem 0' }}>Tahniah! Selesai!</h2>
            <p style={{ color: '#64748b', margin: '0 0 0.5rem' }}>Kamu berjaya melengkapkan semua perkataan! 🧩</p>
            <p style={{ color: '#2563eb', fontWeight: '700', margin: '0 0 0.25rem' }}>⏱️ Masa berbaki: {formatTime(timeLeft)}</p>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 1rem' }}>💡 Petunjuk digunakan: {hintsUsed}/{MAX_HINTS}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
              <button style={{ ...s.doneBtn, background: '#f59e0b' }} onClick={() => {
                setReviewingAnswers(true);
              }}>👁️ Lihat Jawapan di Papan</button>
              <button style={{ ...s.doneBtn, background: '#7c3aed' }} onClick={async () => {
                try {
                  const res = await api.get(`/cp3/crossword-leaderboard/${sessionId}`);
                  setLbData(res.data.leaderboard || []);
                } catch (err) { console.error(err); }
                setShowLB(true);
              }}>Teruskan ke Papan Markah 🏆</button>
            </div>
          </div>
        </div>
      )}

      {/* Time's up / Game Over overlay — hidden when reviewing answers */}
      {isGameOver && !showCongrats && !reviewingAnswers && (
        <div style={s.overlay}>
          <div style={s.congratsCard}>
            <div style={{ fontSize: '4rem' }}>{passed ? '⭐' : '😢'}</div>
            <h2 style={{ color: passed ? '#16a34a' : '#e11d48', fontSize: '1.5rem', fontWeight: '800', margin: '0.5rem 0' }}>
              {timeLeft === 0 ? 'Masa Tamat!' : 'Menyerah Kalah'}
            </h2>
            <p style={{ color: '#64748b', margin: '0 0 0.25rem' }}>
              Kamu selesaikan <strong style={{ color: '#2563eb' }}>{completed.length}/{words.length}</strong> perkataan ({pct}%)
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 1rem' }}>
              💡 Petunjuk digunakan: {hintsUsed}/{MAX_HINTS}
            </p>
            {minCorrect > 0 && !passed && (
              <p style={{ color: '#f59e0b', margin: '0 0 1rem', fontSize: '0.88rem', background: '#fef9ee', padding: '0.5rem', borderRadius: '8px' }}>
                ⚠️ Perlu sekurang-kurangnya <strong>{minCorrect} perkataan</strong> untuk lulus.
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', width: '100%' }}>
              <button style={{ ...s.doneBtn, background: '#f59e0b' }} onClick={handleReveal}>
                👁️ Tunjuk Semua Jawapan
              </button>
              {passed ? (
                <button style={{ ...s.doneBtn, background: '#7c3aed' }} onClick={async () => {
                  try {
                    const res = await api.get(`/cp3/crossword-leaderboard/${sessionId}`);
                    setLbData(res.data.leaderboard || []);
                  } catch (err) { console.error(err); }
                  setShowLB(true);
                }}>Lihat Papan Markah 🏆 & Teruskan</button>
              ) : (
                <button style={{ ...s.doneBtn, background: '#e11d48' }} onClick={onRetry}>
                  🔄 Cuba Semula
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard overlay — shown when user skips reveal or clicks proceed from review */}
      {showLB && (
        <div style={s.overlay}>
          <div style={s.congratsCard}>
            <div style={{ fontSize: '3rem' }}>🏆</div>
            <h2 style={{ color: '#7c3aed', fontSize: '1.4rem', fontWeight: '800', margin: '0.5rem 0' }}>Papan Markah</h2>
            <div style={{ ...s.lbBox, margin: '0.5rem 0 1rem' }}>
              {lbData.length > 0 ? lbData.map((entry, i) => (
                <div key={entry.player_id} style={s.lbRow}>
                  <span style={s.lbRank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                  <span style={s.lbName}>{entry.nickname}</span>
                  <span style={{ ...s.lbScore, color: entry.completed ? '#16a34a' : '#e11d48' }}>{entry.completed ? '✅ Selesai' : `${entry.words_correct || 0}/${words.length}`}</span>
                </div>
              )) : (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem', fontSize: '0.85rem' }}>Tiada data papan markah lagi.</p>
              )}
            </div>
            <button style={s.doneBtn} onClick={onComplete}>Teruskan Pengembaraan! 🗺️</button>
          </div>
        </div>
      )}

      {/* Floating bottom bar when reviewing answers */}
      {reviewingAnswers && !showLB && (
        <div style={s.reviewBar}>
          <div style={s.reviewBarInner}>
            <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '0.95rem' }}>👁️ Semua jawapan ditunjukkan — Semak jawapan anda!</span>
            <button
              style={{ ...s.doneBtn, width: 'auto', padding: '0.7rem 2rem', background: '#7c3aed', fontSize: '0.95rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(124,58,237,0.4)' }}
              onClick={async () => {
                try {
                  const res = await api.get(`/cp3/crossword-leaderboard/${sessionId}`);
                  setLbData(res.data.leaderboard || []);
                } catch (err) { console.error(err); }
                setShowLB(true);
              }}
            >
              Teruskan → Lihat Papan Markah 🏆
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.headerTitle}>🧩 Crossword — Checkpoint 2</span>
        </div>
        <div style={s.headerRight}>
          {/* Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={s.timerBarWrap}>
              <div style={{ ...s.timerBarFill, width: `${timerPct}%`, background: timerColor }} />
            </div>
            <div style={{ color: timerColor, fontWeight: '800', fontSize: '0.9rem', minWidth: '40px', textAlign: 'right', animation: timeLeft <= 60 ? 'pulse 0.5s infinite' : 'none' }}>
              {formatTime(timeLeft)}
            </div>
          </div>
          {/* Progress */}
          <div style={s.progressPill}>{completed.length}/{words.length} ✓</div>
          {/* Hint count */}
          <div style={{ ...s.progressPill, background: hintsLeft > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)', color: hintsLeft > 0 ? '#fbbf24' : '#fca5a5' }}>
            💡 {hintsLeft}/{MAX_HINTS}
          </div>
          <button style={s.checkBtn} onClick={handleCheck} disabled={isGameOver}>✅ Semak</button>
          <button
            style={{
              ...s.hintBtn,
              opacity: hintsLeft === 0 || isGameOver ? 0.5 : 1,
              cursor: hintsLeft === 0 || isGameOver ? 'not-allowed' : 'pointer',
              animation: hintsLeft > 0 && !isGameOver && selectedWord ? 'hintPulse 1.5s ease-in-out infinite' : 'none',
              boxShadow: hintsLeft > 0 && !isGameOver && selectedWord ? '0 0 8px rgba(245,158,11,0.6)' : 'none',
            }}
            onClick={handleHint}
            disabled={isGameOver || hintsLeft === 0}
            title={hintsLeft === 0 ? 'Tiada petunjuk lagi!' : `${hintsLeft} petunjuk berbaki — klik untuk dedahkan perkataan yang dipilih`}
          >
            💡 Petunjuk ({hintsLeft})
          </button>
          <button style={{ ...s.hintBtn, background: '#e11d48' }} onClick={() => setShowGiveUp(true)} disabled={isGameOver}>
            🏳️ Menyerah
          </button>
        </div>
      </div>

      {/* Info bar — shows clue + timer info */}
      <div style={s.hintBar}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            {selectedWord
              ? <><strong>{words.indexOf(selectedWord) + 1}. {selectedWord.direction === 'across' ? '→' : '↓'}</strong> {selectedWord.clue} <span style={{ color: '#93c5fd' }}>({selectedWord.word.length} huruf)</span></>
              : <span style={{ color: '#475569' }}>Klik pada kotak untuk memilih perkataan</span>
            }
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: '#64748b', flexShrink: 0 }}>
            <span>⏱️ Had masa: <strong style={{ color: '#93c5fd' }}>{formatTime(timerTotal)}</strong></span>
            <span>💡 Petunjuk: <strong style={{ color: '#fbbf24' }}>{MAX_HINTS} kali</strong></span>
            {minCorrect > 0 && <span>🎯 Lulus: <strong style={{ color: '#86efac' }}>{minCorrect} perkataan</strong></span>}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div style={s.mainLayout}>
        {/* Across clues */}
        <div style={s.cluesPanel}>
          <div style={s.cluesPanelTitle}>→ Mendatar</div>
          <div style={s.cluesList}>
            {acrossWords.map(w => {
              const isDone = completed.includes(w.id);
              const isFull = isWordFilled(w) && !isDone;
              return (
                <div key={w.id}
                  style={{ ...s.clueRow, ...(selectedWord?.id === w.id ? s.clueRowActive : {}), ...(isDone ? s.clueRowDone : {}) }}
                  onClick={() => { if (!isGameOver) { setSelectedWord(w); setSelectedCell({ row: w.start_row, col: w.start_col }); inputRefs.current[`${w.start_row}-${w.start_col}`]?.focus(); } }}
                >
                  <span style={s.clueNum}>{words.indexOf(w) + 1}.</span>
                  <span style={{ ...s.clueText, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? '#16a34a' : isFull ? '#f87171' : '#cbd5e1' }}>{w.clue}</span>
                  {isDone && <span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        <div style={s.gridSection}>
          <div style={{ ...s.grid, gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)` }}>
            {Array(gridSize).fill(null).map((_, row) =>
              Array(gridSize).fill(null).map((_, col) => {
                const active = !!grid[row]?.[col];
                const num = getWordNum(row, col);
                return (
                  <div key={`${row}-${col}`} style={{ ...s.cell, width: `${cellSize}px`, height: `${cellSize}px`, background: getCellBg(row, col), cursor: active ? 'pointer' : 'default', border: active ? '2px solid #334155' : '1px solid #0f172a' }} onClick={() => active && handleCellClick(row, col)}>
                    {num && <div style={s.cellNum}>{num}</div>}
                    {active && (
                      <input
                        ref={el => inputRefs.current[`${row}-${col}`] = el}
                        style={{ ...s.cellInput, color: getCellTextColor(row, col), fontSize }}
                        maxLength={2}
                        value={userGrid[row]?.[col] || ''}
                        onChange={e => handleInput(row, col, e)}
                        onKeyDown={e => handleKeyDown(row, col, e)}
                        onClick={() => handleCellClick(row, col)}
                        disabled={isGameOver}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Down clues */}
        <div style={s.cluesPanel}>
          <div style={s.cluesPanelTitle}>↓ Menegak</div>
          <div style={s.cluesList}>
            {downWords.map(w => {
              const isDone = completed.includes(w.id);
              const isFull = isWordFilled(w) && !isDone;
              return (
                <div key={w.id}
                  style={{ ...s.clueRow, ...(selectedWord?.id === w.id ? s.clueRowActive : {}), ...(isDone ? s.clueRowDone : {}) }}
                  onClick={() => { if (!isGameOver) { setSelectedWord(w); setSelectedCell({ row: w.start_row, col: w.start_col }); inputRefs.current[`${w.start_row}-${w.start_col}`]?.focus(); } }}
                >
                  <span style={s.clueNum}>{words.indexOf(w) + 1}.</span>
                  <span style={{ ...s.clueText, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? '#16a34a' : isFull ? '#f87171' : '#cbd5e1' }}>{w.clue}</span>
                  {isDone && <span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const s = {
  fullPage: { position: 'fixed', inset: 0, background: '#0f172a', zIndex: 200, display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' },
  center: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  spinner: { width: '36px', height: '36px', border: '4px solid #334155', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  overlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  congratsCard: { background: '#fff', borderRadius: '20px', padding: '2.5rem', textAlign: 'center', animation: 'pop 0.4s ease', maxWidth: '420px', width: '90%', maxHeight: '90vh', overflowY: 'auto' },
  toast: { position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '12px', zIndex: 60, display: 'flex', gap: '1rem', fontSize: '0.9rem', animation: 'slideIn 0.3s ease', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' },
  doneBtn: { width: '100%', padding: '0.85rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' },
  header: { background: '#1e3a5f', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: '0.5rem' },
  headerLeft: { display: 'flex', alignItems: 'center' },
  headerTitle: { color: '#FFD700', fontWeight: '800', fontSize: '0.95rem' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' },
  timerBarWrap: { width: '70px', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' },
  timerBarFill: { height: '100%', borderRadius: '4px', transition: 'width 1s linear, background 0.3s' },
  progressPill: { background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '0.3rem 0.6rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '600' },
  checkBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.4rem 0.7rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.78rem' },
  hintBtn: { background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.4rem 0.7rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.78rem' },
  hintBar: { background: '#1e293b', color: '#e2e8f0', padding: '0.5rem 1rem', fontSize: '0.83rem', lineHeight: 1.5, flexShrink: 0 },
  mainLayout: { flex: 1, display: 'flex', gap: '1rem', padding: '1rem 1.25rem', overflow: 'auto', alignItems: 'flex-start' },
  cluesPanel: { width: '220px', flexShrink: 0, background: '#1e293b', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', maxHeight: '100%' },
  cluesPanelTitle: { color: '#FFD700', fontWeight: '800', fontSize: '0.85rem', marginBottom: '0.6rem', flexShrink: 0, borderBottom: '1px solid #334155', paddingBottom: '0.4rem' },
  cluesList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  clueRow: { display: 'flex', alignItems: 'flex-start', gap: '0.4rem', padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.15s' },
  clueRowActive: { background: '#2563eb' },
  clueRowDone: { opacity: 0.6 },
  clueNum: { fontSize: '0.72rem', fontWeight: '800', color: '#60a5fa', flexShrink: 0, minWidth: '18px', paddingTop: '2px' },
  clueText: { fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.5, flex: 1 },
  gridSection: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '0.5rem' },
  grid: { display: 'grid', gap: '1px', background: '#0f172a', border: '2px solid #334155', borderRadius: '8px', overflow: 'hidden' },
  cell: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cellNum: { position: 'absolute', top: '1px', left: '2px', fontSize: '7px', fontWeight: '800', color: '#64748b', lineHeight: 1, zIndex: 1, pointerEvents: 'none' },
  cellInput: { width: '100%', height: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: '800', textTransform: 'uppercase', outline: 'none', cursor: 'pointer', padding: 0 },
  lbBox: { background: '#f1f5f9', borderRadius: '12px', padding: '0.75rem', margin: '0.75rem 0', textAlign: 'left', width: '100%' },
  lbTitle: { fontSize: '0.88rem', fontWeight: '800', color: '#1e3a5f', margin: '0 0 0.5rem' },
  lbRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', borderBottom: '1px solid #e2e8f0' },
  lbRank: { fontSize: '1rem', minWidth: '24px' },
  lbName: { flex: 1, fontSize: '0.82rem', fontWeight: '600', color: '#334155' },
  lbScore: { fontSize: '0.82rem', fontWeight: '700', color: '#2563eb' },
  reviewBar: { position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'linear-gradient(to top, rgba(15,23,42,0.98), rgba(15,23,42,0.9))', backdropFilter: 'blur(10px)', borderTop: '2px solid #334155', padding: '1rem 1.5rem', animation: 'slideIn 0.4s ease' },
  reviewBarInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', maxWidth: '900px', margin: '0 auto', flexWrap: 'wrap' },
};

export default CrosswordGame;
