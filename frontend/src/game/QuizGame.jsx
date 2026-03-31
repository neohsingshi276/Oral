import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const QuizGame = ({ player, onQuizComplete, onRetry }) => {
  const [phase, setPhase] = useState('loading');
  const [questions, setQuestions] = useState([]);
  const [settings, setSettings] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState([]);
  const [matchLines, setMatchLines] = useState([]);
  const [leftSelected, setLeftSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(15);
  const [result, setResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [totalScore, setTotalScore] = useState(0);
  const [startTime] = useState(Date.now());
  const timerRef = useRef(null);

  useEffect(() => {
    api.get(`/quiz/session/${player.session_id}`)
      .then(res => {
        setQuestions(res.data.questions);
        setSettings(res.data.settings);
        setTimeLeft(res.data.settings.timer_seconds || 15);
        setPhase('playing');
      })
      .catch(() => setPhase('error'));
  }, [player.session_id]);

  useEffect(() => {
    if (phase !== 'playing' || answered) return;
    const t = settings.timer_seconds || 15;
    setTimeLeft(t);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handleTimeout(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentQ, phase, answered]);

  const handleTimeout = () => {
    if (answered) return;
    const q = questions[currentQ];
    setAnswered(true);
    setAnswers(prev => [...prev, { question_id: q.id, selected_indexes: [], timed_out: true }]);
    setTimeout(() => nextQuestion(), 2000);
  };

  const handleMCSelect = (idx) => {
    if (answered) return;
    clearInterval(timerRef.current);
    setSelected([idx]);
    setAnswered(true);
    const q = questions[currentQ];
    setAnswers(prev => [...prev, { question_id: q.id, selected_indexes: [idx] }]);
    setTimeout(() => nextQuestion(), 1800);
  };

  const handleMultiToggle = (idx) => {
    if (answered) return;
    setSelected(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  const handleMultiSubmit = () => {
    if (answered || selected.length === 0) return;
    clearInterval(timerRef.current);
    setAnswered(true);
    const q = questions[currentQ];
    setAnswers(prev => [...prev, { question_id: q.id, selected_indexes: selected }]);
    setTimeout(() => nextQuestion(), 1800);
  };

  const handleMatchLeft = (idx) => {
    if (answered) return;
    setLeftSelected(idx);
  };

  const handleMatchRight = (idx) => {
    if (answered || leftSelected === null) return;
    const exists = matchLines.find(l => l[0] === leftSelected);
    if (exists) {
      setMatchLines(prev => prev.map(l => l[0] === leftSelected ? [leftSelected, idx] : l));
    } else {
      setMatchLines(prev => [...prev, [leftSelected, idx]]);
    }
    setLeftSelected(null);
  };

  const handleMatchSubmit = () => {
    if (answered) return;
    clearInterval(timerRef.current);
    setAnswered(true);
    const q = questions[currentQ];
    setAnswers(prev => [...prev, { question_id: q.id, selected_indexes: matchLines }]);
    setTimeout(() => nextQuestion(), 2000);
  };

  const nextQuestion = () => {
    setSelected([]);
    setMatchLines([]);
    setLeftSelected(null);
    setAnswered(false);
    if (currentQ + 1 >= questions.length) {
      submitQuiz();
    } else {
      setCurrentQ(prev => prev + 1);
    }
  };

  const submitQuiz = async () => {
    setPhase('loading');
    try {
      const timeTaken = Math.round((Date.now() - startTime) / 1000);
      const res = await api.post('/quiz/submit', {
        player_id: player.id,
        session_id: player.session_id,
        answers,
        time_taken: timeTaken,
      });
      setResult(res.data);
      setTotalScore(res.data.score);
      // Wait 500ms to make sure score is saved before fetching leaderboard
      await new Promise(resolve => setTimeout(resolve, 500));
      const lb = await api.get(`/quiz/leaderboard/${player.session_id}`);
      setLeaderboard(lb.data.leaderboard);
      setPhase('result');
    } catch (err) {
      console.error(err);
      setPhase('error');
    }
  };

  const isCorrect = (q, idx) => {
    if (!q.correct_answer) return false;
    const ca = Array.isArray(q.correct_answer) ? q.correct_answer : JSON.parse(q.correct_answer);
    return ca.includes(idx);
  };

  const OPTION_COLORS = ['#e21b3c', '#1368ce', '#26890c', '#ffa602', '#9c27b0', '#00bcd4'];
  const OPTION_ICONS = ['▲', '◆', '●', '★', '■', '✦'];

  if (phase === 'loading') return (
    <div style={s.center}>
      <div style={s.spinner} />
      <p style={{ color: '#64748b', marginTop: '1rem', fontSize: '0.95rem' }}>Loading quiz...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (phase === 'error') return (
    <div style={s.center}>
      <p style={{ color: '#e11d48', fontSize: '1rem' }}>❌ Failed to load quiz. Please try again.</p>
    </div>
  );

  if (phase === 'result') return (
    <div style={s.resultWrap}>
      <style>{`@keyframes pop{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={s.scoreCard}>
        <div style={s.scoreTrophy}>{result.correct === result.total ? '🏆' : result.correct >= result.total / 2 ? '⭐' : '💪'}</div>
        <h2 style={s.scoreTitle}>Tahniah! Quiz Selesai!</h2>
        <div style={s.scoreBig}>{result.score}</div>
        <p style={s.scorePoints}>mata</p>
        <div style={s.scoreStats}>
          <div style={s.scoreStat}><div style={{ ...s.scoreStatVal, color: '#16a34a' }}>{result.correct}</div><div style={s.scoreStatLabel}>Betul</div></div>
          <div style={s.scoreDivider} />
          <div style={s.scoreStat}><div style={{ ...s.scoreStatVal, color: '#e11d48' }}>{result.total - result.correct}</div><div style={s.scoreStatLabel}>Salah</div></div>
          <div style={s.scoreDivider} />
          <div style={s.scoreStat}><div style={{ ...s.scoreStatVal, color: '#f59e0b' }}>{result.total}</div><div style={s.scoreStatLabel}>Jumlah</div></div>
        </div>
      </div>

      <div style={s.lbCard}>
        <h3 style={s.lbTitle}>🏆 Papan Markah Sesi</h3>
        <div style={s.lbList}>
          {leaderboard.map((entry, i) => (
            <div key={entry.id} style={{ ...s.lbRow, ...(entry.player_id === player.id ? s.lbRowMe : {}), background: i === 0 ? '#fef9ee' : i === 1 ? '#f8fafc' : i === 2 ? '#fff7ed' : '#fff' }}>
              <div style={s.lbRank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</div>
              <div style={s.lbName}>{entry.nickname}{entry.player_id === player.id && <span style={s.youBadge}>Anda</span>}</div>
              <div style={s.lbScore}>{entry.score} mata</div>
              <div style={s.lbCorrect}>{entry.correct_answers}/{entry.total_questions} ✓</div>
            </div>
          ))}
          {leaderboard.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>Tiada markah lagi</p>}
        </div>
      </div>
      {result.correct >= (settings.minimum_correct || 0) ? (
        <button style={s.doneBtn} onClick={onQuizComplete}>
          Teruskan Pengembaraan! 🗺️
        </button>
      ) : (
        <div>
          <div style={s.failBox}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>😢</div>
            <h3 style={{ color: '#e11d48', fontWeight: '800', margin: '0 0 0.5rem' }}>
              Belum Lulus!
            </h3>
            <p style={{ color: '#64748b', margin: '0 0 1rem', fontSize: '0.95rem' }}>
              Kamu perlu betulkan sekurang-kurangnya <strong>{settings.minimum_correct || 0} soalan</strong> untuk lulus.
              Kamu betulkan <strong>{result.correct}/{result.total}</strong>.
            </p>
            <button style={s.retryBtn} onClick={onRetry}>
              🔄 Cuba Semula Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const q = questions[currentQ];
  const opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');
  const ca = Array.isArray(q.correct_answer) ? q.correct_answer : JSON.parse(q.correct_answer || '[]');
  const timerPct = (timeLeft / (settings.timer_seconds || 15)) * 100;
  const timerColor = timeLeft > 10 ? '#16a34a' : timeLeft > 5 ? '#f59e0b' : '#e11d48';

  return (
    <div style={s.quizWrap}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}`}</style>

      {/* Header: progress + timer */}
      <div style={s.quizHeader}>
        <span style={s.qCounter}>{currentQ + 1} / {questions.length}</span>
        <div style={s.timerBarWrap}>
          <div style={{ ...s.timerBarFill, width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background 0.3s' }} />
        </div>
        <div style={{ ...s.timerNum, color: timerColor, animation: timeLeft <= 5 ? 'pulse 0.5s infinite' : 'none' }}>{timeLeft}s</div>
      </div>

      {/* Question box */}
      <div style={s.questionBox}>
        {q.image_url && (
          <img src={`${API_BASE}${q.image_url}`} alt="question" style={s.questionImg} onError={e => e.target.style.display = 'none'} />
        )}
        <p style={s.questionText}>{q.question}</p>
        {q.question_type === 'multi_select' && <p style={s.multiHint}>Pilih SEMUA jawapan yang betul</p>}
        {q.question_type === 'match' && <p style={s.multiHint}>Padankan setiap pasangan yang betul</p>}
      </div>

      {/* Multiple choice / True False */}
      {(q.question_type === 'multiple_choice' || q.question_type === 'true_false') && (
        <div style={{ ...s.optGrid, gridTemplateColumns: opts.length <= 2 ? '1fr 1fr' : opts.length <= 4 ? '1fr 1fr' : 'repeat(3, 1fr)' }}>
          {opts.map((opt, idx) => {
            let bg = OPTION_COLORS[idx % OPTION_COLORS.length];
            if (answered) {
              if (isCorrect(q, idx)) bg = '#16a34a';
              else if (selected.includes(idx)) bg = '#e11d48';
              else bg = '#94a3b8';
            }
            return (
              <button key={idx} style={{ ...s.optBtn, background: bg, opacity: answered && !isCorrect(q, idx) && !selected.includes(idx) ? 0.5 : 1 }} onClick={() => handleMCSelect(idx)} disabled={answered}>
                <span style={s.optIcon}>{OPTION_ICONS[idx % OPTION_ICONS.length]}</span>
                <span style={s.optText}>{opt}</span>
                {answered && isCorrect(q, idx) && <span style={s.optCheck}>✓</span>}
                {answered && selected.includes(idx) && !isCorrect(q, idx) && <span style={s.optCheck}>✗</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Multi-select */}
      {q.question_type === 'multi_select' && (
        <>
          <div style={{ ...s.optGrid, gridTemplateColumns: opts.length <= 4 ? '1fr 1fr' : 'repeat(3, 1fr)' }}>
            {opts.map((opt, idx) => {
              let bg = OPTION_COLORS[idx % OPTION_COLORS.length];
              if (answered) {
                if (isCorrect(q, idx)) bg = '#16a34a';
                else if (selected.includes(idx)) bg = '#e11d48';
                else bg = '#94a3b8';
              } else if (selected.includes(idx)) {
                bg = '#1e3a5f';
              }
              return (
                <button key={idx} style={{ ...s.optBtn, background: bg, border: selected.includes(idx) && !answered ? '3px solid #FFD700' : '3px solid transparent' }} onClick={() => handleMultiToggle(idx)} disabled={answered}>
                  <span style={s.optIcon}>{OPTION_ICONS[idx % OPTION_ICONS.length]}</span>
                  <span style={s.optText}>{opt}</span>
                  {selected.includes(idx) && !answered && <span style={s.optCheck}>✓</span>}
                </button>
              );
            })}
          </div>
          {!answered && (
            <button style={{ ...s.submitBtn, opacity: selected.length === 0 ? 0.5 : 1 }} onClick={handleMultiSubmit} disabled={selected.length === 0}>
              Hantar Jawapan ({selected.length} dipilih)
            </button>
          )}
        </>
      )}

      {/* Match / Binding */}
      {q.question_type === 'match' && (
        <>
          <div style={s.matchWrap}>
            <div style={s.matchCol}>
              <p style={s.matchColTitle}>Soalan</p>
              {opts.map((pair, idx) => (
                <button key={idx} style={{ ...s.matchBtn, ...s.matchLeft, background: leftSelected === idx ? '#1e3a5f' : matchLines.find(l => l[0] === idx) ? '#2563eb' : '#e2e8f0', color: leftSelected === idx || matchLines.find(l => l[0] === idx) ? '#fff' : '#1e293b' }} onClick={() => handleMatchLeft(idx)} disabled={answered}>
                  {pair.left || pair}
                  {matchLines.find(l => l[0] === idx) && <span style={s.matchConnected}> →{matchLines.find(l => l[0] === idx)[1] + 1}</span>}
                </button>
              ))}
            </div>
            <div style={s.matchArrow}>↔</div>
            <div style={s.matchCol}>
              <p style={s.matchColTitle}>Jawapan</p>
              {opts.map((pair, idx) => {
                const isLinked = matchLines.find(l => l[1] === idx);
                let bg = '#e2e8f0';
                if (answered) {
                  const correctPair = ca.find(p => p[1] === idx);
                  const myPair = matchLines.find(l => l[1] === idx);
                  if (correctPair && myPair && correctPair[0] === myPair[0]) bg = '#16a34a';
                  else if (isLinked) bg = '#e11d48';
                } else if (isLinked) bg = '#7c3aed';
                return (
                  <button key={idx} style={{ ...s.matchBtn, s: s.matchRight, background: bg, color: isLinked || answered ? '#fff' : '#1e293b' }} onClick={() => handleMatchRight(idx)} disabled={answered || leftSelected === null}>
                    {pair.right || pair}
                  </button>
                );
              })}
            </div>
          </div>
          {!answered && (
            <button style={{ ...s.submitBtn, opacity: matchLines.length === 0 ? 0.5 : 1 }} onClick={handleMatchSubmit} disabled={matchLines.length === 0}>
              Hantar Padanan ({matchLines.length}/{opts.length} dipasangkan)
            </button>
          )}
          {answered && (
            <div style={s.matchResult}>
              <p style={{ fontWeight: '700', color: '#1e3a5f', margin: 0 }}>Padanan Betul:</p>
              {ca.map((pair, i) => (
                <p key={i} style={{ color: '#16a34a', margin: '0.25rem 0', fontSize: '0.88rem' }}>
                  {opts[pair[0]]?.left || opts[pair[0]]} ↔ {opts[pair[1]]?.right || opts[pair[1]]}
                </p>
              ))}
            </div>
          )}
        </>
      )}

      {answered && q.question_type !== 'match' && (
        <div style={{ ...s.answerFeedback, background: isCorrect(q, selected[0]) && q.question_type !== 'multi_select' ? '#f0fdf4' : '#fff1f2' }}>
          {q.question_type === 'multi_select'
            ? `Jawapan betul: ${ca.map(i => opts[i] ?? '').join(', ')}`
            : selected.length === 0
              ? `⏱️ Masa tamat! Jawapan betul: ${opts[ca[0]] ?? ''}`
              : isCorrect(q, selected[0])
                ? '✅ Betul!'
                : `❌ Jawapan betul: ${opts[ca[0]] ?? ''}`
          }
        </div>
      )}
    </div>
  );
};

const s = {
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem' },
  spinner: { width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  quizWrap: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  quizHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  qCounter: { fontSize: '0.82rem', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap' },
  timerBarWrap: { flex: 1, height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' },
  timerBarFill: { height: '100%', borderRadius: '5px' },
  timerNum: { fontSize: '1rem', fontWeight: '800', minWidth: '32px', textAlign: 'right' },
  questionBox: { background: '#1e3a5f', borderRadius: '14px', padding: '1.25rem', textAlign: 'center' },
  questionImg: { width: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '8px', marginBottom: '0.75rem' },
  questionText: { color: '#fff', fontSize: '1.05rem', fontWeight: '600', margin: 0, lineHeight: 1.5 },
  multiHint: { color: '#93c5fd', fontSize: '0.78rem', margin: '0.5rem 0 0', fontStyle: 'italic' },
  optGrid: { display: 'grid', gap: '0.6rem' },
  optBtn: { display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.9rem 1rem', borderRadius: '10px', border: '3px solid transparent', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', textAlign: 'left', transition: 'opacity 0.2s, transform 0.1s', minHeight: '56px' },
  optIcon: { fontSize: '1.1rem', flexShrink: 0 },
  optText: { flex: 1, lineHeight: 1.3 },
  optCheck: { fontSize: '1.1rem', flexShrink: 0 },
  submitBtn: { width: '100%', padding: '0.85rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' },
  answerFeedback: { padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', color: '#1e293b', textAlign: 'center' },
  matchWrap: { display: 'flex', gap: '0.5rem', alignItems: 'flex-start' },
  matchCol: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  matchColTitle: { fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textAlign: 'center', margin: '0 0 0.25rem' },
  matchBtn: { padding: '0.65rem 0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem', lineHeight: 1.3, textAlign: 'center', transition: 'background 0.2s' },
  matchLeft: {},
  matchRight: {},
  matchArrow: { fontSize: '1.5rem', color: '#94a3b8', paddingTop: '2rem', flexShrink: 0 },
  matchConnected: { fontSize: '0.72rem', opacity: 0.8 },
  matchResult: { background: '#f0fdf4', borderRadius: '10px', padding: '0.75rem 1rem' },
  resultWrap: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  scoreCard: { background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', borderRadius: '16px', padding: '2rem', textAlign: 'center' },
  scoreTrophy: { fontSize: '3.5rem', marginBottom: '0.5rem' },
  scoreTitle: { color: '#fff', fontSize: '1.3rem', fontWeight: '800', margin: '0 0 0.5rem' },
  scoreBig: { color: '#FFD700', fontSize: '4rem', fontWeight: '900', lineHeight: 1 },
  scorePoints: { color: '#93c5fd', fontSize: '0.9rem', margin: '0 0 1.5rem' },
  scoreStats: { display: 'flex', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' },
  scoreStat: { flex: 1, padding: '0.75rem' },
  scoreStatVal: { fontSize: '1.8rem', fontWeight: '800' },
  scoreStatLabel: { color: '#cbd5e1', fontSize: '0.75rem', marginTop: '0.2rem' },
  scoreDivider: { width: '1px', background: 'rgba(255,255,255,0.2)' },
  lbCard: { background: '#fff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0' },
  lbTitle: { fontSize: '1rem', fontWeight: '800', color: '#1e3a5f', margin: '0 0 1rem' },
  lbList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  lbRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: '10px' },
  lbRowMe: { border: '2px solid #2563eb' },
  lbRank: { width: '32px', textAlign: 'center', fontSize: '1rem', flexShrink: 0 },
  lbName: { flex: 1, fontWeight: '600', fontSize: '0.9rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' },
  youBadge: { background: '#2563eb', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '6px', fontWeight: '700' },
  lbScore: { fontWeight: '800', color: '#2563eb', fontSize: '0.9rem' },
  lbCorrect: { color: '#16a34a', fontSize: '0.82rem', fontWeight: '600' },
  doneBtn: { width: '100%', padding: '0.85rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' },
  failBox: { background: '#fff1f2', borderRadius: '16px', padding: '1.5rem', textAlign: 'center', border: '1px solid #fecdd3' },
  retryBtn: { width: '100%', padding: '0.85rem', background: '#e11d48', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' },
};

export default QuizGame;
