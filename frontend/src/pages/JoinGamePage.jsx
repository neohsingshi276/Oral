import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import LanguageToggle from '../components/LanguageToggle';
import { useLanguage } from '../context/LanguageContext';

const JoinGamePage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [code, setCode] = useState(['', '', '', '']);
  const [nickname, setNickname] = useState('');
  const [step, setStep] = useState('code');
  const [session, setSession] = useState(null);
  const [joinedPlayer, setJoinedPlayer] = useState(null);
  const [guideTab, setGuideTab] = useState('move');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { code: urlCode } = useParams();

  const guideTabs = [
    {
      key: 'move',
      label: 'Move',
      icon: '🎮',
      title: t('game.moveCharacter'),
      desc: `${t('join.movementTip')}.`,
      detail: 'Use W A S D or Arrow Keys to walk around the map and find each checkpoint.',
      color: '#eff6ff',
      accent: '#2563eb',
    },
    {
      key: 'enter',
      label: 'Enter',
      icon: '🚩',
      title: t('game.enterCheckpoint'),
      desc: 'Stand near a checkpoint and press E to enter.',
      detail: 'Complete checkpoints in order. Watch the video first, then finish the activity.',
      color: '#f0fdf4',
      accent: '#16a34a',
    },
    {
      key: 'chat',
      label: 'Chat',
      icon: '💬',
      title: t('game.chatButton'),
      desc: t('game.chatButtonDesc'),
      detail: 'Your teacher can reply while you are playing, so ask when you need help.',
      color: '#fff7ed',
      accent: '#f97316',
    },
    {
      key: 'save',
      label: 'Save',
      icon: '💾',
      title: t('game.autosave'),
      desc: t('game.autosaveDesc'),
      detail: 'Your position and checkpoint progress are saved automatically when you play.',
      color: '#fdf4ff',
      accent: '#a855f7',
    },
  ];

  useEffect(() => {
    if (urlCode && urlCode.length === 4) {
      setCode(urlCode.split(''));
      api.get(`/sessions/validate/${urlCode}`)
        .then(res => {
          setSession(res.data.session);
          setStep('nickname');
        })
        .catch(() => setError(t('join.invalidCode')));
    }
  }, [urlCode]);

  const handleCodeChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    if (error) setError(''); // clear error as soon as user re-types
    const newCode = [...code];
    newCode[idx] = val.slice(-1);
    setCode(newCode);
    if (val && idx < 3) {
      document.getElementById(`code-${idx + 1}`)?.focus();
    }
  };

  const handleCodeKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      document.getElementById(`code-${idx - 1}`)?.focus();
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 4) return setError(t('join.fullCode'));
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/sessions/validate/${fullCode}`);
      setSession(res.data.session);
      setStep('nickname');
    } catch (err) {
      setError(err.response?.data?.error || t('join.invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleNicknameSubmit = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return setError(t('join.nicknameRequired'));
    setLoading(true);
    setError('');
    try {
      // Check if this browser already has a player for this session — if so,
      // pass their ID so the backend can resume their progress. We do NOT clear
      // localStorage yet; the backend decides whether to resume or create fresh.
      let resumePlayerId = null;
      try {
        const saved = JSON.parse(localStorage.getItem('player'));
        if (saved?.session_id === session.id) {
          resumePlayerId = saved.id;
        }
      } catch { /* ignore malformed localStorage */ }

      localStorage.removeItem('player');
      localStorage.removeItem('tutorial_seen');
      const res = await api.post(`/game/join/${session.unique_token}`, {
        nickname: nickname.trim(),
        resume_player_id: resumePlayerId,
      });
      localStorage.setItem('player', JSON.stringify(res.data.player));
      setJoinedPlayer(res.data.player);
      setStep('guide');
      setGuideTab('move');
    } catch (err) {
      setError(err.response?.data?.error || t('join.joinFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePlayGame = () => {
    localStorage.setItem('tutorial_seen', '1');
    navigate(`/game/${session.unique_token}`);
  };

  const handleBackHome = () => {
    localStorage.removeItem('player');
    localStorage.removeItem('tutorial_seen');
    navigate('/');
  };

  return (
    <div style={s.page}>
      <LanguageToggle style={s.langToggle} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        .code-input:focus { border-color: #D4A843 !important; background: #fff !important; box-shadow: 0 0 0 4px rgba(212,168,67,0.15) !important; }
        .join-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(1,48,107,0.4) !important; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
        .shake { animation: shake 0.4s ease; }
      `}</style>

      {/* Background decorations */}
      <div style={s.bg}>
        <div style={{ ...s.bgShape, width: '300px', height: '300px', top: '-80px', right: '-80px', background: 'rgba(212,168,67,0.08)' }}></div>
        <div style={{ ...s.bgShape, width: '200px', height: '200px', bottom: '-60px', left: '-60px', background: 'rgba(212,168,67,0.08)' }}></div>
        <div style={s.bubble1}>🦷</div>
        <div style={s.bubble2}>⭐</div>
        <div style={s.bubble3}>🌺</div>
        <div style={s.bubble4}>🪥</div>
      </div>

      <div style={s.card}>
        {/* Top accent bar */}
        <div style={s.accentBar}></div>

        <div style={s.iconWrap}>
          <div style={s.iconBg}>
            <div style={s.icon}>🗺️</div>
          </div>
        </div>
        <h1 style={s.title}>Dental Quest!</h1>
        <p style={s.tagline}>{t('join.tagline')}</p>

        {error && <div style={s.error}><span>⚠️</span> {error}</div>}

        {/* Step 1: Enter Code */}
        {step === 'code' && (
          <>
            <div style={s.stepBadge}>
              <span style={s.stepNum}>1</span>
              <span>{t('join.stepCode')}</span>
            </div>
            <p style={s.subtitle}>{t('join.codeSubtitle')}</p>
            <form onSubmit={handleCodeSubmit}>
              <div style={s.codeRow} className={error ? 'shake' : ''}>
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`code-${idx}`}
                    className="code-input"
                    style={{ ...s.codeInput, ...(error ? { borderColor: '#e11d48', background: '#fff1f2' } : {}) }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleCodeChange(idx, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(idx, e)}
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
              <button className="join-btn" style={s.btn} type="submit" disabled={loading || code.join('').length !== 4}>
                {loading ? `🔍 ${t('join.checking')}` : `🔍 ${t('join.checkCode')}`}
              </button>
            </form>
            <div style={s.tips}>
              <div style={s.tipIcon}>💡</div>
              <p style={s.tipText}>{t('join.codeTip')}</p>
            </div>
          </>
        )}

        {/* Step 2: Enter Nickname */}
        {step === 'nickname' && session && (
          <>
            <div style={s.sessionFound}>
              <div style={s.sessionFoundIcon}>✅</div>
              <p style={s.sessionFoundText}>{t('join.success')} <strong>{session.session_name}</strong></p>
            </div>

            <div style={s.stepBadge}>
              <span style={s.stepNum}>2</span>
              <span>{t('join.stepNickname')}</span>
            </div>
            <p style={s.subtitle}>{t('join.nicknameSubtitle')}</p>
            <form onSubmit={handleNicknameSubmit}>
              <input
                style={s.input}
                type="text"
                placeholder={`${t('join.nicknamePlaceholder')} 🦷`}
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                maxLength={20}
                autoFocus
              />
              <div style={s.charCount}>
                <div style={s.charBar}>
                  <div style={{ ...s.charFill, width: `${(nickname.length / 20) * 100}%` }}></div>
                </div>
                <span style={s.charText}>{nickname.length}/20</span>
              </div>
              <button className="join-btn" style={s.btn} type="submit" disabled={loading}>
                {loading ? `🚀 ${t('join.joining')}` : `🚀 ${t('join.startAdventure')}`}
              </button>
              <button style={s.backBtn} type="button" onClick={() => { setStep('code'); setError(''); }}>
                ← {t('join.changeCode')}
              </button>
            </form>
            <div style={s.tips}>
              <p style={s.tipTitle}>🎮 {t('join.howToPlay')}</p>
              <p style={s.tipText}>{t('join.movementTip')}</p>
              <p style={s.tipText}>{t('join.checkpointTip')}</p>
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#FEF9EE', borderRadius: '10px', border: '1px solid rgba(212,168,67,0.3)' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#B45309', fontWeight: '600' }}>🔄 {t('join.resumeTip')}</p>
              </div>
            </div>
          </>
        )}

        {step === 'guide' && session && joinedPlayer && (
          <>
            <div style={s.sessionFound}>
              <div style={s.sessionFoundIcon}>✅</div>
              <p style={s.sessionFoundText}>
                {joinedPlayer.nickname}, read this before playing
              </p>
            </div>

            <h2 style={s.guideTitle}>How To Play</h2>
            <p style={s.guideSubtitle}>Choose each tab to learn the controls.</p>

            <div style={s.tabGrid}>
              {guideTabs.map(tab => {
                const active = guideTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    style={{
                      ...s.tabBtn,
                      ...(active ? { background: tab.accent, color: '#fff', borderColor: tab.accent } : {}),
                    }}
                    onClick={() => setGuideTab(tab.key)}
                  >
                    <span style={s.tabIcon}>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {guideTabs.filter(tab => tab.key === guideTab).map(tab => (
              <div key={tab.key} style={{ ...s.guidePanel, background: tab.color, borderColor: tab.accent }}>
                <div style={{ ...s.guidePanelIcon, background: tab.accent }}>{tab.icon}</div>
                <div style={s.guidePanelBody}>
                  <h3 style={s.guidePanelTitle}>{tab.title}</h3>
                  <p style={s.guidePanelDesc}>{tab.desc}</p>
                  <p style={s.guidePanelDetail}>{tab.detail}</p>
                  {tab.key === 'move' && (
                    <div style={s.keyRow}>
                      {['W', 'A', 'S', 'D', '↑', '↓', '←', '→'].map(key => (
                        <kbd key={key} style={s.keyCap}>{key}</kbd>
                      ))}
                    </div>
                  )}
                  {tab.key === 'enter' && (
                    <div style={s.keyRow}>
                      <kbd style={s.keyCap}>E</kbd>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div style={s.guideActions}>
              <button style={s.homeBtn} type="button" onClick={handleBackHome}>
                Back to Home
              </button>
              <button className="join-btn" style={s.playBtn} type="button" onClick={handlePlayGame}>
                Play the Game
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #01306B 0%, #012550 50%, #1e5aad 100%)', padding: '1rem', position: 'relative', overflow: 'hidden', fontFamily: '"Outfit", sans-serif' },
  langToggle: { position: 'absolute', top: '1rem', right: '1rem', zIndex: 2 },
  bg: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  bgShape: { position: 'absolute', borderRadius: '50%' },
  bubble1: { position: 'absolute', top: '10%', left: '8%', fontSize: '3rem', animation: 'float 3s ease-in-out infinite', opacity: 0.3 },
  bubble2: { position: 'absolute', top: '20%', right: '10%', fontSize: '2.5rem', animation: 'float 2.5s ease-in-out infinite 0.5s', opacity: 0.3 },
  bubble3: { position: 'absolute', bottom: '20%', left: '12%', fontSize: '2rem', animation: 'float 2s ease-in-out infinite 1s', opacity: 0.3 },
  bubble4: { position: 'absolute', bottom: '15%', right: '8%', fontSize: '3rem', animation: 'float 3.5s ease-in-out infinite 0.3s', opacity: 0.3 },
  card: { background: 'rgba(255,255,255,0.97)', borderRadius: '28px', padding: '2.5rem', width: '100%', maxWidth: '620px', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', animation: 'fadeIn 0.6s ease', position: 'relative', zIndex: 1, overflow: 'hidden' },
  accentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #01306B, #D4A843, #CC0000, #D4A843, #01306B)', borderRadius: '28px 28px 0 0' },
  iconWrap: { marginBottom: '0.75rem' },
  iconBg: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, #FFF9F0, #FEF3C7)', border: '2px solid rgba(212,168,67,0.3)' },
  icon: { fontSize: '3rem', animation: 'float 3s ease-in-out infinite', display: 'block' },
  title: { fontSize: '2.2rem', fontWeight: '900', color: '#01306B', margin: '0 0 0.25rem', letterSpacing: '-0.02em' },
  tagline: { color: '#D4A843', fontSize: '0.95rem', fontWeight: '600', margin: '0 0 1.5rem' },
  stepBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#FEF9EE', color: '#01306B', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.75rem', border: '1px solid rgba(212,168,67,0.3)' },
  stepNum: { width: '22px', height: '22px', borderRadius: '50%', background: '#01306B', color: '#FFD700', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: '1rem', margin: '0 0 1.5rem', lineHeight: 1.5, fontWeight: '500' },
  error: { background: 'linear-gradient(135deg, #fff1f2, #fee2e2)', color: '#e11d48', padding: '0.85rem', borderRadius: '14px', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', border: '1px solid #fecdd3' },
  codeRow: { display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1.5rem' },
  codeInput: { width: '68px', height: '78px', textAlign: 'center', fontSize: '2.2rem', fontWeight: '900', borderRadius: '18px', border: '3px solid #e2e8f0', background: '#FAFAF5', color: '#01306B', outline: 'none', transition: 'all 0.2s' },
  input: { width: '100%', padding: '1rem 1.2rem', borderRadius: '14px', border: '2px solid #e2e8f0', fontSize: '1.1rem', outline: 'none', boxSizing: 'border-box', textAlign: 'center', fontWeight: '600', color: '#01306B', marginBottom: '0.5rem', background: '#FAFAF5', transition: 'all 0.2s' },
  charCount: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' },
  charBar: { flex: 1, height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' },
  charFill: { height: '100%', background: 'linear-gradient(90deg, #01306B, #D4A843)', borderRadius: '2px', transition: 'width 0.2s' },
  charText: { color: '#94a3b8', fontSize: '0.78rem', fontWeight: '600', minWidth: '40px', textAlign: 'right' },
  btn: { width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #01306B, #1e5aad)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer', marginBottom: '0.75rem', boxShadow: '0 8px 20px rgba(1,48,107,0.3)', transition: 'all 0.2s' },
  backBtn: { width: '100%', padding: '0.75rem', background: 'transparent', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: '14px', fontSize: '0.95rem', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' },
  sessionFound: { background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: '14px', padding: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', border: '1px solid #bbf7d0' },
  sessionFoundIcon: { fontSize: '1.2rem' },
  sessionFoundText: { color: '#15803d', fontSize: '0.95rem', margin: 0, fontWeight: '600' },
  tips: { background: '#FAFAF5', borderRadius: '16px', padding: '1.25rem', textAlign: 'left', marginTop: '1rem', border: '1px solid rgba(212,168,67,0.2)' },
  tipIcon: { fontSize: '1.5rem', marginBottom: '0.5rem' },
  tipTitle: { fontWeight: '700', color: '#01306B', margin: '0 0 0.5rem', fontSize: '0.95rem' },
  tipText: { color: '#64748b', fontSize: '0.9rem', margin: '0.3rem 0', lineHeight: 1.6 },
  guideTitle: { color: '#01306B', fontSize: '2rem', fontWeight: '900', margin: '0.25rem 0' },
  guideSubtitle: { color: '#64748b', fontSize: '1.15rem', margin: '0 0 1.25rem', fontWeight: '600' },
  tabGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.65rem', marginBottom: '1rem' },
  tabBtn: { minHeight: '78px', border: '2px solid #e2e8f0', borderRadius: '14px', background: '#fff', color: '#01306B', cursor: 'pointer', fontSize: '1rem', fontWeight: '850', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', transition: 'all 0.2s' },
  tabIcon: { fontSize: '1.65rem', lineHeight: 1 },
  guidePanel: { display: 'flex', alignItems: 'flex-start', gap: '1.1rem', border: '2px solid', borderRadius: '18px', padding: '1.35rem', textAlign: 'left', marginBottom: '1.1rem' },
  guidePanelIcon: { width: '58px', height: '58px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '2rem', flexShrink: 0 },
  guidePanelBody: { flex: 1 },
  guidePanelTitle: { margin: '0 0 0.45rem', color: '#01306B', fontSize: '1.45rem', fontWeight: '900' },
  guidePanelDesc: { margin: '0 0 0.45rem', color: '#1e3a5f', fontSize: '1.12rem', lineHeight: 1.55, fontWeight: '700' },
  guidePanelDetail: { margin: 0, color: '#475569', fontSize: '1.02rem', lineHeight: 1.6, fontWeight: '500' },
  keyRow: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.85rem' },
  keyCap: { background: '#1e293b', color: '#FFD700', border: '1px solid #334155', borderRadius: '8px', padding: '0.35rem 0.55rem', fontSize: '1rem', fontFamily: 'monospace', fontWeight: '900', minWidth: '34px', textAlign: 'center' },
  guideActions: { display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '0.75rem' },
  homeBtn: { padding: '1rem', background: '#64748b', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: '800', cursor: 'pointer' },
  playBtn: { padding: '1rem', background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 8px 20px rgba(22,163,74,0.3)' },
};

export default JoinGamePage;
