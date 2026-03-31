import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const DEFAULT_TIMER = 300;
const DEFAULT_MIN_CORRECT = 0;

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
  const inputRefs = useRef({});
  const timerRef = useRef(null);
  const [showLB, setShowLB] = useState(false);
  const [lbData, setLbData] = useState([]);
  const [settings, setSettings] = useState({ minimum_correct: DEFAULT_MIN_CORRECT });
  const [timerTotal, setTimerTotal] = useState(DEFAULT_TIMER);

  // Load crossword data using session_id
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
        // Use admin timer if set, else default
        const timer = cfg.timer_seconds || DEFAULT_TIMER;
        setTimerTotal(timer);
        setTimeLeft(timer);
        buildGrid(w, gs);
        setPhase('playing');
      })
      .catch(() => setPhase('error'));
  }, [sessionId]);

  // Timer
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
    const done = words.filter(w => {
      return w.word.toUpperCase().split('').every((letter, i) => {
        const r = w.direction === 'across' ? w.start_row : w.start_row + i;
        const c = w.direction === 'across' ? w.start_col + i : w.start_col;
        return ug[r]?.[c] === letter;
      });
    }).map(w => w.id);
    setCompleted(done);
    if (done.length === words.length && words.length > 0) {
      clearInterval(timerRef.current);
      setShowCongrats(true);
    }
  };

  const isWordCorrect = (wordObj) => {
    return wordObj.word.toUpperCase().split('').every((letter, i) => {
      const r = wordObj.direction === 'across' ? wordObj.start_row : wordObj.start_row + i;
      const c = wordObj.direction === 'across' ? wordObj.start_col + i : wordObj.start_col;
      return userGrid[r]?.[c] === letter;
    });
  };

  const isWordFilled = (wordObj) => {
    return wordObj.word.split('').every((_, i) => {
      const r = wordObj.direction === 'across' ? wordObj.start_row : wordObj.start_row + i;
      const c = wordObj.direction === 'across' ? wordObj.start_col + i : wordObj.start_col;
      return userGrid[r]?.[c] !== '';
    });
  };

  // Submit score to backend
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
    } catch (err) {
      console.error('Score submit error:', err);
    }
  };

  // Fetch leaderboard
  const fetchLeaderboard = async () => {
    if (!sessionId) return;
    try {
      const res = await api.get(`/crossword/leaderboard/${sessionId}`);
      setLeaderboard(res.data.leaderboard || []);
      setShowLeaderboard(true);
    } catch (err) {
      console.error('Leaderboard error:', err);
    }
  };

  // Auto-submit when game completes or time runs out
  useEffect(() => {
    if (showCongrats && !scoreSubmitted) {
      submitScore(completed.length);
    }
  }, [showCongrats]);

  useEffect(() => {
    if (isGameOver && !showCongrats && !scoreSubmitted) {
      const minCorrect = settings.minimum_correct || DEFAULT_MIN_CORRECT;
      if (minCorrect > 0 ? completed.length >= minCorrect : true) {
        submitScore(completed.length);
      }
    }
  }, [isGameOver]);

  const handleInput = (row, col, e) => {
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
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      let nR = row, nC = col;
      if (e.key === 'ArrowUp') nR--;
      else if (e.key === 'ArrowDown') nR++;
      else if (e.key === 'ArrowLeft') nC--;
      else if (e.key === 'ArrowRight') nC++;
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

  const handleCheck = () => { setChecked(true); checkWords(userGrid); };

  const handleHint = () => {
    if (!selectedCell || isGameOver) return;
    const { row, col } = selectedCell;
    if (grid[row]?.[col]) {
      const ng = userGrid.map(r => [...r]);
      ng[row][col] = grid[row][col];
      setUserGrid(ng);
      checkWords(ng);
    }
  };

  const handleReveal = () => {
    setRevealAll(true);
    const ng = grid.map(r => r.map(c => c || ''));
    setUserGrid(ng);
    checkWords(ng);
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

  // Dynamic cell size based on grid
  const cellSize = gridSize > 15 ? 36 : gridSize > 12 ? 42 : 52;
  const fontSize = gridSize > 15 ? '0.85rem' : gridSize > 12 ? '1rem' : '1.2rem';

  if (phase === 'loading') return (
    <div style={s.fullPage}>
      <div style={s.center}>
        <div style={s.spinner} />
        <p style={{ color: '#94a3b8', marginTop: '1rem' }}>Loading crossword...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (phase === 'error') return (
    <div style={s.fullPage}><div style={s.center}><p style={{ color: '#e11d48' }}>❌ Failed to load crossword.</p></div></div>
  );

  const acrossWords = words.filter(w => w.direction === 'across');
  const downWords = words.filter(w => w.direction === 'down');

  return (
    <div style={s.fullPage}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pop{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}`}</style>

      {/* Congrats overlay */}
      {showCongrats && (
        <div style={s.overlay}>
          <div style={s.congratsCard}>
            <div style={{ fontSize: '4rem' }}>🎉</div>
            <h2 style={{ color: '#16a34a', fontSize: '1.5rem', fontWeight: '800', margin: '0.5rem 0' }}>Tahniah! Selesai!</h2>
            <p style={{ color: '#64748b', margin: '0 0 0.5rem' }}>Kamu berjaya melengkapkan semua perkataan! 🧩</p>
            <p style={{ color: '#2563eb', fontWeight: '700', margin: '0 0 1rem' }}>⏱️ Masa berbaki: {formatTime(timeLeft)}</p>
            {showLeaderboard && leaderboard.length > 0 && (
              <div style={s.lbBox}>
                <h3 style={s.lbTitle}>🏆 Leaderboard</h3>
                {leaderboard.slice(0, 5).map((p, i) => (
                  <div key={i} style={s.lbRow}>
                    <span style={s.lbRank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                    <span style={s.lbName}>{p.nickname}</span>
                    <span style={s.lbScore}>{p.score}</span>
                  </div>
                ))}
              </div>
            )}
            {!showLB ? (
              <button style={s.doneBtn} onClick={async () => {
                try {
                  const res = await api.get(`/cp3/crossword-leaderboard/${sessionId}`);
                  setLbData(res.data.leaderboard || []);
                } catch (err) { console.error(err); }
                setShowLB(true);
              }}>Lihat Papan Markah 🏆</button>
            ) : (
              <>
                <div style={{ ...s.lbBox, margin: '0 0 1rem' }}>
                  <h3 style={s.lbTitle}>🏆 Papan Markah Crossword</h3>
                  {lbData.map((entry, i) => (
                    <div key={entry.player_id} style={s.lbRow}>
                      <span style={s.lbRank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                      <span style={s.lbName}>{entry.nickname}</span>
                      <span style={{ ...s.lbScore, color: entry.completed ? '#16a34a' : '#e11d48' }}>{entry.completed ? '✅ 33/33' : '❌ 0/33'}</span>
                    </div>
                  ))}
                </div>
                <button style={s.doneBtn} onClick={onComplete}>Teruskan Pengembaraan! 🗺️</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Time's up overlay */}
      {isGameOver && !showCongrats && (() => {
        const minCorrect = settings.minimum_correct || DEFAULT_MIN_CORRECT;
        const passed = minCorrect > 0 ? completed.length >= minCorrect : true;
        return (
          <div style={s.overlay}>
            <div style={s.congratsCard}>
              <div style={{ fontSize: '4rem' }}>{passed ? '⭐' : '😢'}</div>
              <h2 style={{ color: passed ? '#16a34a' : '#e11d48', fontSize: '1.5rem', fontWeight: '800', margin: '0.5rem 0' }}>
                {passed ? 'Masa Tamat — Lulus!' : 'Belum Lulus!'}
              </h2>
              <p style={{ color: '#64748b', margin: '0 0 0.5rem' }}>
                Kamu selesaikan <strong style={{ color: '#2563eb' }}>{completed.length}/{words.length}</strong> perkataan ({pct}%)
              </p>
              {!passed && (
                <p style={{ color: '#94a3b8', margin: '0 0 0.5rem', fontSize: '0.88rem' }}>
                  Kamu perlu selesaikan sekurang-kurangnya <strong>{minCorrect} perkataan</strong> untuk lulus.
                </p>
              )}
              {showLeaderboard && leaderboard.length > 0 && passed && (
                <div style={s.lbBox}>
                  <h3 style={s.lbTitle}>🏆 Leaderboard</h3>
                  {leaderboard.slice(0, 5).map((p, i) => (
                    <div key={i} style={s.lbRow}>
                      <span style={s.lbRank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                      <span style={s.lbName}>{p.nickname}</span>
                      <span style={s.lbScore}>{p.score}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', width: '100%' }}>
                {!revealAll && (
                  <button style={{ ...s.doneBtn, background: '#f59e0b' }} onClick={handleReveal}>
                    👁️ Tunjuk Jawapan
                  </button>
                )}
                {passed ? (
                  <button style={s.doneBtn} onClick={onComplete}>
                    Teruskan Pengembaraan! 🗺️
                  </button>
                ) : (
                  <button style={{ ...s.doneBtn, background: '#e11d48' }} onClick={onRetry}>
                    🔄 Cuba Semula
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.headerTitle}>🧩 Crossword Puzzle — Checkpoint 2</span>
        </div>
        <div style={s.headerRight}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={s.timerBarWrap}>
              <div style={{ ...s.timerBarFill, width: `${timerPct}%`, background: timerColor }} />
            </div>
            <div style={{ color: timerColor, fontWeight: '800', fontSize: '0.9rem', minWidth: '40px', textAlign: 'right', animation: timeLeft <= 60 ? 'pulse 0.5s infinite' : 'none' }}>
              {formatTime(timeLeft)}
            </div>
          </div>
          <div style={s.progressPill}>{completed.length}/{words.length} ✓</div>
          <button style={s.checkBtn} onClick={handleCheck} disabled={isGameOver}>✅ Semak</button>
          <button style={s.hintBtn} onClick={handleHint} disabled={isGameOver}>💡 Petunjuk</button>
        </div>
      </div>

      {/* Hint bar */}
      <div style={s.hintBar}>
        {selectedWord
          ? <><strong>{words.indexOf(selectedWord) + 1}. {selectedWord.direction === 'across' ? '→' : '↓'}</strong> {selectedWord.clue} <span style={{ color: '#93c5fd' }}>({selectedWord.word.length} huruf)</span></>
          : <span style={{ color: '#475569' }}>Klik pada kotak untuk memilih perkataan</span>
        }
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
  congratsCard: { background: '#fff', borderRadius: '20px', padding: '2.5rem', textAlign: 'center', animation: 'pop 0.4s ease', maxWidth: '400px', width: '90%', maxHeight: '90vh', overflowY: 'auto' },
  doneBtn: { width: '100%', padding: '0.85rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' },
  header: { background: '#1e3a5f', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  headerLeft: { display: 'flex', alignItems: 'center' },
  headerTitle: { color: '#FFD700', fontWeight: '800', fontSize: '1rem' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  timerBarWrap: { width: '80px', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' },
  timerBarFill: { height: '100%', borderRadius: '4px', transition: 'width 1s linear, background 0.3s' },
  progressPill: { background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' },
  checkBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' },
  hintBtn: { background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' },
  hintBar: { background: '#1e293b', color: '#e2e8f0', padding: '0.5rem 1.5rem', fontSize: '0.85rem', lineHeight: 1.5, flexShrink: 0 },
  mainLayout: { flex: 1, display: 'flex', gap: '1rem', padding: '1rem 1.5rem', overflow: 'auto', alignItems: 'flex-start' },
  cluesPanel: { width: '200px', flexShrink: 0, background: '#1e293b', borderRadius: '12px', padding: '0.75rem', display: 'flex', flexDirection: 'column', maxHeight: '100%' },
  cluesPanelTitle: { color: '#FFD700', fontWeight: '800', fontSize: '0.85rem', marginBottom: '0.5rem', flexShrink: 0 },
  cluesList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  clueRow: { display: 'flex', alignItems: 'flex-start', gap: '0.3rem', padding: '0.35rem 0.5rem', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.15s' },
  clueRowActive: { background: '#2563eb' },
  clueRowDone: { opacity: 0.6 },
  clueNum: { fontSize: '0.72rem', fontWeight: '800', color: '#60a5fa', flexShrink: 0, minWidth: '16px', paddingTop: '1px' },
  clueText: { fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.4, flex: 1 },
  gridSection: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' },
  grid: { display: 'grid', gap: '1px', background: '#0f172a', border: '2px solid #334155', borderRadius: '8px', overflow: 'hidden' },
  cell: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cellNum: { position: 'absolute', top: '1px', left: '2px', fontSize: '7px', fontWeight: '800', color: '#64748b', lineHeight: 1, zIndex: 1, pointerEvents: 'none' },
  cellInput: { width: '100%', height: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: '800', textTransform: 'uppercase', outline: 'none', cursor: 'pointer', padding: 0 },
  // Leaderboard mini styles
  lbBox: { background: '#f1f5f9', borderRadius: '12px', padding: '0.75rem', margin: '0.75rem 0', textAlign: 'left', width: '100%' },
  lbTitle: { fontSize: '0.88rem', fontWeight: '800', color: '#1e3a5f', margin: '0 0 0.5rem' },
  lbRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', borderBottom: '1px solid #e2e8f0' },
  lbRank: { fontSize: '1rem', minWidth: '24px' },
  lbName: { flex: 1, fontSize: '0.82rem', fontWeight: '600', color: '#334155' },
  lbScore: { fontSize: '0.82rem', fontWeight: '700', color: '#2563eb' },
};

export default CrosswordGame;
