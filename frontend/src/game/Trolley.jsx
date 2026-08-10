import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

// ─── Web Audio Sound System ────────────────────────────────────────────────────
// All sounds are synthesized via the Web Audio API — no audio files required.
let audioCtx = null;
let bgMusicInterval = null;
let bgGainNode = null;

const getAudioCtx = () => {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

// 🎵 Cheerful ascending chime — plays when catching GOOD food
const playGoodFoodSound = (muted) => {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    // C5 → E5 → G5 major arpeggio — bright & rewarding
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      osc.start(start);
      osc.stop(start + 0.35);
    });
  } catch { /* AudioContext blocked */ }
};

// 🔴 Descending buzzy tone — plays when catching BAD food
const playBadFoodSound = (muted) => {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    // Two descending tones with 'sawtooth' for a buzzy, warning feel
    const notes = [440, 330];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  } catch { /* AudioContext blocked */ }
};

// 🎶 Background music — a fun looping melody using Web Audio synthesis
const startBgMusic = (muted) => {
  stopBgMusic(); // ensure no double-play
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    bgGainNode = ctx.createGain();
    bgGainNode.gain.value = 0.08;
    bgGainNode.connect(ctx.destination);

    // Simple fun melody: pentatonic notes in C major
    const melody = [
      523.25, 587.33, 659.25, 783.99, 880.00,  // C5 D5 E5 G5 A5
      783.99, 659.25, 587.33, 523.25, 659.25,  // G5 E5 D5 C5 E5
      783.99, 880.00, 783.99, 659.25, 523.25,  // G5 A5 G5 E5 C5
      587.33, 659.25, 523.25, 440.00, 523.25,  // D5 E5 C5 A4 C5
    ];
    let noteIndex = 0;
    const noteDuration = 0.22;
    const noteGap = 0.25;

    const playNote = () => {
      if (!bgGainNode) return;
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.connect(noteGain);
      noteGain.connect(bgGainNode);
      osc.type = 'triangle';
      osc.frequency.value = melody[noteIndex % melody.length];
      const now = ctx.currentTime;
      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(0.5, now + 0.03);
      noteGain.gain.setValueAtTime(0.5, now + noteDuration - 0.05);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + noteDuration);
      osc.start(now);
      osc.stop(now + noteDuration + 0.05);
      noteIndex++;
    };

    playNote(); // first note immediately
    bgMusicInterval = setInterval(playNote, noteGap * 1000);
  } catch { /* AudioContext blocked */ }
};

const stopBgMusic = () => {
  if (bgMusicInterval) {
    clearInterval(bgMusicInterval);
    bgMusicInterval = null;
  }
  if (bgGainNode) {
    try { bgGainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3); } catch { /* */ }
    bgGainNode = null;
  }
};

const DEFAULT_DURATION = 60;
const TROLLEY_SPEED = 1.1;
const TROLLEY_ACCELERATION = 0.22;
const FOOD_FALL_SPEED = 2.5;
const SPAWN_INTERVAL = 600;

