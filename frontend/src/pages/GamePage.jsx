import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import cp1Photo from '../assets/cp1.jpg';
import cp2Photo from '../assets/cp2-crossword.png';
import cp3Photo from '../assets/cp3.jpg';
import { useParams, useNavigate } from 'react-router-dom';
import GameCanvas from '../game/GameCanvas';
import { CHECKPOINT_VIDEO_IDS, CONCLUDING_VIDEO_IDS } from '../game/gameConfig';
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
  const { t, language } = useLanguage();
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
  const [concludingVideoWatched, setConcludingVideoWatched] = useState(false);
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
  const [selectedCharacter, setSelectedCharacter] = useState(() => {
    return localStorage.getItem('dq_selected_character') || '';
  });
  const chooseCharacter = (character) => {
    setSelectedCharacter(character);
    localStorage.setItem('dq_selected_character', character);
  };
  const [quizSettings, setQuizSettings] = useState(null);
  const [crosswordSettings, setCrosswordSettings] = useState(null);
  const [showCP4Leaderboard, setShowCP4Leaderboard] = useState(false);
  const [cp4LeaderboardData, setCp4LeaderboardData] = useState([]);
  const [showCP3FinalLeaderboard, setShowCP3FinalLeaderboard] = useState(false);

  useEffect(() => {
    if (!player?.session_id) return;
    api.get(`/quiz/session/${player.session_id}`)
      .then(res => {
        if (res.data?.settings) {
          setQuizSettings(res.data.settings);
        }
      })
      .catch(() => { });

    api.get(`/crossword/${player.session_id}`)
      .then(res => {
        if (res.data?.settings) {
          setCrosswordSettings(res.data.settings);
        }
      })
      .catch(() => { });
  }, [player?.session_id]);

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
      // allDone is now triggered by reaching CP4, not by having 3 CPs complete
    } catch (err) {
      console.error(err);
    }
  };

  // Validate the player object from localStorage before using it.
  // A missing, malformed, or tampered value used to throw an unhandled error
  // and crash the entire page. Now we redirect cleanly instead.
  // FIX: Also checks that the stored session token matches the URL token,
  // and expires the saved data after 5 minutes of inactivity.
  const SESSION_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

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
        localStorage.removeItem('dq_selected_character');
        navigate(`/join/${token}`);
        return;
      }

      // Ensure the parsed object has the required fields
      if (!p || !p.id || !p.session_id || !p.nickname) {
        localStorage.removeItem('player');
        localStorage.removeItem('dq_selected_character');
        navigate(`/join/${token}`);
        return;
      }

      // FIX: If the stored session token doesn't match the current URL token,
      // the player is trying to join a different session — clear old data.
      if (p._token && p._token !== token) {
        localStorage.removeItem('player');
        localStorage.removeItem('tutorial_seen');
        localStorage.removeItem('dq_selected_character');
        navigate(`/join/${token}`);
        return;
      }

      // FIX: If the player has been inactive for more than 5 minutes, expire
      // the session so they start fresh when re-joining (even same code).
      if (p._lastActive && Date.now() - p._lastActive > SESSION_EXPIRY_MS) {
        localStorage.removeItem('player');
        localStorage.removeItem('tutorial_seen');
        localStorage.removeItem('dq_selected_character');
        navigate(`/join/${token}`);
        return;
      }

      // Refresh the lastActive timestamp on successful resume
      localStorage.setItem('player', JSON.stringify({ ...p, _lastActive: Date.now() }));
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
          // Don't auto-trigger allDone — player must walk to CP4
          setShowTutorial(false);
        } else {
          const completedNums = prog.filter(cp => cp.completed).map(cp => cp.checkpoint_number);
          if (completedNums.length > 0) {
            // Player has completed at least one CP — skip tutorial
            setShowTutorial(false);
            localStorage.setItem('tutorial_seen', '1');
          } else if (localStorage.getItem('tutorial_seen')) {
            // Tutorial already seen, no checkpoint hint on re-entry
          }
        }
      } catch (err) {
        console.error('Failed to restore progress on rejoin:', err);
      }
    };
    init();
  }, [token, navigate]);

  // FIX: Use a ref to always read the latest progress without stale closure issues.
  const progressStateRef = useRef(progress);
  useEffect(() => { progressStateRef.current = progress; }, [progress]);

  const handleCheckpointReached = async (cpId) => {
    // The Phaser scene already checks isUnlocked before calling this.
    // Removing the duplicate check here — it caused false rejections due
    // to stale progress state, keeping CP2/CP3 locked even after completion.
    console.log(`[CP] handleCheckpointReached CP${cpId}`, JSON.stringify(progressStateRef.current));
    // CP4 is special — direct to concluding video modal (leaderboard is shown at CP3)
    if (cpId === 4) {
      setAllDone(true);
      setConcludingVideoWatched(false);
      if (!reduceMotion) {
        playSuccessChime();
        setTimeout(() => { playSuccessChime(); }, 600);
        setShowConfetti(true);
      }
      return;
    }

    const chatConfig = getPlayerChatConfig();
    try {
      await api.post('/game/attempt', { player_id: player.id, checkpoint_number: cpId }, chatConfig);
    } catch (err) {
      console.error('Failed to record checkpoint attempt:', err);
    }
    setCheckpointHint(cpId);
  };

  const handleVideoWatched = () => {
    if (activeCP === 3) {
      setCpStep('activity');
    } else {
      setCpStep('instructions');
    }
  };

  const handleActivityDone = async () => {
    const chatConfig = getPlayerChatConfig();
    const completedCP = activeCP; // capture before any state changes
    try {
      await api.post('/game/complete', { player_id: player.id, checkpoint_number: completedCP }, chatConfig);
      // FIX: Always re-fetch progress immediately after completing a checkpoint.
      // This ensures progressRef in GameCanvas is updated BEFORE the player
      // walks to the next checkpoint, so getIsCheckpointUnlocked returns true.
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

    if (completedCP === 3) {
      // CP3 now shows the "done" card like CP1 and CP2
      setCpStep('done');
    } else {
      setCpStep('done');
    }
  };

  const viewCertificate = async () => {
    if (!player) return;
    setCertificateBusy(true);
    try {
      const res = await api.get(`/game/certificate/${player.id}`, getPlayerChatConfig());
      const cert = res.data.certificate;
      const date = new Date(cert.completed_at);
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const dateStr = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
      const safeName = (cert.nickname || 'student').replace(/[^a-z0-9_-]+/gi, '_');
      const schoolClass = `${cert.school_name || '-'}${cert.class_name ? ` — ${cert.class_name}` : ''}`;
      const displayName = escapeXml(cert.nickname || 'Student');
      const nameLen = (cert.nickname || '').length;
      const nameFontSize = Math.min(72, Math.max(34, Math.floor(1300 / (nameLen * 1.15))));

      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 990">
  <defs>
    <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0f2744"/>
      <stop offset="50%" stop-color="#1e3a5f"/>
      <stop offset="100%" stop-color="#0f2744"/>
    </linearGradient>
    <linearGradient id="goldShine" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#D4A843"/>
      <stop offset="50%" stop-color="#F0D27A"/>
      <stop offset="100%" stop-color="#D4A843"/>
    </linearGradient>
  </defs>
  <rect width="1400" height="990" fill="#faf8f2"/>
  <rect x="30" y="30" width="1340" height="930" rx="6" fill="none" stroke="#1e3a5f" stroke-width="12"/>
  <rect x="55" y="55" width="1290" height="880" rx="4" fill="none" stroke="url(#goldShine)" stroke-width="3"/>
  <g transform="translate(55, 55)"><line x1="0" y1="0" x2="80" y2="0" stroke="#D4A843" stroke-width="5"/><line x1="0" y1="0" x2="0" y2="80" stroke="#D4A843" stroke-width="5"/><line x1="0" y1="0" x2="40" y2="40" stroke="#D4A843" stroke-width="2" opacity="0.5"/></g>
  <g transform="translate(1345, 55)"><line x1="0" y1="0" x2="-80" y2="0" stroke="#D4A843" stroke-width="5"/><line x1="0" y1="0" x2="0" y2="80" stroke="#D4A843" stroke-width="5"/><line x1="0" y1="0" x2="-40" y2="40" stroke="#D4A843" stroke-width="2" opacity="0.5"/></g>
  <g transform="translate(55, 935)"><line x1="0" y1="0" x2="80" y2="0" stroke="#D4A843" stroke-width="5"/><line x1="0" y1="0" x2="0" y2="-80" stroke="#D4A843" stroke-width="5"/><line x1="0" y1="0" x2="40" y2="-40" stroke="#D4A843" stroke-width="2" opacity="0.5"/></g>
  <g transform="translate(1345, 935)"><line x1="0" y1="0" x2="-80" y2="0" stroke="#D4A843" stroke-width="5"/><line x1="0" y1="0" x2="0" y2="-80" stroke="#D4A843" stroke-width="5"/><line x1="0" y1="0" x2="-40" y2="-40" stroke="#D4A843" stroke-width="2" opacity="0.5"/></g>
  <rect x="30" y="200" width="12" height="120" rx="3" fill="#D4A843" opacity="0.7"/>
  <rect x="30" y="670" width="12" height="120" rx="3" fill="#D4A843" opacity="0.7"/>
  <rect x="1358" y="200" width="12" height="120" rx="3" fill="#D4A843" opacity="0.7"/>
  <rect x="1358" y="670" width="12" height="120" rx="3" fill="#D4A843" opacity="0.7"/>
  <rect x="80" y="80" width="1240" height="140" rx="4" fill="url(#headerGrad)"/>
  <rect x="80" y="80" width="1240" height="3" fill="#D4A843"/>
  <rect x="80" y="217" width="1240" height="3" fill="#D4A843"/>
  <text x="700" y="148" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="52" font-weight="bold" fill="#D4A843" letter-spacing="14">KEMBARA GIGI SIHAT</text>
  <text x="700" y="195" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="18" fill="rgba(255,255,255,0.75)" letter-spacing="8">${language === 'bm' ? 'SIJIL PENCAPAIAN' : 'CERTIFICATE OF ACHIEVEMENT'}</text>
  <line x1="400" y1="270" x2="1000" y2="270" stroke="#D4A843" stroke-width="1" opacity="0.5"/>
  <circle cx="700" cy="270" r="4" fill="#D4A843"/><circle cx="400" cy="270" r="2.5" fill="#D4A843"/><circle cx="1000" cy="270" r="2.5" fill="#D4A843"/>
  <text x="700" y="320" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="22" fill="#64748b" font-style="italic">${language === 'bm' ? '~ Sijil ini dengan sukacitanya dianugerahkan kepada ~' : '~ This certificate is proudly presented to ~'}</text>
  <text x="700" y="${330 + nameFontSize}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${nameFontSize}" font-weight="bold" fill="#1e293b">${displayName}</text>
  <line x1="250" y1="${345 + nameFontSize}" x2="1150" y2="${345 + nameFontSize}" stroke="#D4A843" stroke-width="2"/>
  <text x="700" y="490" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#475569">${language === 'bm' ? 'kerana berjaya menyelesaikan' : 'for successfully completing'}</text>
  <text x="700" y="530" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="bold" fill="#1e3a5f">Kembara Gigi Sihat</text>
  <text x="700" y="575" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="17" fill="#64748b" font-style="italic">${language === 'bm' ? 'Permainan Video Interaktif Pendidikan Kesihatan Pergigian' : 'An Interactive Oral Health Education Video Game'}</text>
  <line x1="400" y1="620" x2="1000" y2="620" stroke="#D4A843" stroke-width="1" opacity="0.5"/>
  <circle cx="700" cy="620" r="3" fill="#D4A843"/>
  <text x="700" y="700" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#475569">${language === 'bm' ? 'Sesi' : 'Session'}: ${escapeXml(cert.session_name || '-')}</text>
  <text x="700" y="740" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#475569">${language === 'bm' ? 'Tarikh' : 'Date'}: ${escapeXml(dateStr)}</text>
  <line x1="400" y1="790" x2="1000" y2="790" stroke="#D4A843" stroke-width="1" opacity="0.5"/>
  <circle cx="700" cy="790" r="3" fill="#D4A843"/>
</svg>`;

      const svgForDownload = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="990" viewBox="0 0 1400 990">${svgContent.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}</svg>`;

      // Open in new tab with full-page layout
      const win = window.open('', '_blank');
      if (!win) {
        alert('Please allow pop-ups to view your certificate.');
        return;
      }
      win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Certificate — ${escapeXml(cert.nickname)} | ${language === 'bm' ? 'Kembara Gigi Sihat' : 'Dental Quest'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f172a; min-height: 100vh; display: flex; flex-direction: column; align-items: center; font-family: Arial, sans-serif; }
    .toolbar { width: 100%; background: linear-gradient(135deg, #1e3a5f, #0f2744); padding: 0.85rem 1.5rem; display: flex; align-items: center; justify-content: center; gap: 1rem; flex-shrink: 0; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
    .toolbar h1 { color: #D4A843; font-size: 1.1rem; font-weight: 800; letter-spacing: 0.05em; margin-right: auto; }
    .btn { padding: 0.7rem 1.8rem; border: none; border-radius: 10px; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
    .btn:hover { transform: translateY(-1px); }
    .btn-download { background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff; box-shadow: 0 4px 16px rgba(22,163,74,0.4); }
    .btn-print { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; box-shadow: 0 4px 16px rgba(37,99,235,0.3); }
    .btn-close { background: rgba(255,255,255,0.1); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.2); }
    .cert-wrap { flex: 1; width: 100%; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .cert-wrap svg { width: 100%; max-width: 1100px; height: auto; border-radius: 6px; box-shadow: 0 12px 48px rgba(0,0,0,0.5); }
    @media print {
      .toolbar { display: none !important; }
      body { background: #fff !important; }
      .cert-wrap { padding: 0; }
      .cert-wrap svg { max-width: 100%; box-shadow: none; border-radius: 0; }
    }
    @media (max-width: 768px) {
      .toolbar { flex-wrap: wrap; gap: 0.5rem; }
      .toolbar h1 { width: 100%; text-align: center; margin-right: 0; font-size: 0.95rem; }
      .btn { padding: 0.6rem 1.2rem; font-size: 0.85rem; flex: 1; text-align: center; }
      .cert-wrap { padding: 1rem; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <h1>🎓 ${language === 'bm' ? 'Sijil Kembara Gigi Sihat' : 'Kembara Gigi Sihat Certificate'}</h1>
    <button class="btn btn-download" id="dlBtn">📥 ${language === 'bm' ? 'Muat Turun' : 'Download'}</button>
    <button class="btn btn-print" onclick="window.print()">🖨️ ${language === 'bm' ? 'Cetak' : 'Print'}</button>
    <button class="btn btn-close" onclick="window.location.href='/';">🏠 ${language === 'bm' ? 'Kembali ke Halaman Utama' : 'Back to Home'}</button>
  </div>
  <div class="cert-wrap">
    ${svgContent}
  </div>
  <script>
    document.getElementById('dlBtn').addEventListener('click', function() {
      var svgData = ${JSON.stringify(svgForDownload)};
      var blob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'dental-quest-certificate-${safeName}.svg';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  </script>
</body>
</html>`);
      win.document.close();

      // Clean up player session and redirect main window to Home page
      localStorage.removeItem('player');
      localStorage.removeItem('dq_selected_character');
      localStorage.removeItem('tutorial_seen');
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.error || 'Unable to load certificate. Please try again.');
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
    setActiveCP(null);
    setCpStep('video');
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

  // ─── Real-time kick detection + session heartbeat ──────────────────────────
  // Poll every 5 s while a player is active. If the admin deletes the player
  // the endpoint returns { exists: false } and we boot them back to the join
  // page immediately, clearing any local state so they cannot rejoin silently.
  // FIX: Also refreshes _lastActive timestamp to keep the 5-min session alive.
  useEffect(() => {
    if (!player) return;
    const interval = setInterval(async () => {
      // Keep the session alive by refreshing the timestamp
      try {
        const stored = JSON.parse(localStorage.getItem('player') || '{}');
        if (stored.id === player.id) {
          localStorage.setItem('player', JSON.stringify({ ...stored, _lastActive: Date.now() }));
        }
      } catch { /* ignore */ }

      try {
        const res = await api.get(`/game/player-exists/${player.id}`);
        if (!res.data.exists) {
          clearInterval(interval);
          localStorage.removeItem('player');
          localStorage.removeItem('dq_selected_character');
          navigate(`/join/${token}`);
        }
      } catch {
        // Network blip — keep polling, do not redirect on transient errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [player, token, navigate]);

  const mapTutorialPages = [
    {
      icon: '➡️', title: t('game.step1Title'), desc: t('game.step1Desc'), bg: '#eff6ff', accent: '#2563eb', arrows: [
        { color: '#2563eb', label: t('game.step1Blue') },
        { color: '#7B2FBE', label: t('game.step1Purple') },
        { color: '#dc2626', label: t('game.step1Red') },
      ]
    },
    { icon: '🔢', title: t('game.step2Title'), desc: t('game.step2Desc'), bg: '#f0fdf4', accent: '#16a34a' },
    { icon: '🎬', title: t('game.step3Title'), desc: t('game.step3Desc'), bg: '#eff6ff', accent: '#2563eb' },
    { icon: '✅', title: t('game.step4Title'), desc: t('game.step4Desc'), bg: '#f0fdf4', accent: '#16a34a' },
    { icon: '🔄', title: t('game.step5Title'), desc: t('game.step5Desc'), bg: '#fff7ed', accent: '#ea580c' },
    { icon: '🏆', title: t('game.step6Title'), desc: t('game.step6Desc'), bg: '#fdf4ff', accent: '#7c3aed' },
    {
      icon: '🦷', title: t('game.step7Title'), desc: '', bg: '#f8fafc', accent: '#1e3a5f', checkpoints: [
        { color: '#2563eb', label: t('game.step7Cp1') },
        { color: '#7B2FBE', label: t('game.step7Cp2') },
        { color: '#dc2626', label: t('game.step7Cp3') },
      ]
    },
  ];

  const checkpointHints = {
    1: {
      title: t('game.cpHint1Title'),
      badge: 'Checkpoint 1',
      photo: cp1Photo,
      accent: '#7B2FBE',
      bg: '#ede9fe',
      clue: t('game.cpHint1Clue'),
    },
    2: {
      title: t('game.cpHint2Title'),
      badge: 'Checkpoint 2',
      photo: cp2Photo,
      accent: '#CC3380',
      bg: '#fce7f3',
      clue: t('game.cpHint2Clue'),
    },
    3: {
      title: t('game.cpHint3Title'),
      badge: 'Checkpoint 3',
      photo: cp3Photo,
      accent: '#E85D04',
      bg: '#fff7ed',
      clue: t('game.cpHint3Clue'),
    },
    4: {
      title: t('game.cpHint4Title'),
      badge: '🏆',
      photo: null,
      accent: '#D4A843',
      bg: '#fef9ee',
      heading: t('game.cpHint4Heading'),
      clue: t('game.cpHint4Clue'),
      activity: t('game.cpHint4Activity') || 'Concluding Video',
    },
  };

  useEffect(() => {
    if (!showTutorial || tutorialPage >= mapTutorialPages.length - 1) return;
    const timer = setTimeout(() => {
      setTutorialPage(page => Math.min(page + 1, mapTutorialPages.length - 1));
    }, 10000);
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
          <span style={s.logo}>🦷 {t('join.appTitle')}</span>
          <span style={s.playerBadge} title={player.nickname}>👤 {player.nickname}</span>
        </div>
        <div style={s.headerRight}>
          <LanguageToggle compact style={{ background: 'rgba(255,255,255,0.1)', color: '#FFD700' }} />
          {[1, 2, 3, 4].map(cp => {
            const done = cp <= 3
              ? progress.find(p => p.checkpoint_number === cp)?.completed
              : allDone;
            return (
              <div key={cp} style={{ ...s.cpBadge, background: done ? '#16a34a' : cp === 4 ? '#D4A843' : '#94a3b8' }}>
                {done ? '✓' : cp === 4 ? '🏆' : cp}
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls hint */}
      <div style={s.controls}>
        <span>Tekan: <strong>W A S D</strong> atau <strong>Anak Panah</strong></span>
        <span style={{ marginLeft: '1.5rem' }}>Masuk zon: <strong>Tekan E</strong></span>
      </div>

      {/* Game Canvas */}
      {/* Character selection or game canvas */}
      {!selectedCharacter ? (
        <div style={s.characterSelectWrap}>
          <div style={s.characterSelectCard}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
              🎮
            </div>

            <h2 style={s.characterTitle}>
              Choose Your Character
            </h2>

            <p style={s.characterSubtitle}>
              Select either the boy or girl character before starting the game.
            </p>

            <div style={s.characterOptions}>
              <button
                type="button"
                style={{
                  ...s.characterButton,
                  background: '#e0f2fe',
                  borderColor: '#38bdf8',
                }}
                onClick={() => chooseCharacter('boy')}
              >
                <div style={s.characterEmoji}>👦</div>

                <div
                  style={{
                    ...s.characterName,
                    color: '#075985',
                  }}
                >
                  Boy
                </div>
              </button>

              <button
                type="button"
                style={{
                  ...s.characterButton,
                  background: '#fce7f3',
                  borderColor: '#ec4899',
                }}
                onClick={() => chooseCharacter('girl')}
              >
                <div style={s.characterEmoji}>👧</div>

                <div
                  style={{
                    ...s.characterName,
                    color: '#9d174d',
                  }}
                >
                  Girl
                </div>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={s.canvasWrap}>
          <GameCanvas
            player={player}
            progress={progress}
            onCheckpointReached={handleCheckpointReached}
            paused={isWorldPaused}
            externalGameRef={gameInstanceRef}
            virtualInput={virtualInput}
            enterSignal={enterSignal}
            loadingText={t('game.loadingGame')}
            pressEtoEnterText={t('game.pressEtoEnter')}
            selectedCharacter={selectedCharacter}
          />
        </div>
      )}

      {isMobile && selectedCharacter && (
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
      {selectedCharacter && showTutorial && (() => {
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
              </div>

              {/* ── Card body ── */}
              <div style={{ padding: '1rem 1.5rem 1.2rem' }}>

                {/* Photo slot — only renders when a photo URL is set */}
                {currentPhoto && (
                  <div style={{ width: '100%', height: '160px', borderRadius: '16px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                    <img src={currentPhoto} alt="Step photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}

                {/* Description row — only when desc is non-empty */}
                {page.desc && (
                  <div style={{ background: page.bg, borderRadius: '16px', padding: '1.4rem 1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1.1rem', textAlign: 'left', marginBottom: '1.5rem', border: `1.5px solid ${page.accent || '#e2e8f0'}33` }}>
                    <span style={{ fontSize: '2.5rem', width: '56px', textAlign: 'center', flexShrink: 0, lineHeight: 1, marginTop: '2px' }}>{page.icon}</span>
                    <p style={{ margin: 0, color: '#1e293b', fontSize: '1.2rem', lineHeight: 1.65, fontWeight: 700 }}>{page.desc}</p>
                  </div>
                )}

                {/* Arrow indicators for Step 1 */}
                {page.arrows && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {page.arrows.map((arrow, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#fff', borderRadius: '14px', padding: '0.9rem 1.2rem', border: `2px solid ${arrow.color}33`, boxShadow: `0 2px 8px ${arrow.color}15` }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: arrow.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 900 }}>▶</span>
                        </div>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{arrow.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Checkpoint list for Step 7 */}
                {page.checkpoints && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {page.checkpoints.map((cp, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#fff', borderRadius: '14px', padding: '0.9rem 1.2rem', border: `2px solid ${cp.color}33`, boxShadow: `0 2px 8px ${cp.color}15` }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: cp.color, flexShrink: 0, boxShadow: `0 2px 6px ${cp.color}55` }} />
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>Checkpoint {i + 1}: <span style={{ color: cp.color }}>{cp.label}</span></span>
                      </div>
                    ))}
                  </div>
                )}

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
                    <button style={{ padding: '1rem', background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 6px 20px rgba(22,163,74,0.4)' }} onClick={() => { setShowTutorial(false); localStorage.setItem('tutorial_seen', '1'); }}>🚀 {t('game.playGame')}</button>
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
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.8rem 1.8rem', borderRadius: '20px', background: hint.accent, color: '#fff', fontWeight: 900, fontSize: '1.6rem', marginBottom: '1rem', boxShadow: `0 10px 32px ${hint.accent}55`, position: 'relative' }}>
                  {hint.badge}
                </div>

                <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#1e3a5f', margin: '0 0 0.5rem', lineHeight: 1.2 }}>{hint.title}</h2>
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
                  {hint.heading && <h3 style={{ color: '#1e3a5f', margin: '0 0 0.65rem', fontSize: '1.45rem', fontWeight: 900, lineHeight: 1.3 }}>{hint.heading}</h3>}
                  <p style={{ color: '#334155', margin: 0, fontSize: '1.18rem', lineHeight: 1.7, fontWeight: 600, whiteSpace: 'pre-line' }}>{hint.clue}</p>
                </div>

                <button
                  style={{ width: '100%', padding: '1.1rem', background: `linear-gradient(135deg, ${hint.accent}, ${hint.accent}cc)`, color: '#fff', border: 'none', borderRadius: '16px', fontSize: '1.25rem', fontWeight: 900, cursor: 'pointer', boxShadow: `0 8px 24px ${hint.accent}44`, letterSpacing: '0.01em' }}
                  onClick={() => { const cp = checkpointHint; setCheckpointHint(null); setActiveCP(cp); setCpStep('video'); }}
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

          // Page 1 — Steps overview
          <div key="p1" style={{ ...s.doneCard, maxWidth: '520px', padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '3.5rem' }}>🏁</div>
              <h2 style={{ ...s.doneTitle, fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>{t('game.step1Title')}</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1.25rem 0' }}>
              <div style={tut.row('#eff6ff')}>
                <span style={tut.icon}>➡️</span>
                <div>
                  <strong style={tut.title}>{t('game.step1Title')}</strong>
                  <p style={tut.desc}>{t('game.step1Desc')}</p>
                </div>
              </div>
              <div style={tut.row('#f0fdf4')}>
                <span style={tut.icon}>🔢</span>
                <div>
                  <strong style={tut.title}>{t('game.step2Title')}</strong>
                  <p style={tut.desc}>{t('game.step2Desc')}</p>
                </div>
              </div>
              <div style={tut.row('#eff6ff')}>
                <span style={tut.icon}>🎬</span>
                <div>
                  <strong style={tut.title}>{t('game.step3Title')}</strong>
                  <p style={tut.desc}>{t('game.step3Desc')}</p>
                </div>
              </div>
              <div style={tut.row('#f0fdf4')}>
                <span style={tut.icon}>✅</span>
                <div>
                  <strong style={tut.title}>{t('game.step4Title')}</strong>
                  <p style={tut.desc}>{t('game.step4Desc')}</p>
                </div>
              </div>
              <div style={tut.row('#fff7ed')}>
                <span style={tut.icon}>🔄</span>
                <div>
                  <strong style={tut.title}>{t('game.step5Title')}</strong>
                  <p style={tut.desc}>{t('game.step5Desc')}</p>
                </div>
              </div>
              <div style={tut.row('#fdf4ff')}>
                <span style={tut.icon}>🏆</span>
                <div>
                  <strong style={tut.title}>{t('game.step6Title')}</strong>
                  <p style={tut.desc}>{t('game.step6Desc')}</p>
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
              <h2 style={{ ...s.doneTitle, fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>{t('game.step7Title')}</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1.25rem 0' }}>
              <div style={tut.row('#eff6ff')}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#2563eb', flexShrink: 0, boxShadow: '0 2px 6px #2563eb55' }} />
                <div>
                  <strong style={tut.title}>Checkpoint 1: {t('game.step7Cp1')}</strong>
                </div>
              </div>
              <div style={tut.row('#f3e8ff')}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#7B2FBE', flexShrink: 0, boxShadow: '0 2px 6px #7B2FBE55' }} />
                <div>
                  <strong style={tut.title}>Checkpoint 2: {t('game.step7Cp2')}</strong>
                </div>
              </div>
              <div style={tut.row('#fee2e2')}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#dc2626', flexShrink: 0, boxShadow: '0 2px 6px #dc262655' }} />
                <div>
                  <strong style={tut.title}>Checkpoint 3: {t('game.step7Cp3')}</strong>
                </div>
              </div>
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

      {/* Concluding Video — mandatory watch before congrats screen (same template as Checkpoints 1–3) */}
      {allDone && !concludingVideoWatched && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>
                🎓 {t('game.finishPointTitle')}
              </h2>
            </div>

            <div style={s.steps}>
              {t('game.concludingSteps').map((label, i) => (
                <div key={i} style={{ ...s.step, ...(i === 0 ? s.stepActive : {}) }}>
                  <div style={s.stepDot}>{i + 1}</div>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <div style={s.modalBody}>
              <p style={s.modalHint}>{t('game.modalHintConcluding')}</p>
              <YouTubePlayer
                videoId={CONCLUDING_VIDEO_IDS[language] ?? CONCLUDING_VIDEO_IDS.bm}
                onVideoEnd={() => setConcludingVideoWatched(true)}
                finishVideoText={t('game.finishVideoCertificate')}
                videoDoneText={t('game.videoDoneCertificate')}
              />
            </div>
          </div>
        </div>
      )}



      {/* All Done — Congratulations screen (only after concluding video is watched) */}
      {allDone && concludingVideoWatched && (
        <div style={s.overlay}>
          <div style={s.doneCard}>
            <div style={{ fontSize: '5rem', animation: 'popIn 0.5s ease' }}>🏆</div>
            <h2 style={s.doneTitle}>{t('game.congrats')}</h2>
            <p style={s.doneText}>{t('game.completedAll')}</p>
            <p style={s.doneText}>{t('game.champion')}</p>
            <button
              style={{ ...s.continueBtn, background: '#16a34a', marginTop: '1.5rem' }}
              onClick={viewCertificate}
              disabled={certificateBusy}
            >
              {certificateBusy ? t('game.preparingCertificate') : `🎓 ${t('game.viewCertificate')}`}
            </button>
          </div>
        </div>
      )}

      {/* Full Screen Quiz — CP1 */}
      {showFullQuiz && (
        <div style={s.fullQuiz}>
          <div style={s.fullQuizHeader}>
            <span style={s.fullQuizTitle}>{t('game.checkpoint')} 1 – {t('game.quiz')}</span>
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
        <CP3Game player={player} onComplete={handleActivityDone} onBack={() => { setShowFullCP3(false); setCpStep('instructions'); }} />
      )}

      {/* Full Screen CP3 Final Leaderboard — Overall Leaderboard */}
      {showCP3FinalLeaderboard && (
        <CP3Game player={player} initialShowFinal={true} onComplete={() => setShowCP3FinalLeaderboard(false)} onBack={() => setShowCP3FinalLeaderboard(false)} />
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
              {t('game.steps').map((label, i) => {
                // Step 2 (index 1) shows the checkpoint-specific activity name
                const displayLabel = i === 1
                  ? (activeCP === 1 ? t('game.quiz') : activeCP === 2 ? t('game.crossword') : t('game.foodGame'))
                  : label;
                return (
                  <div key={i} style={{ ...s.step, ...((['video', 'instructions', 'done'][i] === cpStep || (['activity'][0] === cpStep && i === 1)) ? s.stepActive : {}) }}>
                    <div style={s.stepDot}>{i + 1}</div>
                    <span>{displayLabel}</span>
                  </div>
                );
              })}
            </div>

            {cpStep === 'video' && (
              <div style={s.modalBody}>
                <p style={s.modalHint}>{t(`game.modalHintCp${activeCP}`, t('game.modalHint'))}</p>
                <YouTubePlayer
                  videoId={(CHECKPOINT_VIDEO_IDS[language] ?? CHECKPOINT_VIDEO_IDS.bm)[activeCP]}
                  onVideoEnd={handleVideoWatched}
                  finishVideoText={t(`game.finishVideoCp${activeCP}`, t('game.finishVideo'))}
                  videoDoneText={t(`game.videoDoneCp${activeCP}`, t('game.videoDone'))}
                />
              </div>
            )}

            {cpStep === 'instructions' && (
              <div style={s.modalBody}>
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
                    {activeCP === 1 ? '❓' : activeCP === 2 ? '🧩' : '🍎'}
                  </div>
                  <h3 style={{ color: '#1e3a5f', fontSize: '1.3rem', fontWeight: '800', marginBottom: '1.25rem' }}>
                    {activeCP === 1 ? t('game.cp1InstructionsTitle') : activeCP === 2 ? t('game.cp2InstructionsTitle') : t('game.cp3InstructionsTitle')}
                  </h3>
                  <div style={{ textAlign: 'left', background: '#f8fafc', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
                    {(() => {
                      const settingsObj = activeCP === 1 ? quizSettings : activeCP === 2 ? crosswordSettings : null;
                      const minCorrect = settingsObj?.minimum_correct ?? (activeCP === 1 ? 8 : 8);
                      const totalItems = activeCP === 1 ? (settingsObj?.question_count || 10) : (settingsObj?.word_count || 8);
                      const rawInstructions = activeCP === 1 ? t('game.cp1Instructions') : activeCP === 2 ? t('game.cp2Instructions') : t('game.cp3Instructions');
                      const instructions = Array.isArray(rawInstructions) ? rawInstructions : [];
                      return instructions.map((instruction, idx) => {
                        const text = instruction
                          .replace('{count}', totalItems)
                          .replace('{min}', minCorrect);
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: idx < instructions.length - 1 ? '0.75rem' : 0 }}>
                            <span style={{ color: '#2563eb', fontWeight: '800', fontSize: '1rem', lineHeight: '1.5' }}>{idx + 1}.</span>
                            <span style={{ color: '#334155', fontSize: '0.95rem', lineHeight: '1.5' }}>{text}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <button
                    style={{ ...s.continueBtn, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', fontSize: '1.1rem', padding: '1rem 2rem', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    onClick={() => setCpStep('activity')}
                  >
                    🚀 {activeCP === 1 ? t('game.cp1StartBtn') : activeCP === 2 ? t('game.cp2StartBtn') : t('game.cp3StartBtn')}
                  </button>
                </div>
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

            {cpStep === 'done' && (
              <div style={{ ...s.modalBody, textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                <h3 style={{ color: '#16a34a', fontSize: '1.4rem', fontWeight: '800' }}>
                  {t('game.checkpoint')} {activeCP} {t('game.checkpointDone')}
                </h3>
                {activeCP !== 3 && (
                  <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                    {activeCP === 1
                      ? (language === 'bi' ? 'Follow the purple arrows to Checkpoint 2!' : 'Jom ikut anak panah ungu ke Checkpoint 2!')
                      : (language === 'bi' ? 'Follow the red arrows to Checkpoint 3!' : 'Jom ikut anak panah merah ke Checkpoint 3!')}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: activeCP === 3 ? '1.5rem' : 0 }}>
                  {activeCP !== 3 && (
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
                  )}
                  <button
                    style={{ ...s.continueBtn, background: activeCP === 3 ? 'linear-gradient(135deg, #D4A843, #B8922E)' : '#16a34a', flex: 1 }}
                    onClick={() => {
                      handleCloseCPModal();
                      if (activeCP === 3) setShowCP3FinalLeaderboard(true);
                    }}
                  >
                    {activeCP === 3 ? `🏆 ${language === 'bi' ? 'View Overall Leaderboard' : 'Lihat Papan Kedudukan Keseluruhan'}` : `${t('game.continueAdventure')} →`}
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
  characterSelectWrap: { flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', boxSizing: 'border-box', background: '#0f172a', },
  characterSelectCard: { width: '100%', maxWidth: '580px', background: '#ffffff', borderRadius: '24px', padding: '2.5rem', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.35)', },
  characterTitle: { margin: '0 0 0.5rem', color: '#1e3a5f', fontSize: '2rem', fontWeight: '900', },
  characterSubtitle: { margin: '0 0 2rem', color: '#64748b', fontSize: '1rem', lineHeight: 1.5, },
  characterOptions: { display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', },
  characterButton: { width: '190px', padding: '1.5rem', borderRadius: '20px', border: '4px solid', cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease', },
  characterEmoji: { fontSize: '4.5rem', lineHeight: 1, marginBottom: '0.8rem', },
  characterName: { fontSize: '1.25rem', fontWeight: '900', },
};

export default GamePage;