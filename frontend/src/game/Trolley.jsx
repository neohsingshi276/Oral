import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

const DEFAULT_DURATION = 60;
const TROLLEY_SPEED = 2.5;
const TROLLEY_ACCELERATION = 0.18;
const FOOD_FALL_SPEED = 2.5;
const SPAWN_INTERVAL = 1200;

const GOOD_FOODS = [
  { emoji: '🥛', name: 'Milk', points: 10, color: '#FFE5B4' },
  { emoji: '🧀', name: 'Cheese', points: 10, color: '#FFD700' },
  { emoji: '🥕', name: 'Carrot', points: 10, color: '#FF8C42' },
  { emoji: '🥦', name: 'Broccoli', points: 10, color: '#90EE90' },
  { emoji: '🍎', name: 'Apple', points: 10, color: '#FF6B6B' },
  { emoji: '🥬', name: 'Leafy Greens', points: 10, color: '#7FFF7F' },
  { emoji: '🥚', name: 'Egg', points: 10, color: '#FFEFD5' },
  { emoji: '🐟', name: 'Fish', points: 10, color: '#87CEFA' },
  { emoji: '🍌', name: 'Banana', points: 10, color: '#FFE135' },
  { emoji: '🌽', name: 'Corn', points: 10, color: '#F0C040' },
  { emoji: '🥜', name: 'Nuts', points: 10, color: '#D2A679' },
  { emoji: '🍇', name: 'Grapes', points: 10, color: '#9B59B6' },
  { emoji: '💧', name: 'Water', points: 10, color: '#B0E0E6' },
  { emoji: '🍊', name: 'Orange', points: 10, color: '#FFA500' },
];

const BAD_FOODS = [
  { emoji: '🍭', name: 'Lollipop', points: -5, color: '#FF69B4' },
  { emoji: '🍬', name: 'Candy', points: -5, color: '#DDA0DD' },
  { emoji: '🍫', name: 'Chocolate', points: -5, color: '#8B4513' },
  { emoji: '🍩', name: 'Donut', points: -5, color: '#FFB6C1' },
  { emoji: '🧁', name: 'Cupcake', points: -5, color: '#FF99CC' },
  { emoji: '🥤', name: 'Soda', points: -5, color: '#87CEEB' },
  { emoji: '🍪', name: 'Cookie', points: -5, color: '#D2691E' },
  { emoji: '🎂', name: 'Cake', points: -5, color: '#FFB7C5' },
  { emoji: '🍿', name: 'Caramel Popcorn', points: -5, color: '#DAA520' },
  { emoji: '🧃', name: 'Juice Box', points: -5, color: '#FFA07A' },
  { emoji: '🍦', name: 'Ice Cream', points: -5, color: '#FFFDD0' },
  { emoji: '🍡', name: 'Cotton Candy', points: -5, color: '#FFB6D9' },
];