const GOOD_FOODS = [
  { image: '/assets/foods/good/peanut.png', nameBm: 'Kacang Tanah', nameBi: 'Peanut', points: 100, color: '#D2A679' },
  { image: '/assets/foods/good/egg.png', nameBm: 'Telur', nameBi: 'Egg', points: 100, color: '#FFEFD5' },
  { image: '/assets/foods/good/cheese.png', nameBm: 'Keju', nameBi: 'Cheese', points: 100, color: '#FFD700' },
  { image: '/assets/foods/good/milk.png', nameBm: 'Susu', nameBi: 'Milk', points: 100, color: '#FFE5B4' },
  { image: '/assets/foods/good/lettuce.png', nameBm: 'Selada', nameBi: 'Lettuce', points: 100, color: '#7FFF7F' },
  { image: '/assets/foods/good/broccoli.png', nameBm: 'Brokoli', nameBi: 'Broccoli', points: 100, color: '#90EE90' },
  { image: '/assets/foods/good/cucumber.png', nameBm: 'Timun', nameBi: 'Cucumber', points: 100, color: '#8FBC8F' },
  { image: '/assets/foods/good/carrot.png', nameBm: 'Lobak Merah', nameBi: 'Carrot', points: 100, color: '#FF8C42' },
  { image: '/assets/foods/good/tomato.png', nameBm: 'Tomato', nameBi: 'Tomato', points: 100, color: '#FF6B6B' },
  { image: '/assets/foods/good/avocado.png', nameBm: 'Avokado', nameBi: 'Avocado', points: 100, color: '#A3D977' },
  { image: '/assets/foods/good/fish.png', nameBm: 'Ikan', nameBi: 'Fish', points: 100, color: '#87CEFA' },
  { image: '/assets/foods/good/chicken-drumstick.png', nameBm: 'Ayam', nameBi: 'Chicken', points: 100, color: '#F4A460' },
  { image: '/assets/foods/good/shrimp.png', nameBm: 'Udang', nameBi: 'Shrimp', points: 100, color: '#FA8072' },
  { image: '/assets/foods/good/squid.png', nameBm: 'Sotong', nameBi: 'Squid', points: 100, color: '#D8BFD8' },
  { image: '/assets/foods/good/mushroom.png', nameBm: 'Cendawan', nameBi: 'Mushroom', points: 100, color: '#F5DEB3' },
  { image: '/assets/foods/good/water.png', nameBm: 'Air', nameBi: 'Water', points: 100, color: '#B0E0E6' },
  { image: '/assets/foods/good/apple.png', nameBm: 'Epal', nameBi: 'Apple', points: 100, color: '#FF6B6B' },
  { image: '/assets/foods/good/pear.png', nameBm: 'Buah Pir', nameBi: 'Pear', points: 100, color: '#E6D85C' },
  { image: '/assets/foods/good/watermelon.png', nameBm: 'Tembikai', nameBi: 'Watermelon', points: 100, color: '#FF7F7F' },
  { image: '/assets/foods/good/crab.png', nameBm: 'Ketam', nameBi: 'Crab', points: 100, color: '#FF7043' },
];

const BAD_FOODS = [
  { image: '/assets/foods/bad/donut.png', nameBm: 'Donat', nameBi: 'Donut', points: -70, color: '#FFB6C1' },
  { image: '/assets/foods/bad/cookie.png', nameBm: 'Biskut Coklat', nameBi: 'Chocolate Chip Cookie', points: -70, color: '#D2691E' },
  { image: '/assets/foods/bad/chocolate.png', nameBm: 'Coklat', nameBi: 'Chocolate', points: -70, color: '#8B4513' },
  { image: '/assets/foods/bad/mango-sticky-rice.png', nameBm: 'Pulut Mangga', nameBi: 'Mango Sticky Rice', points: -70, color: '#FFD166' },
  { image: '/assets/foods/bad/bubble-tea.png', nameBm: 'Teh Boba', nameBi: 'Bubble Tea', points: -70, color: '#D2A679' },
  { image: '/assets/foods/bad/cupcake.png', nameBm: 'Kek Cawan', nameBi: 'Cupcake', points: -70, color: '#FF99CC' },
  { image: '/assets/foods/bad/ice-cream.png', nameBm: 'Aiskrim', nameBi: 'Ice Cream', points: -70, color: '#FFFDD0' },
  { image: '/assets/foods/bad/cereal.png', nameBm: 'Bijirin Bergula', nameBi: 'Sugary Cereal', points: -70, color: '#FFA07A' },
  { image: '/assets/foods/bad/oreo.png', nameBm: 'Biskut Krim Coklat', nameBi: 'Chocolate Cream Cookie', points: -70, color: '#5C4033' },
  { image: '/assets/foods/bad/lollipop.png', nameBm: 'Lolipop', nameBi: 'Lollipop', points: -70, color: '#FF69B4' },
  { image: '/assets/foods/bad/soft-drink.png', nameBm: 'Minuman Ringan', nameBi: 'Soft Drink', points: -70, color: '#87CEEB' },
  { image: '/assets/foods/bad/chocolate-cake.png', nameBm: 'Kek Coklat', nameBi: 'Chocolate Cake', points: -70, color: '#8B4513' },
  { image: '/assets/foods/bad/orange-juice.png', nameBm: 'Jus Kotak', nameBi: 'Boxed Juice', points: -70, color: '#FFA500' },
  { image: '/assets/foods/bad/hard-candy.png', nameBm: 'Gula-gula', nameBi: 'Candy', points: -70, color: '#DDA0DD' },
  { image: '/assets/foods/bad/chocolate-wafer.png', nameBm: 'Wafer Coklat', nameBi: 'Chocolate Wafer', points: -70, color: '#8B4513' },
  { image: '/assets/foods/bad/cinnamon-roll.png', nameBm: 'Roti Gulung Manis', nameBi: 'Cinnamon Roll', points: -70, color: '#D2A679' },
  { image: '/assets/foods/bad/honey.png', nameBm: 'Madu', nameBi: 'Honey', points: -70, color: '#DAA520' },
  { image: '/assets/foods/bad/potato-chips.png', nameBm: 'Kerepek Kentang', nameBi: 'Potato Chips', points: -70, color: '#F4C542' },
  { image: '/assets/foods/bad/seri-muka.png', nameBm: 'Kuih Seri Muka', nameBi: 'Seri Muka', points: -70, color: '#90C987' },
  { image: '/assets/foods/bad/tanghulu.png', nameBm: 'Buah Bersalut Gula', nameBi: 'Candied Fruit Skewer', points: -70, color: '#FF6B6B' },
];

