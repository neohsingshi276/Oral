import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import cp1Photo from '../assets/cp1-quiz.png';
import cp2Photo from '../assets/cp2-crossword.png';
import cp3Photo from '../assets/cp3-food.png';
import { useParams, useNavigate } from 'react-router-dom';
import GameCanvas from '../game/GameCanvas';
import { CHECKPOINT_VIDEO_IDS } from '../game/gameConfig';
import YouTubePlayer from '../game/YouTubePlayer';
import api from '../services/api';
import QuizGame from '../game/QuizGame';
import CrosswordGame from '../game/CrosswordGame';
import CP3Game from '../game/Trolley';
import LanguageToggle from '../components/LanguageToggle';
import { useLanguage } from '../context/LanguageContext';

// ─── Web Audio chime — no audio files needed ──────────────────────────────────
// Plays a cheerful rising 3-note fanfare using the browser's AudioContext.
const playSuccessChime = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Notes: C5 → E5 → G5 (a major chord arpeggio)
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.35, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  } catch {
    // AudioContext blocked (e.g. no user gesture yet) — fail silently
  }
};

// ─── Confetti particle component — pure CSS, no libraries ─────────────────────
const CONFETTI_COLORS = ['#FFD700', '#2563eb', '#16a34a', '#e11d48', '#f59e0b', '#7c3aed', '#06b6d4', '#ec4899'];
const SHAPES = ['square', 'circle', 'strip'];

const ConfettiBlast = ({ onDone }) => {
  const particles = useMemo(() => Array.from({ length: 80 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    shape: SHAPES[i % SHAPES.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.6}s`,
    duration: `${1.8 + Math.random() * 1.2}s`,
    size: `${6 + Math.random() * 8}px`,
    rotate: `${Math.random() * 720 - 360}deg`,
    drift: `${(Math.random() - 0.5) * 200}px`,
    fallDist: `${80 + Math.random() * 60}vh`,
  })), []);

  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(var(--fall)) translateX(var(--drift)) rotate(var(--rotate)); opacity: 0; }
        }
      `}</style>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          top: 0,
          left: p.left,
          width: p.shape === 'strip' ? `${parseInt(p.size) / 3}px` : p.size,
          height: p.shape === 'strip' ? `${parseInt(p.size) * 2.5}px` : p.size,
          background: p.color,
          borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'strip' ? '1px' : '2px',
          '--fall': p.fallDist,
          '--drift': p.drift,
          '--rotate': p.rotate,
          animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
        }} />
      ))}
    </div>
  );
};

const escapeXml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const downloadTextFile = (filename, content, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const TouchButton = ({ children, label, onChange, style }) => {
  const endPress = () => onChange(false);
  return (
    <button
      type="button"
      style={{ ...s.touchBtn, ...style }}
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        onChange(true);
      }}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      onPointerLeave={endPress}
    >
      {children}
    </button>
  );
};