const CP3Game = ({ player, onComplete }) => {
  const [gameState, setGameState] = useState('start');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const [trolleyPos, setTrolleyPos] = useState(50);
  const [fallingItems, setFallingItems] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [finalLeaderboard, setFinalLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showFinalLeaderboard, setShowFinalLeaderboard] = useState(false);
  const [particles, setParticles] = useState([]);
  const [combo, setCombo] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [gameDuration, setGameDuration] = useState(DEFAULT_DURATION);
  const [targetScore, setTargetScore] = useState(0);

  const gameAreaRef = useRef(null);
  const keysPressed = useRef({});
  const animationFrameRef = useRef(null);
  const lastSpawnRef = useRef(0);
  const trolleyVelocity = useRef(0);
  const lastComboTime = useRef(0);
  const scoreRef = useRef(0);
  const trolleyPosRef = useRef(50);

  // Keep scoreRef in sync
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { trolleyPosRef.current = trolleyPos; }, [trolleyPos]);

  // Fetch admin settings on mount
  useEffect(() => {
    if (!player) return;
    api.get(`/cp3/settings/${player.session_id}`)
      .then(res => {
        const s = res.data.settings || {};
        if (s.timer_seconds) setGameDuration(s.timer_seconds);
        if (s.target_score) setTargetScore(s.target_score);
        setTimeLeft(s.timer_seconds || DEFAULT_DURATION);
      })
      .catch(() => {});
  }, [player]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(gameDuration);
    setTrolleyPos(50);
    trolleyPosRef.current = 50;
    setFallingItems([]);
    setParticles([]);
    setCombo(0);
    trolleyVelocity.current = 0;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        keysPressed.current[e.key] = true;
      }
    };
    const handleKeyUp = (e) => {
      keysPressed.current[e.key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const createParticles = useCallback((x, y, isGood) => {
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x, y,
      vx: (Math.random() - 0.5) * 10,
      vy: -Math.random() * 8 - 4,
      color: isGood ? '#4CAF50' : '#FF5252',
      life: 1,
    }));
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;
    let lastTime = performance.now();
    const gameLoop = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 16.67;
      lastTime = currentTime;
      setTrolleyPos(prev => {
        let velocity = trolleyVelocity.current;
        if (keysPressed.current['ArrowLeft']) velocity -= TROLLEY_ACCELERATION * deltaTime;
        else if (keysPressed.current['ArrowRight']) velocity += TROLLEY_ACCELERATION * deltaTime;
        else velocity *= 0.9;
        velocity = Math.max(-TROLLEY_SPEED, Math.min(TROLLEY_SPEED, velocity));
        trolleyVelocity.current = velocity;
        const nextPos = Math.max(5, Math.min(95, prev + velocity * deltaTime));
        trolleyPosRef.current = nextPos;
        return nextPos;
      });
      setFallingItems(prev => {
        const gameAreaHeight = gameAreaRef.current?.clientHeight || 600;
        const trolleyY = gameAreaHeight - 120;
        return prev.map(item => {
          const newY = item.y + FOOD_FALL_SPEED * deltaTime;
          if (newY >= trolleyY && newY <= trolleyY + 40 && !item.caught) {
            const trolleyLeft = trolleyPosRef.current - 10;
            const trolleyRight = trolleyPosRef.current + 10;
            if (item.x >= trolleyLeft && item.x <= trolleyRight) {
              setScore(s => {
                const ns = Math.max(0, s + item.points);
                scoreRef.current = ns;
                return ns;
              });
              createParticles(item.x, trolleyY, item.points > 0);
              const now = Date.now();
              if (item.points > 0 && now - lastComboTime.current < 2000) setCombo(c => c + 1);
              else setCombo(item.points > 0 ? 1 : 0);
              lastComboTime.current = now;
              return { ...item, caught: true };
            }
          }
          return { ...item, y: newY };
        }).filter(item => item.y < gameAreaHeight && !item.caught);
      });
      setParticles(prev =>
        prev.map(p => ({
          ...p,
          x: p.x + p.vx * deltaTime,
          y: p.y + p.vy * deltaTime,
          vy: p.vy + 0.5 * deltaTime,
          life: p.life - 0.02 * deltaTime,
        })).filter(p => p.life > 0)
      );
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [gameState, createParticles]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const spawnItem = () => {
      const now = Date.now();
      if (now - lastSpawnRef.current < SPAWN_INTERVAL) return;
      lastSpawnRef.current = now;
      const allFoods = [...GOOD_FOODS, ...BAD_FOODS];
      const food = allFoods[Math.floor(Math.random() * allFoods.length)];
      setFallingItems(prev => [...prev, {
        id: now + Math.random(),
        emoji: food.emoji, name: food.name, points: food.points, color: food.color,
        x: Math.random() * 80 + 10, y: -50, caught: false,
        rotation: Math.random() * 360, rotationSpeed: (Math.random() - 0.5) * 4,
      }]);
    };
    const interval = setInterval(spawnItem, 100);
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          const fs = scoreRef.current;
          setFinalScore(fs);
          setGameState('finished');
          handleGameEnd(fs);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  const handleGameEnd = async (fs) => {
    if (!player) return;
    try {
      await api.post('/cp3/score', { player_id: player.id, session_id: player.session_id, score: fs });
      const lb = await api.get(`/cp3/leaderboard/${player.session_id}`);
      setLeaderboard(lb.data.leaderboard || []);
      setShowLeaderboard(true);
    } catch (err) { console.error(err); setShowLeaderboard(true); }
  };

  const handleShowFinal = async () => {
    setShowLeaderboard(false);
    try {
      const res = await api.get(`/cp3/final/${player.session_id}`);
      setFinalLeaderboard(res.data.leaderboard || []);
    } catch (err) { console.error(err); }
    setShowFinalLeaderboard(true);
  };

  // START SCREEN
  if (gameState === 'start') return (
    <div style={s.fullPage}>
      <style>{animStyles}</style>
      <div style={s.startCard}>
        <h1 style={s.title}>🛒 Food Catcher!</h1>
        <div style={s.badge}>Checkpoint 3</div>
        <div style={s.instrGrid}>
          <div style={s.instrCard}>⌨️<br /><strong>Arrow Keys</strong><br />to move</div>
          <div style={s.instrCard}>⏱️<br /><strong>{gameDuration} seconds</strong><br />of fun!</div>
        </div>
        <div style={s.foodCols}>
          <div style={s.goodCol}>
            <div style={s.colTitle}>✅ Catch These! (+10)</div>
            <div style={s.foodRow}>{GOOD_FOODS.map((f, i) => <div key={i} style={s.foodChip}>{f.emoji}</div>)}</div>
          </div>
          <div style={s.badCol}>
            <div style={s.colTitle}>❌ Avoid These! (-5)</div>
            <div style={s.foodRow}>{BAD_FOODS.map((f, i) => <div key={i} style={s.foodChip}>{f.emoji}</div>)}</div>
          </div>
        </div>
        <button style={s.startBtn} onClick={startGame}>🎮 START GAME!</button>
      </div>
    </div>
  );

  // FINAL LEADERBOARD
  if (showFinalLeaderboard) return (
    <div style={s.fullPage}>
      <style>{animStyles}</style>
      <div style={s.lbCard}>
        <div style={{ fontSize: '4rem', textAlign: 'center' }}>🏆</div>
        <h2 style={s.lbTitle}>Papan Markah Akhir!</h2>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '0.5rem', fontSize: '0.88rem' }}>CP1 Quiz + CP2 Crossword + CP3 Food Game (masing-masing 33.33%)</p>
        <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.78rem', color: '#475569', textAlign: 'center' }}>
          Formula: (Skor CP / Skor Max) × 33.33 = Markah (Jumlah /100)
        </div>
        <div style={s.lbList}>
          {finalLeaderboard.map((entry, i) => (
            <div key={entry.player_id} style={{ ...s.lbRow, ...(entry.player_id === player?.id ? s.lbRowMe : {}), background: i === 0 ? '#fef9ee' : i === 1 ? '#f8fafc' : i === 2 ? '#fff7ed' : '#fff' }}>
              <div style={s.lbRank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', color: '#1e3a5f', marginBottom: '0.25rem' }}>{entry.nickname}{entry.player_id === player?.id && <span style={s.youBadge}>Anda</span>}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '0.75rem' }}>
                  <span>CP1: {entry.cp1_mark}/33</span>
                  <span>CP2: {entry.cp2_mark}/33</span>
                  <span>CP3: {entry.cp3_mark}/33</span>
                </div>
              </div>
              <div style={{ ...s.lbScore, fontSize: '1.2rem' }}>{entry.total_mark}<span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>/100</span></div>
            </div>
          ))}
        </div>
        {(targetScore === 0 || finalScore >= targetScore) ? (
          <button style={s.doneBtn} onClick={onComplete}>🎉 Tamat DentalQuest!</button>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: '#fff1f2', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid #fecdd3' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>😢</div>
              <p style={{ color: '#e11d48', fontWeight: '700', margin: '0 0 0.25rem' }}>Belum Lulus!</p>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
                Skor kamu <strong>{finalScore}</strong> — perlu sekurang-kurangnya <strong>{targetScore}</strong> mata.
              </p>
            </div>
            <button style={{ ...s.doneBtn, background: 'linear-gradient(135deg,#e11d48,#be123c)' }} onClick={() => { setGameState('start'); setShowFinalLeaderboard(false); setShowLeaderboard(false); }}>
              🔄 Cuba Semula
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // CP3 LEADERBOARD
  if (showLeaderboard) return (
    <div style={s.fullPage}>
      <style>{animStyles}</style>
      <div style={s.lbCard}>
        <div style={{ fontSize: '4rem', textAlign: 'center' }}>🎯</div>
        <h2 style={s.lbTitle}>Food Catcher Stars!</h2>
        <div style={s.yourScore}>
          <div style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Skor Kamu</div>
          <div style={{ color: '#FFD700', fontSize: '3.5rem', fontWeight: '900' }}>{finalScore}</div>
        </div>
        <div style={s.lbList}>
          {leaderboard.map((entry, i) => (
            <div key={entry.player_id} style={{ ...s.lbRow, ...(entry.player_id === player?.id ? s.lbRowMe : {}) }}>
              <div style={s.lbRank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</div>
              <div style={{ flex: 1, fontWeight: '600', color: '#1e3a5f' }}>{entry.nickname}{entry.player_id === player?.id && <span style={s.youBadge}>Anda</span>}</div>
              <div style={s.lbScore}>{entry.score} pts</div>
            </div>
          ))}
          {leaderboard.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>Tiada markah lagi</p>}
        </div>
        <button style={s.nextBtn} onClick={handleShowFinal}>Lihat Papan Markah Akhir 🏆</button>
      </div>
    </div>
  );

  // GAME SCREEN
  return (
    <div style={s.fullPage}>
      <style>{animStyles}</style>
      <div style={s.gameWrap}>
        <div style={s.gameHeader}>
          <div style={s.scorePanel}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.72rem', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</span>
              <span style={s.scoreVal}>{score}</span>
            </div>
            {combo > 1 && <span style={s.combo}>🔥 {combo}x!</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '0.35rem 0.75rem', borderRadius: '10px', border: '2px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.72rem', color: '#888', fontWeight: '600' }}>✅</span>
            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#16a34a' }}>{GOOD_FOODS.map(f => f.emoji).slice(0, 4).join('')} +10</span>
            <span style={{ fontSize: '0.72rem', color: '#888', margin: '0 0.25rem' }}>|</span>
            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#e11d48' }}>{BAD_FOODS.map(f => f.emoji).slice(0, 4).join('')} -5</span>
          </div>
          <div style={s.timerPanel}>
            <span style={{ ...s.timerVal, color: timeLeft <= 10 ? '#e11d48' : '#4ECDC4' }}>{timeLeft}</span>
            <span style={{ fontSize: '0.75rem', color: '#666' }}>saat</span>
          </div>
        </div>

        <div ref={gameAreaRef} style={s.gameArea}>
          <div style={s.shelf} />
          <div style={s.shelf2} />
          {particles.map(p => (
            <div key={p.id} style={{ ...s.particle, left: `${p.x}%`, top: `${p.y}px`, backgroundColor: p.color, opacity: p.life }} />
          ))}
          {fallingItems.map(item => (
            <div key={item.id} style={{ ...s.fallingItem, left: `${item.x}%`, top: `${item.y}px` }}>
              <div style={{ ...s.foodBubble, background: item.color + '40' }}>
                <span style={{ fontSize: '2.5rem' }}>{item.emoji}</span>
              </div>
            </div>
          ))}
          <div style={{ ...s.trolley, left: `${trolleyPos}%` }}>
            <span style={{ fontSize: '5rem' }}>🛒</span>
          </div>
        </div>

        <div style={s.controlsHint}>
          <span style={s.keyBtn}>←</span>
          <span style={s.keyBtn}>→</span>
          <span style={{ fontSize: '0.88rem', fontWeight: '600', color: '#475569' }}>Gerakkan troli!</span>
        </div>
      </div>
    </div>
  );
};

const animStyles = `
  @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
  @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
  @keyframes float { 0%,100%{transform:translateX(0)} 50%{transform:translateX(40px)} }
`;

const s = {
  fullPage: { position: 'fixed', inset: 0, background: 'linear-gradient(180deg, #87CEEB 0%, #E0F6FF 100%)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '0.5rem', overflowY: 'auto' },
  startCard: { background: '#fff', borderRadius: '24px', padding: '2rem', maxWidth: '700px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', textAlign: 'center' },
  title: { fontSize: '2.5rem', fontWeight: '900', color: '#FF6B35', margin: '0 0 0.5rem', textShadow: '3px 3px 0 #FFE66D' },
  badge: { display: 'inline-block', background: 'linear-gradient(135deg,#FF6B35,#F7931E)', color: '#fff', padding: '0.4rem 1.5rem', borderRadius: '50px', fontSize: '0.9rem', fontWeight: '700', marginBottom: '1.5rem' },
  instrGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' },
  instrCard: { background: '#fff9e6', border: '3px solid #FFD93D', borderRadius: '16px', padding: '1rem', fontSize: '0.9rem', lineHeight: 1.6 },
  foodCols: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', textAlign: 'left' },
  goodCol: { background: '#f0fdf4', borderRadius: '12px', padding: '1rem', border: '2px solid #86efac' },
  badCol: { background: '#fff1f2', borderRadius: '12px', padding: '1rem', border: '2px solid #fca5a5' },
  colTitle: { fontWeight: '700', fontSize: '0.85rem', marginBottom: '0.75rem', color: '#1e293b' },
  foodRow: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' },
  foodChip: { fontSize: '1.8rem' },
  startBtn: { width: '100%', padding: '1rem', fontSize: '1.3rem', fontWeight: '900', background: 'linear-gradient(135deg,#FF6B35,#F7931E)', color: '#fff', border: 'none', borderRadius: '16px', cursor: 'pointer', boxShadow: '0 8px 25px rgba(255,107,53,0.4)' },
  gameWrap: { width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', height: '100%', padding: '0 0.5rem' },
  gameHeader: { display: 'flex', gap: '0.75rem', marginBottom: '0.5rem', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' },
  scorePanel: { background: '#fff', padding: '0.5rem 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '3px solid #FFD93D', minWidth: 0 },
  scoreVal: { fontSize: '2.2rem', fontWeight: '900', color: '#FF6B35', lineHeight: 1 },
  combo: { fontSize: '0.9rem', fontWeight: '800', color: '#FF6B35', animation: 'pulse 0.5s infinite' },
  timerPanel: { background: '#fff', padding: '0.5rem 1rem', borderRadius: '12px', textAlign: 'center', border: '3px solid #4ECDC4', minWidth: '80px', flexShrink: 0 },
  timerVal: { fontSize: '2rem', fontWeight: '900', display: 'block', lineHeight: 1 },
  gameArea: { position: 'relative', flex: 1, minHeight: '300px', background: 'linear-gradient(180deg,#FFF9E6 0%,#FFE66D 100%)', borderRadius: '20px', overflow: 'hidden', border: '4px solid #fff', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' },
  shelf: { position: 'absolute', top: '25%', left: 0, right: 0, height: '10px', background: '#8B6F47', opacity: 0.3 },
  shelf2: { position: 'absolute', top: '55%', left: 0, right: 0, height: '10px', background: '#8B6F47', opacity: 0.3 },
  particle: { position: 'absolute', width: '8px', height: '8px', borderRadius: '50%', pointerEvents: 'none' },
  fallingItem: { position: 'absolute', transform: 'translateX(-50%)', pointerEvents: 'none' },
  foodBubble: { width: '60px', height: '60px', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  trolley: { position: 'absolute', bottom: '20px', transform: 'translateX(-50%)', willChange: 'transform' },
  controlsHint: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginTop: '0.75rem', background: '#fff', padding: '0.75rem 2rem', borderRadius: '50px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '2px solid #FFE66D' },
  keyBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'linear-gradient(135deg,#4ECDC4,#44A08D)', color: '#fff', borderRadius: '8px', fontWeight: '800', fontSize: '1rem' },
  lbCard: { background: '#fff', borderRadius: '24px', padding: '2rem', maxWidth: '600px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' },
  lbTitle: { fontSize: '1.8rem', fontWeight: '900', textAlign: 'center', color: '#FF6B35', margin: '0.5rem 0 1rem', textShadow: '2px 2px 0 #FFE66D' },
  yourScore: { background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', borderRadius: '16px', padding: '1.25rem', textAlign: 'center', marginBottom: '1.5rem' },
  lbList: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' },
  lbRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #f1f5f9' },
  lbRowMe: { border: '2px solid #2563eb', background: '#eff6ff' },
  lbRank: { width: '36px', textAlign: 'center', fontSize: '1.1rem', flexShrink: 0 },
  lbScore: { fontWeight: '800', color: '#2563eb', fontSize: '1rem' },
  youBadge: { background: '#2563eb', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '6px', fontWeight: '700', marginLeft: '0.4rem' },
  nextBtn: { width: '100%', padding: '0.85rem', background: 'linear-gradient(135deg,#4ECDC4,#44A08D)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' },
  doneBtn: { width: '100%', padding: '0.85rem', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' },
};

export default CP3Game;