const CP3Game = ({ player, onComplete, onBack, initialShowFinal = false }) => {
  const { t, language } = useLanguage();
  const getFoodName = (food) => language === 'bi' ? food.nameBi : food.nameBm;
  const [gameState, setGameState] = useState('start');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const [trolleyPos, setTrolleyPos] = useState(50);
  const [fallingItems, setFallingItems] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [finalLeaderboard, setFinalLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showFinalLeaderboard, setShowFinalLeaderboard] = useState(initialShowFinal);
  const [particles, setParticles] = useState([]);
  const [combo, setCombo] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [gameDuration, setGameDuration] = useState(DEFAULT_DURATION);
  const [targetScore, setTargetScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);

  const gameAreaRef = useRef(null);
  const keysPressed = useRef({});
  const animationFrameRef = useRef(null);
  const lastSpawnRef = useRef(0);
  const trolleyVelocity = useRef(0);
  const lastComboTime = useRef(0);
  const scoreRef = useRef(0);
  const trolleyPosRef = useRef(50);

  // Keep refs in sync
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { trolleyPosRef.current = trolleyPos; }, [trolleyPos]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

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
      .catch(() => { });
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
    startBgMusic(isMutedRef.current);
  };

  // Stop music when game ends or component unmounts
  useEffect(() => {
    if (gameState !== 'playing') stopBgMusic();
    return () => stopBgMusic();
  }, [gameState]);

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
    const newParticles = Array.from({ length: 4 }, (_, i) => ({
      id: Date.now() + i + Math.random(),
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 6 - 3,
      color: isGood ? '#4CAF50' : '#FF5252',
      life: 1,
    }));
    setParticles(prev => [...prev.slice(-8), ...newParticles]);
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;
    let lastTime = performance.now();
    const gameLoop = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 16.67;
      lastTime = currentTime;
      setTrolleyPos(prev => {
        let velocity = trolleyVelocity.current;
        if (keysPressed.current['ArrowLeft'] || keysPressed.current['a'] || keysPressed.current['A']) {
          velocity -= TROLLEY_ACCELERATION * deltaTime;
        } else if (keysPressed.current['ArrowRight'] || keysPressed.current['d'] || keysPressed.current['D']) {
          velocity += TROLLEY_ACCELERATION * deltaTime;
        } else {
          velocity *= 0.85;
        }
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
          if (newY >= trolleyY && newY <= trolleyY + 30 && !item.caught) {
            const trolleyLeft = trolleyPosRef.current - 5;
            const trolleyRight = trolleyPosRef.current + 5;
            if (item.x >= trolleyLeft && item.x <= trolleyRight) {
              setScore(s => {
                const ns = Math.max(0, s + item.points);
                scoreRef.current = ns;
                return ns;
              });
              // Play sound based on food type
              if (item.points > 0) playGoodFoodSound(isMutedRef.current);
              else playBadFoodSound(isMutedRef.current);
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
      setParticles(prev => {
        if (prev.length === 0) return prev;
        return prev.map(p => ({
          ...p,
          x: p.x + p.vx * deltaTime,
          y: p.y + p.vy * deltaTime,
          vy: p.vy + 0.5 * deltaTime,
          life: p.life - 0.04 * deltaTime,
        })).filter(p => p.life > 0);
      });
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
        image: food.image, nameBm: food.nameBm, nameBi: food.nameBi, points: food.points, color: food.color,
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

  useEffect(() => {
    if (initialShowFinal && player?.session_id) {
      handleShowFinal();
    }
  }, [initialShowFinal, player?.session_id]);

  // FINAL LEADERBOARD
  if (showFinalLeaderboard) return (
    <div style={s.fullPage}>
      <style>{animStyles}</style>
      <div style={{ ...s.lbCard, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ fontSize: '4rem', textAlign: 'center' }}>🏆</div>
        <h2 style={{ ...s.lbTitle, fontSize: '1.8rem', marginBottom: '0.4rem' }}>
          {language === 'bi' ? 'Overall Leaderboard' : 'Papan Kedudukan Keseluruhan'}
        </h2>
        <p style={{ textAlign: 'center', color: '#475569', marginBottom: '1.25rem', fontSize: '0.9rem', fontWeight: '700' }}>
          {language === 'bi'
            ? 'Dental Quiz + Crossword Puzzle + Food Catcher Game Score'
            : 'Skor Kuiz Pergigian + Teka Silang Kata + Permainan Tangkap Makanan'}
        </p>

        <div style={s.lbList}>
          {finalLeaderboard.map((entry, i) => (
            <div key={entry.player_id} style={{ ...s.lbRow, ...(entry.player_id === player?.id ? s.lbRowMe : {}), background: i === 0 ? '#fef9ee' : i === 1 ? '#f8fafc' : i === 2 ? '#fff7ed' : '#fff' }}>
              <div style={s.lbRank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', color: '#1e3a5f', marginBottom: '0.25rem' }}>{entry.nickname}{entry.player_id === player?.id && <span style={s.youBadge}>{t('game.you')}</span>}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '0.75rem' }}>
                  <span>CP1: {Math.round(entry.cp1_mark / 33 * 100)}/100</span>
                  <span>CP2: {Math.round(entry.cp2_mark / 33 * 100)}/100</span>
                  <span>CP3: {Math.round(entry.cp3_mark / 33 * 100)}/100</span>
                </div>
              </div>
              <div style={{ ...s.lbScore, fontSize: '1.2rem' }}>{entry.total_mark}<span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>/100</span></div>
            </div>
          ))}
        </div>

        {/* Text before buttons */}
        <p style={{ textAlign: 'center', color: '#d97706', fontWeight: 800, fontSize: '0.95rem', margin: '1.25rem 0 0.85rem' }}>
          ✨ {language === 'bi' ? 'Follow the gold arrows to the Finish Point!' : 'Jom ikut anak panah emas ke Penamat!'}
        </p>

        {/* Buttons */}
        <div style={{ marginTop: '0.5rem' }}>
          <button
            style={{ ...s.startBtn, width: '100%', background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 8px 25px rgba(22,163,74,0.4)', fontSize: '1.05rem', fontWeight: '900', padding: '0.9rem' }}
            onClick={() => {
              if (onComplete) onComplete();
            }}
          >
            🚀 {language === 'bi' ? 'Continue Adventure!' : 'Teruskan Pengembaraan!'}
          </button>
        </div>
      </div>
    </div>
  );

  // START SCREEN
  if (gameState === 'start') return (
    <div style={s.fullPage}>
      <style>{animStyles}</style>
      <div style={{ ...s.startCard, maxWidth: '780px', maxHeight: '92vh', overflowY: 'auto', padding: '1.5rem 2rem' }}>
        
        {/* Title & Badge */}
        <h1 style={{ ...s.title, fontSize: '2.2rem', marginBottom: '0.4rem' }}>
          🛒 {language === 'bi' ? 'Food Catcher Game' : 'Permainan Tangkap Makanan'}
        </h1>
        <div style={{ ...s.badge, marginBottom: '1rem' }}>Checkpoint 3</div>

        {/* Instructions Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
          <div style={s.instrCard}>
            ⌨️<br />
            <strong>{language === 'bi' ? 'Arrow Keys' : 'Anak Panah'}</strong><br />
            <span style={{ fontSize: '0.85rem', color: '#475569' }}>
              {language === 'bi' ? '⬅️ and ➡️ arrow keys to move the trolley' : '⬅️ dan ➡️ untuk gerakkan troli'}
            </span>
          </div>
          <div style={s.instrCard}>
            ⏱️<br />
            <strong>{gameDuration} {language === 'bi' ? 'seconds' : 'saat'}</strong><br />
            <span style={{ fontSize: '0.85rem', color: '#475569' }}>
              {language === 'bi' ? 'of fun!' : 'masa bermain!'}
            </span>
          </div>
        </div>

        {/* 2-Column Food Grid Cards: Good vs Bad */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.25rem', textAlign: 'left' }}>
          
          {/* GOOD FOODS — Non-Cariogenic */}
          <div style={{ background: '#f0fdf4', borderRadius: '18px', padding: '1.1rem 1.25rem', border: '2px solid #86efac', boxShadow: '0 4px 12px rgba(22,163,74,0.06)' }}>
            <div style={{ fontWeight: '900', fontSize: '0.92rem', color: '#15803d', marginBottom: '0.15rem' }}>
              ✅ {language === 'bi' ? 'Catch NON-CARIOGENIC food (+100)' : 'Tangkap makanan BUKAN KARIOGENIK (+100)'}
            </div>
            <div style={{ fontSize: '0.78rem', fontStyle: 'italic', fontWeight: 600, color: '#166534', marginBottom: '0.65rem' }}>
              {language === 'bi' ? '(do not cause dental caries)' : '(tidak menyebabkan karies gigi)'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.65rem 0.4rem', justifyContent: 'items-center', alignContent: 'start' }}>
              {GOOD_FOODS.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', padding: '0.2rem' }}>
                  <img src={f.image} alt={getFoodName(f)} title={getFoodName(f)} style={{ width: '34px', height: '34px', objectFit: 'contain', background: 'transparent' }} />
                </div>
              ))}
            </div>
          </div>

          {/* BAD FOODS — Cariogenic */}
          <div style={{ background: '#fff1f2', borderRadius: '18px', padding: '1.1rem 1.25rem', border: '2px solid #fca5a5', boxShadow: '0 4px 12px rgba(225,29,72,0.06)' }}>
            <div style={{ fontWeight: '900', fontSize: '0.92rem', color: '#be123c', marginBottom: '0.15rem' }}>
              ❌ {language === 'bi' ? 'Avoid CARIOGENIC food (-70)' : 'Elakkan makanan KARIOGENIK (-70)'}
            </div>
            <div style={{ fontSize: '0.78rem', fontStyle: 'italic', fontWeight: 600, color: '#9f1239', marginBottom: '0.65rem' }}>
              {language === 'bi' ? '(cause dental caries)' : '(menyebabkan karies gigi)'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.65rem 0.4rem', justifyContent: 'items-center', alignContent: 'start' }}>
              {BAD_FOODS.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', padding: '0.2rem' }}>
                  <img src={f.image} alt={getFoodName(f)} title={getFoodName(f)} style={{ width: '34px', height: '34px', objectFit: 'contain', background: 'transparent' }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Passing criteria banner */}
        <div style={{ background: '#fff7ed', border: '2px dashed #f97316', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.25rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.92rem', fontWeight: '900', color: '#c2410c' }}>
            🎯 {language === 'bi'
              ? `You must score at least ${targetScore || 1000} points to pass!`
              : `Anda mesti mendapat sekurang-kurangnya ${targetScore || 1000} mata untuk lulus!`}
          </span>
        </div>

        {/* Action Buttons: Kembali & Mula Permainan */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <button
            style={{ ...s.startBtn, background: '#64748b', boxShadow: '0 4px 15px rgba(100,116,139,0.3)', fontSize: '1.15rem', fontWeight: '900', padding: '0.9rem' }}
            onClick={() => onBack ? onBack() : window.history.back()}
          >
            ← {language === 'bi' ? 'Back' : 'Kembali'}
          </button>
          <button
            style={{ ...s.startBtn, fontSize: '1.15rem', fontWeight: '900', padding: '0.9rem' }}
            onClick={startGame}
          >
            🎮 {language === 'bi' ? 'START GAME!' : 'MULA PERMAINAN!'}
          </button>
        </div>

      </div>
    </div>
  );

  // CP3 LEADERBOARD (FOOD CATCHER GAME LEADERBOARD)
  if (showLeaderboard) {
    const minPassScore = targetScore || 1000;
    const hasPassed = finalScore >= minPassScore;
    return (
      <div style={s.fullPage}>
        <style>{animStyles}</style>
        <div style={{ ...s.lbCard, maxHeight: '92vh', overflowY: 'auto' }}>
          <div style={{ fontSize: '3.5rem', textAlign: 'center', marginBottom: '0.2rem' }}>🎯</div>
          <h2 style={{ ...s.lbTitle, fontSize: '2rem', marginBottom: '0.75rem' }}>
            {language === 'bi' ? 'Food Catcher Game' : 'Permainan Tangkap Makanan'}
          </h2>
          
          {/* Your Score Section */}
          <div style={s.yourScore}>
            <div style={{ color: '#fff', fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.3rem', textTransform: 'none' }}>
              {language === 'bi' ? 'Your Score' : 'Skor Anda'}
            </div>
            <div style={{ color: '#FFD700', fontSize: '3.6rem', fontWeight: '900', lineHeight: 1 }}>{finalScore}</div>
          </div>

          {/* Leaderboard Table */}
          <div style={s.lbList}>
            {leaderboard.map((entry, i) => (
              <div key={entry.player_id} style={{ ...s.lbRow, ...(entry.player_id === player?.id ? s.lbRowMe : {}) }}>
                <div style={s.lbRank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</div>
                <div style={{ flex: 1, fontWeight: '600', color: '#1e3a5f' }}>{entry.nickname}{entry.player_id === player?.id && <span style={s.youBadge}>{t('game.you')}</span>}</div>
                <div style={s.lbScore}>{entry.score} {t('game.points')}</div>
              </div>
            ))}
            {leaderboard.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>{t('game.noScoresYet')}</p>}
          </div>

          {/* Pass / Fail Section at bottom of Food Catcher Leaderboard */}
          {!hasPassed ? (
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <div style={{ background: '#fff1f2', borderRadius: '16px', padding: '1.25rem', marginBottom: '1rem', border: '2px solid #fecdd3' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>😭</div>
                <h3 style={{ color: '#be123c', fontSize: '1.25rem', fontWeight: '900', margin: '0 0 0.4rem' }}>
                  {language === 'bi' ? 'Try Again!' : 'Cuba Semula!'}
                </h3>
                <p style={{ color: '#9f1239', fontSize: '0.92rem', fontWeight: '700', margin: 0 }}>
                  {language === 'bi'
                    ? `Your score: ${finalScore} - need at least ${minPassScore} points to pass.`
                    : `Skor anda: ${finalScore} - perlu sekurang-kurangnya ${minPassScore} mata untuk lulus.`}
                </p>
              </div>
              <button
                style={{ ...s.startBtn, background: 'linear-gradient(135deg,#e11d48,#be123c)', boxShadow: '0 8px 25px rgba(225,29,72,0.4)', fontSize: '1.15rem', fontWeight: '900', padding: '0.95rem' }}
                onClick={() => { setGameState('start'); setShowLeaderboard(false); setShowFinalLeaderboard(false); }}
              >
                🔄 {language === 'bi' ? 'Retry' : 'Cuba Semula'}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <div style={{ background: '#f0fdf4', borderRadius: '16px', padding: '1rem 1.25rem', marginBottom: '1rem', border: '2px solid #86efac' }}>
                <p style={{ color: '#15803d', fontSize: '1rem', fontWeight: '800', margin: 0 }}>
                  🎉 {language === 'bi' ? 'Congratulations! You have passed the Food Catcher Game.' : 'Tahniah! Anda telah lulus Permainan Tangkap Makanan'}
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <button
                  style={{ ...s.startBtn, background: '#64748b', boxShadow: '0 4px 15px rgba(100,116,139,0.3)', fontSize: '1.05rem', fontWeight: '900', padding: '0.9rem' }}
                  onClick={() => { setGameState('start'); setShowLeaderboard(false); setShowFinalLeaderboard(false); }}
                >
                  🔄 {language === 'bi' ? 'Retry' : 'Cuba Semula'}
                </button>
                <button
                  style={{ ...s.startBtn, background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 8px 25px rgba(22,163,74,0.4)', fontSize: '1.05rem', fontWeight: '900', padding: '0.9rem' }}
                  onClick={() => {
                    if (onComplete) onComplete();
                  }}
                >
                  🚀 {language === 'bi' ? 'Continue Adventure!' : 'Teruskan Pengembaraan!'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // GAME SCREEN
  return (
    <div style={s.fullPage}>
      <style>{animStyles}</style>
      <div style={s.gameWrap}>
        <div style={s.gameHeader}>
          <div style={s.scorePanel}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.72rem', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('game.score')}</span>
              <span style={s.scoreVal}>{score}</span>
            </div>
            {combo > 1 && <span style={s.combo}>🔥 {combo}x!</span>}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#fff',
            padding: '8px 12px',
            borderRadius: '10px',
            border: '2px solid #e2e8f0',
            maxWidth: '700px'
          }}>

            <span style={{ color: '#16a34a', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              ✅ +100
            </span>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(10, 22px)',
                gridAutoRows: '22px',
                gap: '4px'
              }}
            >
              {GOOD_FOODS.map(food => (
                <img
                  key={food.image}
                  src={food.image}
                  alt={getFoodName(food)}
                  style={{
                    width: 22,
                    height: 22,
                    objectFit: 'contain'
                  }}
                />
              ))}
            </div>

            <span style={{ color: '#999' }}>|</span>

            <span style={{ color: '#e11d48', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              ❌ -70
            </span>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(10, 22px)',
                gridAutoRows: '22px',
                gap: '4px'
              }}
            >
              {BAD_FOODS.map(food => (
                <img
                  key={food.image}
                  src={food.image}
                  alt={getFoodName(food)}
                  style={{
                    width: 22,
                    height: 22,
                    objectFit: 'contain'
                  }}
                />
              ))}
            </div>

          </div>

          <button
            style={s.muteBtn}
            onClick={() => {
              setIsMuted(m => {
                const next = !m;
                if (next) stopBgMusic();
                else if (gameState === 'playing') startBgMusic(false);
                return next;
              });
            }}
            title={isMuted ? t('game.unmute') || 'Unmute' : t('game.mute') || 'Mute'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <div style={s.timerPanel}>
            <span style={{ ...s.timerVal, color: timeLeft <= 10 ? '#e11d48' : '#4ECDC4' }}>{timeLeft}</span>
            <span style={{ fontSize: '0.75rem', color: '#666' }}>{t('game.seconds')}</span>
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
                <img src={item.image} alt={getFoodName(item)} style={{ width: '52px', height: '52px', objectFit: 'contain', display: 'block' }} />
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
          <span style={{ fontSize: '0.88rem', fontWeight: '600', color: '#475569' }}>{t('game.moveTrolley')}</span>
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
  startCard: { background: '#fff', borderRadius: '24px', padding: '2rem', maxWidth: '700px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', textAlign: 'center', maxHeight: '92vh', overflowY: 'auto' },
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
  particle: { position: 'absolute', width: '8px', height: '8px', borderRadius: '50%', pointerEvents: 'none', willChange: 'top, left', transform: 'translateZ(0)' },
  fallingItem: { position: 'absolute', transform: 'translateX(-50%) translateZ(0)', pointerEvents: 'none', willChange: 'top, left' },
  foodBubble: { width: '60px', height: '60px', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  trolley: { position: 'absolute', bottom: '20px', transform: 'translateX(-50%) translateZ(0)', willChange: 'left' },
  controlsHint: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginTop: '0.75rem', background: '#fff', padding: '0.75rem 2rem', borderRadius: '50px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '2px solid #FFE66D' },
  keyBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'linear-gradient(135deg,#4ECDC4,#44A08D)', color: '#fff', borderRadius: '8px', fontWeight: '800', fontSize: '1rem' },
  muteBtn: { background: '#fff', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '1.4rem', width: '42px', height: '42px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform 0.15s', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
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
