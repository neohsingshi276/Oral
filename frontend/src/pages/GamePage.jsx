import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GameCanvas from '../game/GameCanvas';
import { CHECKPOINT_VIDEO_IDS } from '../game/gameConfig';
import YouTubePlayer from '../game/YouTubePlayer';
import api from '../services/api';
import QuizGame from '../game/QuizGame';
import CrosswordGame from '../game/CrosswordGame';
import CP3Game from '../game/Trolley';

const GamePage = () => {
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
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('tutorial_seen'));

  // FIX: Validate the player object from localStorage before using it.
  // A missing, malformed, or tampered value used to throw an unhandled error
  // and crash the entire page. Now we redirect cleanly instead.
  useEffect(() => {
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
    fetchProgress(p.id);
  }, [token, navigate]);

  const fetchProgress = async (playerId) => {
    try {
      const res = await api.get(`/game/progress/${playerId}`);
      setProgress(res.data.progress);
      const allCompleted = res.data.progress.every(p => p.completed);
      if (allCompleted && res.data.progress.length === 3) setAllDone(true);
    } catch (err) {
      console.error(err);
    }
  };

  // FIX: Await the attempt API call so failures are caught and logged.
  // Previously fire-and-forget meant failed attempts were silently swallowed.
  const handleCheckpointReached = async (cpId) => {
    try {
      await api.post('/game/attempt', { player_id: player.id, checkpoint_number: cpId });
    } catch (err) {
      console.error('Failed to record checkpoint attempt:', err);
    }
    setActiveCP(cpId);
    setCpStep('video');
  };

  const handleVideoWatched = () => setCpStep('activity');

  const handleActivityDone = async () => {
    await api.post('/game/complete', { player_id: player.id, checkpoint_number: activeCP });
    await fetchProgress(player.id);

    if (activeCP === 3) {
      setActiveCP(null);
      setCpStep('video');
    } else {
      setCpStep('done');
    }
  };

  const handleQuizRetry = () => {
    api.post('/game/attempt', { player_id: player.id, checkpoint_number: activeCP }).catch(console.error);
    setQuizKey(prev => prev + 1);
    setCpStep('activity');
  };

  const handleCloseCPModal = () => {
    setActiveCP(null);
    setCpStep('video');
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    try {
      await api.post('/chat', {
        player_id: player.id,
        session_id: player.session_id,
        sender_type: 'player',
        message: chatInput.trim()
      });
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
    try {
      const res = await api.get(`/chat/${player.id}`);
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
  }, [showChat, player]);

  if (!player) return <div style={s.loading}>Loading game... 🎮</div>;

  const showFullQuiz = activeCP === 1 && cpStep === 'activity';
  const showFullCP3  = activeCP === 3 && cpStep === 'activity';
  const showModal    = activeCP && !showFullQuiz && !showFullCP3;

  return (
    <div style={s.page}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}} @keyframes popIn{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}`}</style>

      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logo}>🦷 Dental Quest</span>
          <span style={s.playerBadge}>👤 {player.nickname}</span>
        </div>
        <div style={s.headerRight}>
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
        <span>🕹️ Move: <strong>WASD</strong> or <strong>Arrow Keys</strong></span>
        <span style={{ marginLeft: '1.5rem' }}>🎯 Enter zone: <strong>Press E</strong></span>
      </div>

      {/* Game Canvas */}
      <div style={s.canvasWrap}>
        <GameCanvas player={player} progress={progress} onCheckpointReached={handleCheckpointReached} />
      </div>

      {/* Tutorial Overlay */}
      {showTutorial && (
        <div style={s.overlay}>
          <div style={{ ...s.doneCard, maxWidth: '500px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🗺️</div>
            <h2 style={{ ...s.doneTitle, fontSize: '1.5rem' }}>Welcome to Dental Quest!</h2>
            <div style={{ textAlign: 'left', margin: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#eff6ff', padding: '1rem', borderRadius: '12px' }}>
                <span style={{ fontSize: '2rem' }}>🕹️</span>
                <div>
                  <strong style={{ color: '#1e3a5f' }}>Move your character</strong>
                  <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>Use <strong>W A S D</strong> or <strong>Arrow Keys</strong></p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f0fdf4', padding: '1rem', borderRadius: '12px' }}>
                <span style={{ fontSize: '2rem' }}>🎯</span>
                <div>
                  <strong style={{ color: '#1e3a5f' }}>Enter checkpoints</strong>
                  <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>Walk to a glowing circle and press <strong>E</strong></p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#fff7ed', padding: '1rem', borderRadius: '12px' }}>
                <span style={{ fontSize: '2rem' }}>📋</span>
                <div>
                  <strong style={{ color: '#1e3a5f' }}>Complete all 3 checkpoints</strong>
                  <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>Watch video → Do activity → Move to next!</p>
                </div>
              </div>
            </div>
            <button
              style={{ ...s.continueBtn, background: '#2563eb' }}
              onClick={() => { setShowTutorial(false); localStorage.setItem('tutorial_seen', '1'); }}
            >
              🚀 Let's Go!
            </button>
          </div>
        </div>
      )}

      {/* All Done — Congratulations screen */}
      {allDone && (
        <div style={s.overlay}>
          <div style={s.doneCard}>
            <div style={{ fontSize: '5rem', animation: 'popIn 0.5s ease' }}>🏆</div>
            <h2 style={s.doneTitle}>Congratulations!</h2>
            <p style={s.doneText}>You completed all 3 checkpoints!</p>
            <p style={s.doneText}>You are a Dental Quest Champion! 🦷⭐</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', margin: '1.5rem 0', background: '#f8fafc', borderRadius: '16px', padding: '1.25rem' }}>
              {[{ label: 'Quiz', cp: 1 }, { label: 'Crossword', cp: 2 }, { label: 'Food Game', cp: 3 }].map(({ label, cp }) => {
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
              onClick={() => { localStorage.removeItem('player'); navigate('/'); }}
            >
              🏠 Back to Home
            </button>
          </div>
        </div>
      )}

      {/* Full Screen Quiz — CP1 */}
      {showFullQuiz && (
        <div style={s.fullQuiz}>
          <div style={s.fullQuizHeader}>
            <span style={s.fullQuizTitle}>🎯 Checkpoint 1 — Quiz</span>
            <span style={s.fullQuizPlayer}>👤 {player.nickname}</span>
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
                {activeCP === 1 ? '🟣' : activeCP === 2 ? '🟤' : '🟠'} Checkpoint {activeCP}
              </h2>
              <button style={s.closeBtn} onClick={handleCloseCPModal}>✕</button>
            </div>

            <div style={s.steps}>
              {['Watch Video', 'Activity', 'Done!'].map((label, i) => (
                <div key={i} style={{ ...s.step, ...((['video', 'activity', 'done'][i] === cpStep) ? s.stepActive : {}) }}>
                  <div style={s.stepDot}>{i + 1}</div>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {cpStep === 'video' && (
              <div style={s.modalBody}>
                <p style={s.modalHint}>🎬 Watch the full video to unlock the next activity!</p>
                <YouTubePlayer videoId={CHECKPOINT_VIDEO_IDS[activeCP]} onVideoEnd={handleVideoWatched} />
              </div>
            )}

            {cpStep === 'activity' && activeCP === 2 && (
              <CrosswordGame
                onComplete={handleActivityDone}
                onRetry={() => { setActiveCP(null); setCpStep('video'); }}
                playerId={player.id}
                sessionId={player.session_id}
              />
            )}

            {cpStep === 'done' && activeCP !== 3 && (
              <div style={{ ...s.modalBody, textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                <h3 style={{ color: '#16a34a', fontSize: '1.4rem', fontWeight: '800' }}>
                  Checkpoint {activeCP} Complete!
                </h3>
                <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                  Great job! Walk to the next checkpoint!
                </p>
                <button style={{ ...s.continueBtn, background: '#16a34a' }} onClick={handleCloseCPModal}>
                  Continue Adventure! 🗺️
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Widget */}
      {showChat && (
        <div style={s.chatBox}>
          <div style={s.chatHeader}>
            <span>💬 Chat with Teacher</span>
            <button style={s.chatClose} onClick={() => setShowChat(false)}>✕</button>
          </div>
          <div style={s.chatMessages}>
            {chatMessages.length === 0 && (
              <p style={s.chatEmpty}>No messages yet. Ask your teacher for help!</p>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} style={{ ...s.chatMsg, ...(m.sender_type === 'player' ? s.chatMsgPlayer : s.chatMsgAdmin) }}>
                <span style={s.chatSender}>{m.sender_type === 'player' ? player.nickname : 'Teacher'}</span>
                <p style={{ ...s.chatText, color: m.sender_type === 'admin' ? '#1e293b' : '#2563eb' }}>{m.message}</p>
              </div>
            ))}
          </div>
          <div style={s.chatInput}>
            <input
              style={s.chatInputField}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask a question..."
              maxLength={200}
              onKeyDown={e => e.key === 'Enter' && sendChat()}
            />
            <button style={s.chatSendBtn} onClick={sendChat}>Send</button>
          </div>
        </div>
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
  page: { minHeight: '100vh', background: '#0f172a', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  loading: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem', background: '#0f172a' },
  header: { width: '100%', background: '#1e3a5f', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  logo: { color: '#FFD700', fontWeight: '800', fontSize: '1.1rem' },
  playerBadge: { background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  cpBadge: { width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '0.82rem' },
  controls: { color: '#94a3b8', fontSize: '0.82rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', width: '100%', textAlign: 'center' },
  canvasWrap: { flex: 1, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '0.5rem', boxSizing: 'border-box' },
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