const GamePage = () => {
  const { t } = useLanguage();
  const { token } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [progress, setProgress] = useState([]);
  const [activeCP, setActiveCP] = useState(null);
  const [cpStep, setCpStep] = useState('video');
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [allDone, setAllDone] = useState(false);
  const [quizKey, setQuizKey] = useState(0);
  // Hide tutorial if already seen OR if the player has completed any checkpoint (rejoining mid-game)
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('tutorial_seen'));
  const [tutorialPage, setTutorialPage] = useState(0); // 0=movement, 1=checkpoints, 2=cp details
  const [checkpointHint, setCheckpointHint] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [crosswordKey, setCrosswordKey] = useState(0);
  const [virtualInput, setVirtualInput] = useState({});
  const [enterSignal, setEnterSignal] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const [reduceMotion, setReduceMotion] = useState(() =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || localStorage.getItem('dq_reduce_motion') === '1'
  );
  const [certificateBusy, setCertificateBusy] = useState(false);

  // Ref to the Phaser game instance — used to pause keyboard input while typing in chat
  const gameInstanceRef = useRef(null);

  const getPlayerChatConfig = useCallback(() => (
    player?.chat_token
      ? { headers: { Authorization: `Bearer ${player.chat_token}` } }
      : null
  ), [player]);

  // FIX: fetchProgress must be defined before the useEffect that calls it,
  // because const declarations are NOT hoisted — calling a const before its
  // definition throws ReferenceError at runtime.
  const fetchProgress = async (playerId, customToken) => {
    try {
      const tokenToUse = customToken || player?.chat_token;
      const chatConfig = tokenToUse ? { headers: { Authorization: `Bearer ${tokenToUse}` } } : null;
      const res = await api.get(`/game/progress/${playerId}`, chatConfig);
      setProgress(res.data.progress);
      const allCompleted = res.data.progress.every(p => p.completed);
      if (allCompleted && res.data.progress.length === 3) {
        setAllDone(true);
        if (!reduceMotion) {
          playSuccessChime();
          setTimeout(() => { playSuccessChime(); }, 600);
          setShowConfetti(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Validate the player object from localStorage before using it.
  // A missing, malformed, or tampered value used to throw an unhandled error
  // and crash the entire page. Now we redirect cleanly instead.
  useEffect(() => {
    const init = async () => {
    const saved = localStorage.getItem('player');
    if (!saved) {
      navigate(`/join/${token}`);
      return;
    }

    let p;
    try {
      p = JSON.parse(saved);
    } catch {
      localStorage.removeItem('player');
      navigate(`/join/${token}`);
      return;
    }

    // Ensure the parsed object has the required fields
    if (!p || !p.id || !p.session_id || !p.nickname) {
      localStorage.removeItem('player');
      navigate(`/join/${token}`);
      return;
    }

    setPlayer(p);

    // Restore progress and derive the correct checkpoint hint on rejoin
    try {
      const tokenToUse = p.chat_token;
      const chatConfig = tokenToUse ? { headers: { Authorization: `Bearer ${tokenToUse}` } } : null;
      const res = await api.get(`/game/progress/${p.id}`, chatConfig);
      const prog = res.data.progress || [];
      setProgress(prog);

      const allCompleted = prog.every(cp => cp.completed);
      if (allCompleted && prog.length === 3) {
        setAllDone(true);
        setShowTutorial(false);
      } else {
        const completedNums = prog.filter(cp => cp.completed).map(cp => cp.checkpoint_number);
        if (completedNums.length > 0) {
          // Player has completed at least one CP — skip tutorial and show next hint
          setShowTutorial(false);
          localStorage.setItem('tutorial_seen', '1');
          const maxDone = Math.max(...completedNums);
          const nextHint = maxDone < 3 ? maxDone + 1 : null;
          if (nextHint) setCheckpointHint(nextHint);
        } else if (localStorage.getItem('tutorial_seen')) {
          setCheckpointHint(1);
        }
      }
    } catch (err) {
      console.error('Failed to restore progress on rejoin:', err);
    }
    };
    init();
  }, [token, navigate]);

  // FIX: Await the attempt API call so failures are caught and logged.
  // Previously fire-and-forget meant failed attempts were silently swallowed.
  const handleCheckpointReached = async (cpId) => {
    const isUnlocked = cpId === 1 || progress.find(p => p.checkpoint_number === cpId - 1)?.completed;
    if (!isUnlocked) return;

    const chatConfig = getPlayerChatConfig();
    try {
      await api.post('/game/attempt', { player_id: player.id, checkpoint_number: cpId }, chatConfig);
    } catch (err) {
      console.error('Failed to record checkpoint attempt:', err);
    }
    setActiveCP(cpId);
    setCpStep('video');
  };

  const handleVideoWatched = () => setCpStep('activity');

  const handleActivityDone = async () => {
    const chatConfig = getPlayerChatConfig();
    try {
      await api.post('/game/complete', { player_id: player.id, checkpoint_number: activeCP }, chatConfig);
      await fetchProgress(player.id);
    } catch (err) {
      console.error('Failed to save checkpoint completion:', err);
      alert(err.response?.data?.error || 'Unable to save checkpoint progress. Please try again.');
      return;
    }

    if (!reduceMotion) {
      playSuccessChime();
      setShowConfetti(true);
    }

    if (activeCP === 3) {
      setActiveCP(null);
      setCpStep('video');
    } else {
      setCpStep('done');
    }
  };

  const downloadCertificate = async () => {
    if (!player) return;
    setCertificateBusy(true);
    try {
      const res = await api.get(`/game/certificate/${player.id}`, getPlayerChatConfig());
      const cert = res.data.certificate;
      const date = new Date(cert.completed_at).toLocaleDateString();
      const safeName = (cert.nickname || 'student').replace(/[^a-z0-9_-]+/gi, '_');
      const schoolClass = `${cert.school_name || '-'}${cert.class_name ? ` / ${cert.class_name}` : ''}`;
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="990" viewBox="0 0 1400 990">
  <rect width="1400" height="990" fill="#fffaf0"/>
  <rect x="70" y="70" width="1260" height="850" rx="28" fill="#ffffff" stroke="#1e3a5f" stroke-width="10"/>
  <rect x="100" y="100" width="1200" height="790" rx="18" fill="none" stroke="#D4A843" stroke-width="4"/>
  <text x="700" y="190" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="800" fill="#1e3a5f">Dental Quest Certificate</text>
  <text x="700" y="260" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="#64748b">Presented to</text>
  <text x="700" y="360" text-anchor="middle" font-family="Arial, sans-serif" font-size="78" font-weight="800" fill="#2563eb">${escapeXml(cert.nickname)}</text>
  <text x="700" y="440" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#1e293b">for completing all Dental Quest checkpoints</text>
  <text x="700" y="505" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#475569">Session: ${escapeXml(cert.session_name || '-')}</text>
  <text x="700" y="555" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#475569">School/Class: ${escapeXml(schoolClass)}</text>
  <g transform="translate(500 620)">
    <rect width="400" height="110" rx="20" fill="#eff6ff" stroke="#2563eb" stroke-width="3"/>
    <text x="200" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#1e3a5f">Completion Score</text>
    <text x="200" y="90" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="900" fill="#16a34a">${cert.score}/100</text>
  </g>
  <text x="700" y="800" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#64748b">Completed on ${escapeXml(date)}</text>
  <text x="700" y="850" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#94a3b8">Keep smiling, keep learning.</text>
</svg>`;
      downloadTextFile(`dental-quest-certificate-${safeName}.svg`, svg, 'image/svg+xml;charset=utf-8');
    } catch (err) {
      alert(err.response?.data?.error || 'Unable to download certificate. Please try again.');
    } finally {
      setCertificateBusy(false);
    }
  };

  const handleQuizRetry = () => {
    // Force student to re-watch the video before retrying the activity
    const chatConfig = getPlayerChatConfig();
    api.post('/game/attempt', { player_id: player.id, checkpoint_number: activeCP }, chatConfig).catch(console.error);
    setQuizKey(prev => prev + 1);
    setCpStep('video');
  };

  const handleCloseCPModal = () => {
    // Only show the next checkpoint hint if the player actually completed
    // this checkpoint (cpStep === 'done'). Cancelling during the video
    // should NOT trigger the "Welcome to CP2/CP3" card.
    const didComplete = cpStep === 'done';
    const nextHint = activeCP === 1 ? 2 : activeCP === 2 ? 3 : null;
    setActiveCP(null);
    setCpStep('video');
    if (didComplete && nextHint) setCheckpointHint(nextHint);
  };

  const sendChat = async () => {
    const chatConfig = getPlayerChatConfig();
    if (!chatInput.trim() || !chatConfig) return;
    try {
      await api.post('/chat', {
        message: chatInput.trim()
      }, chatConfig);
      setChatMessages(prev => [...prev, {
        sender_type: 'player',
        message: chatInput.trim(),
        sent_at: new Date()
      }]);
      setChatInput('');
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChat = async () => {
    const chatConfig = getPlayerChatConfig();
    if (!chatConfig) return;
    try {
      const res = await api.get(`/chat/${player.id}`, chatConfig);
      setChatMessages(res.data.messages || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (showChat && player) {
      fetchChat();
      const t = setInterval(fetchChat, 5000);
      return () => clearInterval(t);
    }
  }, [showChat, player, getPlayerChatConfig]);

  // ─── Real-time kick detection ─────────────────────────────────────────────
  // Poll every 5 s while a player is active. If the admin deletes the player
  // the endpoint returns { exists: false } and we boot them back to the join
  // page immediately, clearing any local state so they cannot rejoin silently.
  useEffect(() => {
    if (!player) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/game/player-exists/${player.id}`);
        if (!res.data.exists) {
          clearInterval(interval);
          localStorage.removeItem('player');
          navigate(`/join/${token}`);
        }
      } catch {
        // Network blip — keep polling, do not redirect on transient errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [player, token, navigate]);

  const mapTutorialPages = [
    { icon: '🎬', title: t('game.stepWatchTitle'), subtitle: `${t('game.checkpointsTitle')} • 1 / 7`, desc: t('game.stepWatchDesc'), bg: '#eff6ff' },
    { icon: '🎮', title: t('game.stepActivityTitle'), subtitle: `${t('game.checkpointsTitle')} • 2 / 7`, desc: t('game.stepActivityDesc'), bg: '#f0fdf4' },
    { icon: '⚠️', title: t('game.retryTitle'), subtitle: `${t('game.checkpointsTitle')} • 3 / 7`, desc: t('game.retryDesc'), bg: '#fff7ed' },
    { icon: '🏆', title: t('game.scoreboardTitle'), subtitle: `${t('game.checkpointsTitle')} • 4 / 7`, desc: t('game.scoreboardDesc'), bg: '#fdf4ff' },
    { badge: 'CP1', accent: '#7B2FBE', title: `${t('game.cp1Title')} ?`, subtitle: `${t('game.checkpointDetailsTitle')} • 5 / 7`, desc: t('game.cp1Desc'), bg: '#ede9fe' },
    { badge: 'CP2', accent: '#CC3380', title: `${t('game.cp2Title')} 🧩`, subtitle: `${t('game.checkpointDetailsTitle')} • 6 / 7`, desc: t('game.cp2Desc'), bg: '#fce7f3' },
    { badge: 'CP3', accent: '#E85D04', title: `${t('game.cp3Title')} 🍎`, subtitle: `${t('game.checkpointDetailsTitle')} • 7 / 7`, desc: t('game.cp3Desc'), bg: '#fff7ed', note: t('game.scoreboardNote') },
  ];

  const checkpointHints = {
    1: {
      title: t('game.cpHint1Title'),
      badge: 'CP1',
      photo: cp1Photo,
      accent: '#7B2FBE',
      bg: '#ede9fe',
      heading: t('game.cpHint1Heading'),
      clue: t('game.cpHint1Clue'),
      activity: t('game.quiz'),
    },
    2: {
      title: t('game.cpHint2Title'),
      badge: 'CP2',
      photo: cp2Photo,
      accent: '#CC3380',
      bg: '#fce7f3',
      heading: t('game.cpHint2Heading'),
      clue: t('game.cpHint2Clue'),
      activity: t('game.crossword'),
    },
    3: {
      title: t('game.cpHint3Title'),
      badge: 'CP3',
      photo: cp3Photo,
      accent: '#E85D04',
      bg: '#fff7ed',
      heading: t('game.cpHint3Heading'),
      clue: t('game.cpHint3Clue'),
      activity: t('game.foodGame'),
    },
  };

  useEffect(() => {
    if (!showTutorial || tutorialPage >= mapTutorialPages.length - 1) return;
    const timer = setTimeout(() => {
      setTutorialPage(page => Math.min(page + 1, mapTutorialPages.length - 1));
    }, 4000);
    return () => clearTimeout(timer);
  }, [showTutorial, tutorialPage, mapTutorialPages.length]);

  useEffect(() => {
    const preventBrowserZoom = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      const zoomKeys = ['+', '-', '=', '_', '0'];
      if (zoomKeys.includes(event.key)) event.preventDefault();
    };
    const preventWheelZoom = (event) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault();
    };

    window.addEventListener('keydown', preventBrowserZoom, { capture: true });
    window.addEventListener('wheel', preventWheelZoom, { passive: false });
    return () => {
      window.removeEventListener('keydown', preventBrowserZoom, { capture: true });
      window.removeEventListener('wheel', preventWheelZoom);
    };
  }, []);

  if (!player) return <div style={s.loading}>{t('game.loading')}</div>;

  const showFullQuiz = activeCP === 1 && cpStep === 'activity';
  const showFullCP3 = activeCP === 3 && cpStep === 'activity';
  const showModal = activeCP && !showFullQuiz && !showFullCP3;
  const isWorldPaused = showTutorial || !!checkpointHint || !!allDone || !!showModal || !!showFullQuiz || !!showFullCP3;

  return (
    <div style={s.page}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}} @keyframes popIn{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}`}</style>

      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logo}>🦷 Dental Quest</span>
          <span style={s.playerBadge} title={player.nickname}>👤 {player.nickname}</span>
        </div>
        <div style={s.headerRight}>
          <LanguageToggle compact style={{ background: 'rgba(255,255,255,0.1)', color: '#FFD700' }} />
          {[1, 2, 3].map(cp => {
            const done = progress.find(p => p.checkpoint_number === cp)?.completed;
            return (
              <div key={cp} style={{ ...s.cpBadge, background: done ? '#16a34a' : '#94a3b8' }}>
                {done ? '✓' : cp}
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls hint */}
      <div style={s.controls}>
        <span>Gerak: <strong>W A S D</strong> atau <strong>Anak Panah</strong></span>
        <span style={{ marginLeft: '1.5rem' }}>Masuk zon: <strong>Tekan E</strong></span>
      </div>

      {/* Game Canvas */}
      <div style={s.canvasWrap}>
        <GameCanvas
          player={player}
          progress={progress}
          onCheckpointReached={handleCheckpointReached}
          paused={isWorldPaused}
          externalGameRef={gameInstanceRef}
          virtualInput={virtualInput}
          enterSignal={enterSignal}
        />
      </div>

      {isMobile && (
        <div style={s.touchControls} aria-label="Touch game controls">
          <div style={s.dpad}>
            <TouchButton label="Up" style={{ gridColumn: 2 }} onChange={down => setVirtualInput(v => ({ ...v, up: down }))}>↑</TouchButton>
            <TouchButton label="Left" style={{ gridColumn: 1 }} onChange={down => setVirtualInput(v => ({ ...v, left: down }))}>←</TouchButton>
            <TouchButton label="Down" style={{ gridColumn: 2 }} onChange={down => setVirtualInput(v => ({ ...v, down: down }))}>↓</TouchButton>
            <TouchButton label="Right" style={{ gridColumn: 3 }} onChange={down => setVirtualInput(v => ({ ...v, right: down }))}>→</TouchButton>
          </div>
          <button
            type="button"
            style={s.enterTouchBtn}
            onClick={() => setEnterSignal(value => value + 1)}
            aria-label="Enter checkpoint"
          >
            {t('game.tabEnter')}
          </button>
        </div>
      )}


      {/* Tutorial Overlay — 3-page walkthrough */}
      {showTutorial && (() => {
        const page = mapTutorialPages[tutorialPage] || mapTutorialPages[0];
        const isLast = tutorialPage === mapTutorialPages.length - 1;
        const accentColor = page.accent || '#2563eb';
        const stepNum = tutorialPage + 1;
        const totalSteps = mapTutorialPages.length;

        // === PHOTO TEMPLATES — add a photo URL per tutorial step ===
        // e.g. tutorialPhotos[0] = '/assets/watch-video-photo.jpg'
        const tutorialPhotos = [null, null, null, null, null, null, null];
        const currentPhoto = tutorialPhotos[tutorialPage] || null;

        return (
          <div style={s.overlay}>
            <div style={{ ...s.doneCard, maxWidth: '600px', padding: 0, overflow: 'hidden', position: 'relative' }}>

              {/* ── Colored top banner ── */}
              <div style={{ background: page.bg, padding: '2rem 2.2rem 1.6rem', textAlign: 'center', borderBottom: `3px solid ${page.accent || '#e2e8f0'}` }}>

                {/* Step counter pill */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)', borderRadius: '999px', padding: '0.35rem 1rem', marginBottom: '1.1rem', fontSize: '1rem', fontWeight: 800, color: accentColor, border: `1.5px solid ${accentColor}44` }}>
                  <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: accentColor, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.88rem', fontWeight: 900 }}>{stepNum}</span>
                  <span>Step {stepNum} of {totalSteps}</span>
                </div>

                {/* Big icon / badge */}
                {page.badge ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', borderRadius: '16px', background: page.accent, color: '#fff', fontWeight: 900, fontSize: '1.4rem', marginBottom: '0.5rem', boxShadow: `0 8px 24px ${page.accent}55` }}>
                    {page.badge}
                  </div>
                ) : (
                  <div style={{ fontSize: '5rem', lineHeight: 1, marginBottom: '0.9rem' }}>{page.icon}</div>
                )}

                <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1e3a5f', margin: '0 0 0.35rem', lineHeight: 1.2 }}>{page.title}</h2>
                <p style={{ color: '#475569', fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>{page.subtitle}</p>
              </div>

              {/* ── Card body ── */}
              <div style={{ padding: '1rem 1.5rem 1.2rem' }}>

                {/* Photo slot — only renders when a photo URL is set */}
                {currentPhoto && (
                  <div style={{ width: '100%', height: '160px', borderRadius: '16px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                    <img src={currentPhoto} alt="Step photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}

                {/* Description row */}
                <div style={{ background: page.bg, borderRadius: '16px', padding: '1.4rem 1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1.1rem', textAlign: 'left', marginBottom: '1.5rem', border: `1.5px solid ${page.accent || '#e2e8f0'}33` }}>
                  {page.badge ? (
                    <div style={{ color: '#fff', background: page.accent, borderRadius: '10px', padding: '0.45rem 0.8rem', fontSize: '1.05rem', fontWeight: 900, flexShrink: 0, marginTop: '2px' }}>{page.badge}</div>
                  ) : (
                    <span style={{ fontSize: '2.5rem', width: '56px', textAlign: 'center', flexShrink: 0, lineHeight: 1, marginTop: '2px' }}>{page.icon}</span>
                  )}
                  <p style={{ margin: 0, color: '#1e293b', fontSize: '1.2rem', lineHeight: 1.65, fontWeight: 700 }}>{page.desc}</p>
                </div>

                {page.note && (
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '14px', padding: '1rem 1.1rem', color: '#15803d', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                    🏆 {page.note}
                  </div>
                )}

                {/* Dot progress */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', margin: '0 0 1.25rem' }}>
                  {mapTutorialPages.map((item, i) => (
                    <button
                      key={item.title}
                      type="button"
                      aria-label={`Go to step ${i + 1}`}
                      onClick={() => setTutorialPage(i)}
                      style={{ height: '10px', width: i === tutorialPage ? '28px' : '10px', borderRadius: '999px', border: 'none', cursor: 'pointer', background: i === tutorialPage ? (page.accent || '#2563eb') : '#cbd5e1', transition: 'all 0.2s' }}
                    />
                  ))}
                </div>

                {/* Navigation buttons */}
                {!isLast ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '0.75rem' }}>
                      <button
                        style={{ padding: '1rem', background: tutorialPage === 0 ? '#e2e8f0' : '#64748b', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 800, cursor: tutorialPage === 0 ? 'default' : 'pointer', opacity: tutorialPage === 0 ? 0.5 : 1 }}
                        disabled={tutorialPage === 0}
                        onClick={() => setTutorialPage(p => Math.max(p - 1, 0))}
                      >← {t('game.back')}</button>
                      <button
                        style={{ padding: '1rem', background: `linear-gradient(135deg, ${page.accent || '#2563eb'}, ${page.accent || '#2563eb'}cc)`, color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1.15rem', fontWeight: 900, cursor: 'pointer', boxShadow: `0 6px 20px ${page.accent || '#2563eb'}44` }}
                        onClick={() => setTutorialPage(p => Math.min(p + 1, mapTutorialPages.length - 1))}
                      >{t('game.next')} →</button>
                    </div>
                    <div style={{ marginTop: '0.75rem', color: '#94a3b8', fontSize: '0.95rem', fontWeight: 700, textAlign: 'center' }}>⏱ {t('game.autoNext4')}</div>
                  </>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '0.75rem' }}>
                    <button style={{ padding: '1rem', background: '#64748b', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 800, cursor: 'pointer' }} onClick={() => { localStorage.removeItem('player'); navigate('/'); }}>🏠 {t('nav.home')}</button>
                    <button style={{ padding: '1rem', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 800, cursor: 'pointer' }} onClick={() => setTutorialPage(0)}>↺ {t('game.restart')}</button>
                    <button style={{ padding: '1rem', background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 6px 20px rgba(22,163,74,0.4)' }} onClick={() => { setShowTutorial(false); localStorage.setItem('tutorial_seen', '1'); setCheckpointHint(1); }}>🚀 {t('game.playGame')}</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {checkpointHint && (() => {
        const hint = checkpointHints[checkpointHint];
        return (
          <div style={s.overlay}>
            <div style={{ ...s.doneCard, maxWidth: '580px', padding: 0, overflow: 'hidden', position: 'relative' }}>

              {/* ── Colored top banner ── */}
              <div style={{ background: hint.bg, padding: '1.2rem 1.5rem 1rem', textAlign: 'center', borderBottom: `3px solid ${hint.accent}66`, position: 'relative' }}>

                {/* Decorative large faded badge behind */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '9rem', fontWeight: 900, color: hint.accent, opacity: 0.06, pointerEvents: 'none', lineHeight: 1, userSelect: 'none' }}>
                  {hint.badge}
                </div>

                {/* Big badge */}
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '110px', height: '110px', borderRadius: '28px', background: hint.accent, color: '#fff', fontWeight: 900, fontSize: '2.4rem', marginBottom: '1rem', boxShadow: `0 10px 32px ${hint.accent}55`, position: 'relative' }}>
                  {hint.badge}
                </div>

                <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#1e3a5f', margin: '0 0 0.5rem', lineHeight: 1.2 }}>{hint.title}</h2>

                {/* Activity pill */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: hint.accent, color: '#fff', padding: '0.45rem 1.2rem', borderRadius: '999px', fontSize: '1.1rem', fontWeight: 800 }}>
                  <span>{t('game.nextActivity')}:</span>
                  <span>{hint.activity}</span>
                </div>
              </div>

              {/* ── Card body ── */}
              <div style={{ padding: '1rem 1.5rem 1.2rem' }}>

                {/* Photo — only shows when hint.photo is set, no empty space otherwise */}
                {hint.photo && (
                  <div style={{ width: '100%', height: '120px', borderRadius: '12px', overflow: 'hidden', marginBottom: '0.8rem' }}>
                    <img src={hint.photo} alt={hint.badge} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}

                {/* Clue box */}
                <div style={{ background: hint.bg, borderRadius: '12px', padding: '0.9rem 1rem', textAlign: 'left', marginBottom: '0.8rem', border: `1.5px solid ${hint.accent}33` }}>
                  <h3 style={{ color: '#1e3a5f', margin: '0 0 0.65rem', fontSize: '1.45rem', fontWeight: 900, lineHeight: 1.3 }}>{hint.heading}</h3>
                  <p style={{ color: '#334155', margin: 0, fontSize: '1.18rem', lineHeight: 1.7, fontWeight: 600 }}>{hint.clue}</p>
                </div>

                <button
                  style={{ width: '100%', padding: '1.1rem', background: `linear-gradient(135deg, ${hint.accent}, ${hint.accent}cc)`, color: '#fff', border: 'none', borderRadius: '16px', fontSize: '1.25rem', fontWeight: 900, cursor: 'pointer', boxShadow: `0 8px 24px ${hint.accent}44`, letterSpacing: '0.01em' }}
                  onClick={() => setCheckpointHint(null)}
                >
                  {t('game.letsGo')} 🚀
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {false && showTutorial && (() => {
        // tut must be defined first — const is not hoisted
        const tut = {
          row: (bg) => ({ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', background: bg, padding: '0.85rem', borderRadius: '10px' }),
          icon: { fontSize: '1.6rem', flexShrink: 0, marginTop: '2px' },
          cpBadge: { color: '#fff', fontWeight: '800', fontSize: '0.75rem', padding: '0.3rem 0.6rem', borderRadius: '8px', flexShrink: 0, marginTop: '2px', letterSpacing: '0.03em' },
          title: { color: '#1e3a5f', display: 'block', marginBottom: '0.2rem', fontSize: '0.92rem' },
          desc: { margin: 0, color: '#475569', fontSize: '0.83rem', lineHeight: 1.5 },
          kbd: { background: '#1e293b', color: '#FFD700', border: '1px solid #334155', borderRadius: '4px', padding: '1px 5px', fontSize: '0.78rem', fontFamily: 'monospace', margin: '0 1px' },
          nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' },
          dots: { display: 'flex', gap: '6px' },
          dot: { width: '8px', height: '8px', borderRadius: '50%' },
        };

        const pages = [
          // Page 0 — Movement controls
          <div key="p0" style={{ ...s.doneCard, maxWidth: '520px', padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '3.5rem' }}>🗺️</div>
              <h2 style={{ ...s.doneTitle, fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>{t('game.tutorialWelcome')}</h2>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>{t('game.tutorialRead')} • 1 / 3</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1.25rem 0' }}>
              <div style={tut.row('#eff6ff')}>
                <span style={tut.icon}>🕹️</span>
                <div>
                  <strong style={tut.title}>{t('game.moveCharacter')}</strong>
                  <p style={tut.desc}>{t('game.moveDesc')} <kbd style={tut.kbd}>W</kbd><kbd style={tut.kbd}>A</kbd><kbd style={tut.kbd}>S</kbd><kbd style={tut.kbd}>D</kbd> {t('game.controlsOr')} <kbd style={tut.kbd}>↑</kbd><kbd style={tut.kbd}>↓</kbd><kbd style={tut.kbd}>←</kbd><kbd style={tut.kbd}>→</kbd> {t('game.moveDescEnd')}</p>
                </div>
              </div>
              <div style={tut.row('#f0fdf4')}>
                <span style={tut.icon}>🎯</span>
                <div>
                  <strong style={tut.title}>{t('game.enterCheckpoint')}</strong>
                  <p style={tut.desc}>{t('game.enterCheckpointDesc')} <kbd style={tut.kbd}>E</kbd> {t('game.enterCheckpointEnd')}</p>
                </div>
              </div>
              <div style={tut.row('#fff7ed')}>
                <span style={tut.icon}>💬</span>
                <div>
                  <strong style={tut.title}>{t('game.chatButton')}</strong>
                  <p style={tut.desc}>{t('game.chatButtonDesc')}</p>
                </div>
              </div>
              <div style={tut.row('#fdf4ff')}>
                <span style={tut.icon}>💾</span>
                <div>
                  <strong style={tut.title}>{t('game.autosave')}</strong>
                  <p style={tut.desc}>{t('game.autosaveDesc')}</p>
                </div>
              </div>
            </div>
            <div style={tut.nav}>
              <div style={tut.dots}>{[0, 1, 2].map(i => <div key={i} style={{ ...tut.dot, background: i === 0 ? '#2563eb' : '#cbd5e1' }} />)}</div>
              <button style={{ ...s.continueBtn, width: 'auto', padding: '0.7rem 2rem' }} onClick={() => setTutorialPage(1)}>{t('game.next')} →</button>
            </div>
          </div>,

          // Page 1 — Checkpoints overview
          <div key="p1" style={{ ...s.doneCard, maxWidth: '520px', padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '3.5rem' }}>🏁</div>
              <h2 style={{ ...s.doneTitle, fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>{t('game.checkpointsTitle')}</h2>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>{t('game.checkpointsSub')} • 2 / 3</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1.25rem 0' }}>
              <div style={tut.row('#eff6ff')}>
                <span style={tut.icon}>🎬</span>
                <div>
                  <strong style={tut.title}>{t('game.stepWatchTitle')}</strong>
                  <p style={tut.desc}>{t('game.stepWatchDesc')}</p>
                </div>
              </div>
              <div style={tut.row('#f0fdf4')}>
                <span style={tut.icon}>🎮</span>
                <div>
                  <strong style={tut.title}>{t('game.stepActivityTitle')}</strong>
                  <p style={tut.desc}>{t('game.stepActivityDesc')}</p>
                </div>
              </div>
              <div style={tut.row('#fff7ed')}>
                <span style={tut.icon}>⚠️</span>
                <div>
                  <strong style={tut.title}>{t('game.retryTitle')}</strong>
                  <p style={tut.desc}>{t('game.retryDesc')}</p>
                </div>
              </div>
              <div style={tut.row('#fdf4ff')}>
                <span style={tut.icon}>🏆</span>
                <div>
                  <strong style={tut.title}>{t('game.scoreboardTitle')}</strong>
                  <p style={tut.desc}>{t('game.scoreboardDesc')}</p>
                </div>
              </div>
            </div>
            <div style={tut.nav}>
              <div style={tut.dots}>{[0, 1, 2].map(i => <div key={i} style={{ ...tut.dot, background: i === 1 ? '#2563eb' : '#cbd5e1' }} />)}</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button style={{ ...s.continueBtn, width: 'auto', padding: '0.7rem 1.5rem', background: '#64748b' }} onClick={() => setTutorialPage(0)}>← {t('game.back')}</button>
                <button style={{ ...s.continueBtn, width: 'auto', padding: '0.7rem 2rem' }} onClick={() => setTutorialPage(2)}>{t('game.next')} →</button>
              </div>
            </div>
          </div>,

          // Page 2 — CP details
          <div key="p2" style={{ ...s.doneCard, maxWidth: '540px', padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '3.5rem' }}>🦷</div>
              <h2 style={{ ...s.doneTitle, fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>{t('game.checkpointDetailsTitle')}</h2>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>{t('game.activityList')} • 3 / 3</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1.25rem 0' }}>
              <div style={tut.row('#ede9fe')}>
                <div style={{ ...tut.cpBadge, background: '#7B2FBE' }}>CP1</div>
                <div>
                  <strong style={tut.title}>{t('game.cp1Title')} ❓</strong>
                  <p style={tut.desc}>{t('game.cp1Desc')}</p>
                </div>
              </div>
              <div style={tut.row('#fce7f3')}>
                <div style={{ ...tut.cpBadge, background: '#CC3380' }}>CP2</div>
                <div>
                  <strong style={tut.title}>{t('game.cp2Title')} 🧩</strong>
                  <p style={tut.desc}>{t('game.cp2Desc')}</p>
                </div>
              </div>
              <div style={tut.row('#fff7ed')}>
                <div style={{ ...tut.cpBadge, background: '#E85D04' }}>CP3</div>
                <div>
                  <strong style={tut.title}>{t('game.cp3Title')} 🍎</strong>
                  <p style={tut.desc}>{t('game.cp3Desc')}</p>
                </div>
              </div>
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.83rem', color: '#15803d' }}>
              🏆 {t('game.scoreboardNote')}
            </div>
            <div style={tut.nav}>
              <div style={tut.dots}>{[0, 1, 2].map(i => <div key={i} style={{ ...tut.dot, background: i === 2 ? '#2563eb' : '#cbd5e1' }} />)}</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button style={{ ...s.continueBtn, width: 'auto', padding: '0.7rem 1.5rem', background: '#64748b' }} onClick={() => setTutorialPage(1)}>← {t('game.back')}</button>
                <button style={{ ...s.continueBtn, width: 'auto', padding: '0.7rem 2rem', background: '#16a34a' }} onClick={() => { setShowTutorial(false); localStorage.setItem('tutorial_seen', '1'); }}>
                  🚀 {t('game.startPlaying')}
                </button>
              </div>
            </div>
          </div>,
        ];

        return (
          <div style={s.overlay}>
            {pages[tutorialPage]}
          </div>
        );
      })()}

      {/* All Done — Congratulations screen */}
      {allDone && (
        <div style={s.overlay}>
          <div style={s.doneCard}>
            <div style={{ fontSize: '5rem', animation: 'popIn 0.5s ease' }}>🏆</div>
            <h2 style={s.doneTitle}>{t('game.congrats')}</h2>
            <p style={s.doneText}>{t('game.completedAll')}</p>
            <p style={s.doneText}>{t('game.champion')}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', margin: '1.5rem 0', background: '#f8fafc', borderRadius: '16px', padding: '1.25rem' }}>
              {[{ label: t('game.quiz'), cp: 1 }, { label: t('game.crossword'), cp: 2 }, { label: t('game.foodGame'), cp: 3 }].map(({ label, cp }) => {
                const done = progress.find(p => p.checkpoint_number === cp)?.completed;
                return (
                  <div key={cp} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem' }}>{done ? '✅' : '⭕'}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem', fontWeight: '600' }}>{label}</div>
                  </div>
                );
              })}
            </div>
            <button
              style={{ ...s.continueBtn, background: '#16a34a', marginTop: '0.5rem' }}
              onClick={downloadCertificate}
              disabled={certificateBusy}
            >
              {certificateBusy ? t('game.preparingCertificate') : t('game.downloadCertificate')}
            </button>
            <button
              style={{ ...s.continueBtn, background: '#2563eb', marginTop: '0.75rem' }}
              onClick={() => { localStorage.removeItem('player'); navigate('/'); }}
            >
              {t('game.backHome')}
            </button>
          </div>
        </div>
      )}

      {/* Full Screen Quiz — CP1 */}
      {showFullQuiz && (
        <div style={s.fullQuiz}>
          <div style={s.fullQuizHeader}>
            <span style={s.fullQuizTitle}>{t('game.checkpoint')} 1 - {t('game.quiz')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <LanguageToggle compact style={{ background: 'rgba(255,255,255,0.1)', color: '#FFD700' }} />
              <span style={s.fullQuizPlayer}>👤 {player.nickname}</span>
            </div>
          </div>
          <div style={s.fullQuizBody}>
            <QuizGame
              key={quizKey}
              player={player}
              onQuizComplete={handleActivityDone}
              onRetry={handleQuizRetry}
            />
          </div>
        </div>
      )}

      {/* Full Screen CP3 — Food Game */}
      {showFullCP3 && (
        <CP3Game player={player} onComplete={handleActivityDone} />
      )}

      {/* Checkpoint Modal */}
      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>
                {activeCP === 1 ? '🟣' : activeCP === 2 ? '🟤' : '🟠'} {t('game.checkpoint')} {activeCP}
              </h2>
              {cpStep === 'video' && (
                <button style={s.closeBtn} onClick={handleCloseCPModal}>✕</button>
              )}
            </div>

            <div style={s.steps}>
              {t('game.steps').map((label, i) => (
                <div key={i} style={{ ...s.step, ...((['video', 'activity', 'done'][i] === cpStep) ? s.stepActive : {}) }}>
                  <div style={s.stepDot}>{i + 1}</div>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {cpStep === 'video' && (
              <div style={s.modalBody}>
                <p style={s.modalHint}>{t('game.modalHint')}</p>
                <YouTubePlayer videoId={CHECKPOINT_VIDEO_IDS[activeCP]} onVideoEnd={handleVideoWatched} />
              </div>
            )}

            {cpStep === 'activity' && activeCP === 2 && (
              <CrosswordGame
                key={crosswordKey}
                onComplete={handleActivityDone}
                onRetry={() => {
                  // Force student to re-watch the video before retrying crossword
                  api.post('/game/attempt', { player_id: player.id, checkpoint_number: activeCP }, getPlayerChatConfig()).catch(console.error);
                  setCrosswordKey(prev => prev + 1);
                  setCpStep('video');
                }}
                playerId={player.id}
                sessionId={player.session_id}
              />
            )}

            {cpStep === 'done' && activeCP !== 3 && (
              <div style={{ ...s.modalBody, textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                <h3 style={{ color: '#16a34a', fontSize: '1.4rem', fontWeight: '800' }}>
                  {t('game.checkpoint')} {activeCP} {t('game.checkpointDone')}
                </h3>
                <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                  {t('game.nextCheckpoint')}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    style={{ ...s.continueBtn, background: '#64748b', flex: '0 0 auto', width: 'auto', padding: '0.85rem 1.25rem', fontSize: '0.9rem' }}
                    onClick={() => {
                      api.post('/game/attempt', { player_id: player.id, checkpoint_number: activeCP }, getPlayerChatConfig()).catch(console.error);
                      if (activeCP === 1) setQuizKey(prev => prev + 1);
                      if (activeCP === 2) setCrosswordKey(prev => prev + 1);
                      setCpStep('video');
                    }}
                  >
                    🔄 {t('game.retry', 'Cuba Semula')}
                  </button>
                  <button style={{ ...s.continueBtn, background: '#16a34a', flex: 1 }} onClick={handleCloseCPModal}>
                    {t('game.continueAdventure')} →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Widget */}
      {showChat && (
        <div style={s.chatBox}>
          <div style={s.chatHeader}>
            <span>{t('game.chatTitle')}</span>
            <button style={s.chatClose} onClick={() => setShowChat(false)}>✕</button>
          </div>
          <div style={s.chatMessages}>
            {chatMessages.length === 0 && (
              <p style={s.chatEmpty}>{t('game.chatEmpty')}</p>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} style={{ ...s.chatMsg, ...(m.sender_type === 'player' ? s.chatMsgPlayer : s.chatMsgAdmin) }}>
                <span style={s.chatSender}>{m.sender_type === 'player' ? player.nickname : t('game.teacher')}</span>
                <p style={{ ...s.chatText, color: m.sender_type === 'admin' ? '#1e293b' : '#2563eb' }}>{m.message}</p>
              </div>
            ))}
          </div>
          <div style={s.chatInput}>
            <input
              style={s.chatInputField}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={t('game.chatPlaceholder')}
              maxLength={200}
              disabled={!player?.chat_token}
              onKeyDown={e => {
                // Prevent game from receiving these keystrokes
                e.stopPropagation();
                if (e.key === 'Enter') sendChat();
              }}
              onFocus={() => {
                // Disable Phaser keyboard so WASD/E/Space don't move the player
                if (gameInstanceRef.current?.input?.keyboard) {
                  gameInstanceRef.current.input.keyboard.enabled = false;
                }
              }}
              onBlur={() => {
                // Re-enable Phaser keyboard when chat input loses focus
                if (gameInstanceRef.current?.input?.keyboard) {
                  gameInstanceRef.current.input.keyboard.enabled = true;
                }
              }}
            />
            <button style={{ ...s.chatSendBtn, opacity: player?.chat_token ? 1 : 0.5 }} onClick={sendChat} disabled={!player?.chat_token}>{t('game.send')}</button>
          </div>
          {!player?.chat_token && (
            <div style={{ padding: '0 0.75rem 0.75rem', color: '#e11d48', fontSize: '0.78rem' }}>
              {t('game.chatToken')}
            </div>
          )}
        </div>
      )}

      {/* Confetti blast — fires on every checkpoint completion */}
      {showConfetti && (
        <ConfettiBlast onDone={() => setShowConfetti(false)} />
      )}

      {/* Floating Chat Button */}
      <button
        style={{
          position: 'fixed', bottom: '1.5rem',
          right: showChat ? '340px' : '1.5rem',
          background: '#2563eb', color: '#fff', border: 'none',
          borderRadius: '50%', width: '54px', height: '54px',
          fontSize: '1.4rem', cursor: 'pointer', zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)', transition: 'right 0.3s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onClick={() => setShowChat(!showChat)}
      >
        💬
      </button>
    </div>
  );
};

const s = {
  page: { height: '100vh', background: '#0f172a', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  loading: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem', background: '#0f172a' },
  header: { width: '100%', background: '#1e3a5f', padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', flexShrink: 0 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  logo: { color: '#FFD700', fontWeight: '800', fontSize: '1.1rem' },
  playerBadge: { color: '#fff', padding: '0.3rem 0', fontSize: '0.85rem', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  cpBadge: { width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '0.82rem' },
  controls: { color: '#94a3b8', fontSize: '0.78rem', padding: '0.35rem 1rem', background: 'rgba(255,255,255,0.05)', width: '100%', textAlign: 'center', flexShrink: 0 },
  canvasWrap: { flex: 1, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'stretch', padding: '0.25rem', boxSizing: 'border-box', overflow: 'hidden' },
  touchControls: { position: 'fixed', left: '1rem', bottom: '1rem', zIndex: 90, display: 'flex', alignItems: 'flex-end', gap: '1rem', pointerEvents: 'auto' },
  dpad: { display: 'grid', gridTemplateColumns: '48px 48px 48px', gridTemplateRows: '48px 48px 48px', gap: '0.35rem', touchAction: 'none' },
  touchBtn: { width: 48, height: 48, borderRadius: 10, border: '2px solid rgba(255,255,255,0.45)', background: 'rgba(30,58,95,0.9)', color: '#fff', fontWeight: 900, fontSize: '1.2rem', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', touchAction: 'none' },
  enterTouchBtn: { minWidth: 86, height: 54, borderRadius: 12, border: '2px solid rgba(255,255,255,0.45)', background: '#D4A843', color: '#1e3a5f', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' },
  modal: { background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflow: 'auto', animation: 'fadeIn 0.3s ease' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' },
  modalTitle: { fontSize: '1.2rem', fontWeight: '800', color: '#1e3a5f', margin: 0 },
  closeBtn: { background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1rem', fontWeight: '700' },
  steps: { display: 'flex', gap: '0.5rem', padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9' },
  step: { display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.85rem' },
  stepActive: { color: '#2563eb', fontWeight: '700' },
  stepDot: { width: '22px', height: '22px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700' },
  modalBody: { padding: '1.5rem' },
  modalHint: { color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' },
  continueBtn: { width: '100%', padding: '0.85rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' },
  doneCard: { background: '#fff', borderRadius: '20px', padding: '3rem', textAlign: 'center', animation: 'fadeIn 0.3s ease' },
  doneTitle: { fontSize: '2rem', fontWeight: '800', color: '#1e3a5f', margin: '1rem 0 0.5rem' },
  doneText: { color: '#64748b', fontSize: '1.05rem', margin: '0.25rem 0' },
  fullQuiz: { position: 'fixed', inset: 0, background: '#0f172a', zIndex: 200, display: 'flex', flexDirection: 'column' },
  fullQuizHeader: { background: '#1e3a5f', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  fullQuizTitle: { color: '#FFD700', fontWeight: '800', fontSize: '1.1rem' },
  fullQuizPlayer: { color: '#94a3b8', fontSize: '0.9rem' },
  fullQuizBody: { flex: 1, overflowY: 'auto', padding: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%', boxSizing: 'border-box' },
  chatBox: { position: 'fixed', bottom: '1rem', right: '1rem', width: '320px', background: '#fff', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', zIndex: 9998, display: 'flex', flexDirection: 'column', maxHeight: '420px' },
  chatHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#1e3a5f', borderRadius: '16px 16px 0 0', color: '#fff', fontWeight: '600', fontSize: '0.9rem' },
  chatClose: { background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem' },
  chatMessages: { flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  chatEmpty: { color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' },
  chatMsg: { padding: '0.5rem 0.75rem', borderRadius: '10px', maxWidth: '85%' },
  chatMsgPlayer: { background: '#eff6ff', alignSelf: 'flex-end' },
  chatMsgAdmin: { background: '#f0fdf4', alignSelf: 'flex-start' },
  chatSender: { fontSize: '0.72rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '0.2rem' },
  chatText: { margin: 0, fontSize: '0.88rem' },
  chatInput: { display: 'flex', gap: '0.5rem', padding: '0.75rem', borderTop: '1px solid #e2e8f0' },
  chatInputField: { flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' },
  chatSendBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' },
};

export default GamePage;
