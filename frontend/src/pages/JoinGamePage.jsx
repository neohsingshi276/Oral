import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import LanguageToggle from '../components/LanguageToggle';
import { useLanguage } from '../context/LanguageContext';

const JoinGamePage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { code: urlCode } = useParams();
  const [code, setCode] = useState(['', '', '', '']);
  const [nickname, setNickname] = useState('');
  const [step, setStep] = useState('code');
  const [session, setSession] = useState(null);
  const [joinedPlayer, setJoinedPlayer] = useState(null);
  const [guidePage, setGuidePage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const guidePages = [
    {
      key: 'move',
      icon: '🎮',
      title: t('game.moveCharacter'),
      subtitle: '1 / 4',
      rows: [{ icon: '🕹️', title: 'Move Around', desc: 'Press W A S D or the Arrow Keys to move your player around the map.', bg: '#eff6ff' }],
      keys: ['W', 'A', 'S', 'D', '↑', '↓', '←', '→'],
    },
    {
      key: 'enter',
      icon: '🚩',
      title: t('game.enterCheckpoint'),
      subtitle: '2 / 4',
      rows: [{ icon: '⌨️', title: 'Enter Checkpoint', desc: 'Stand close to a checkpoint circle, then press E to enter.', bg: '#f0fdf4' }],
      keys: ['E'],
    },
    {
      key: 'chat',
      icon: '💬',
      title: t('game.chatButton'),
      subtitle: '3 / 4',
      rows: [{ icon: '💬', title: 'Chat With Teacher', desc: 'Use the chat button at the bottom-right corner when you need help.', bg: '#fff7ed' }],
    },
    {
      key: 'save',
      icon: '💾',
      title: t('game.autosave'),
      subtitle: '4 / 4',
      rows: [{ icon: '💾', title: 'Progress Save', desc: 'Your map position, checkpoint progress, and score are saved automatically.', bg: '#fdf4ff' }],
    },
  ];

  const currentGuide = guidePages[guidePage];
  const isLastGuidePage = guidePage === guidePages.length - 1;

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

  useEffect(() => {
    if (step !== 'guide' || isLastGuidePage) return;
    const timer = setTimeout(() => {
      setGuidePage(page => Math.min(page + 1, guidePages.length - 1));
    }, 4000);
    return () => clearTimeout(timer);
  }, [step, guidePage, isLastGuidePage]);

  const handleCodeChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    if (error) setError('');
    const newCode = [...code];
    newCode[idx] = val.slice(-1);
    setCode(newCode);
    if (val && idx < 3) document.getElementById(`code-${idx + 1}`)?.focus();
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
      let resumePlayerId = null;
      try {
        const saved = JSON.parse(localStorage.getItem('player'));
        if (saved?.session_id === session.id) resumePlayerId = saved.id;
      } catch {
        // Ignore malformed localStorage.
      }

      localStorage.removeItem('player');
      localStorage.removeItem('tutorial_seen');
      const res = await api.post(`/game/join/${session.unique_token}`, {
        nickname: nickname.trim(),
        resume_player_id: resumePlayerId,
      });
      localStorage.setItem('player', JSON.stringify(res.data.player));
      setJoinedPlayer(res.data.player);
      setGuidePage(0);
      setStep('guide');
    } catch (err) {
      setError(err.response?.data?.error || t('join.joinFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePlayGame = () => {
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
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
        .code-input:focus { border-color: #D4A843 !important; background: #fff !important; box-shadow: 0 0 0 4px rgba(212,168,67,0.15) !important; }
        .join-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(1,48,107,0.4) !important; }
        .shake { animation: shake 0.4s ease; }
        @media (max-width: 640px) {
          .guide-row { flex-direction: column; text-align: center; align-items: center !important; }
          .guide-actions { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={s.bg}>
        <div style={{ ...s.bgShape, width: '300px', height: '300px', top: '-80px', right: '-80px', background: 'rgba(212,168,67,0.08)' }} />
        <div style={{ ...s.bgShape, width: '200px', height: '200px', bottom: '-60px', left: '-60px', background: 'rgba(212,168,67,0.08)' }} />
        <div style={s.bubble1}>🦷</div>
        <div style={s.bubble2}>⭐</div>
        <div style={s.bubble3}>🌺</div>
        <div style={s.bubble4}>🪥</div>
      </div>

      <div style={s.card}>
        <div style={s.accentBar} />

        {step !== 'guide' && (
          <>
            <div style={s.iconWrap}>
              <div style={s.iconBg}>
                <div style={s.icon}>🗺️</div>
              </div>
            </div>
            <h1 style={s.title}>Dental Quest!</h1>
            <p style={s.tagline}>{t('join.tagline')}</p>
          </>
        )}

        {error && <div style={s.error}><span>⚠️</span> {error}</div>}

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
                  <div style={{ ...s.charFill, width: `${(nickname.length / 20) * 100}%` }} />
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
          </>
        )}

        {step === 'guide' && session && joinedPlayer && (
          <>
            <div style={s.sessionFound}>
              <div style={s.sessionFoundIcon}>✅</div>
              <p style={s.sessionFoundText}>{joinedPlayer.nickname}, read this before playing</p>
            </div>

            <div style={s.guideHeader}>
              <div style={s.guideHeroIcon}>{currentGuide.icon}</div>
              <h2 style={s.guideTitle}>{currentGuide.title}</h2>
              <p style={s.guideSubtitle}>{currentGuide.subtitle}</p>
            </div>

            <div style={s.tabGrid}>
              {guidePages.map((page, idx) => (
                <button
                  key={page.key}
                  type="button"
                  style={{
                    ...s.tabBtn,
                    ...(idx === guidePage ? { background: '#16a34a', color: '#fff', borderColor: '#16a34a' } : {}),
                  }}
                  onClick={() => setGuidePage(idx)}
                >
                  <span style={s.tabIcon}>{page.icon}</span>
                  <span>{page.key === 'move' ? 'Move' : page.key === 'enter' ? 'Enter' : page.key === 'chat' ? 'Chat' : 'Save'}</span>
                </button>
              ))}
            </div>

            <div style={s.guideRows}>
              {currentGuide.rows.map((row, idx) => (
                <div key={idx} className="guide-row" style={{ ...s.guideRow, background: row.bg }}>
                  {row.badge ? (
                    <div style={{ ...s.cpBadge, background: row.accent }}>{row.badge}</div>
                  ) : (
                    <span style={s.rowIcon}>{row.icon}</span>
                  )}
                  <div style={s.guidePanelBody}>
                    <h3 style={s.guidePanelTitle}>{row.title}</h3>
                    <p style={s.guidePanelDesc}>{row.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {currentGuide.keys && (
              <div style={s.keyRow}>
                {currentGuide.keys.map(key => <kbd key={key} style={s.keyCap}>{key}</kbd>)}
              </div>
            )}

            {currentGuide.note && <div style={s.scoreNote}>🏆 {currentGuide.note}</div>}

            <div style={s.dots}>
              {guidePages.map((page, idx) => (
                <button
                  key={page.key}
                  type="button"
                  aria-label={`Go to page ${idx + 1}`}
                  style={{ ...s.dot, background: idx === guidePage ? '#2563eb' : '#cbd5e1', width: idx === guidePage ? '24px' : '10px' }}
                  onClick={() => setGuidePage(idx)}
                />
              ))}
            </div>

            {!isLastGuidePage ? (
              <>
                <div style={s.guideNav}>
                  <button
                    style={{ ...s.homeBtn, opacity: guidePage === 0 ? 0.45 : 1 }}
                    type="button"
                    onClick={() => setGuidePage(page => Math.max(page - 1, 0))}
                    disabled={guidePage === 0}
                  >
                    ← Back
                  </button>
                  <button
                    className="join-btn"
                    style={s.nextBtn}
                    type="button"
                    onClick={() => setGuidePage(page => Math.min(page + 1, guidePages.length - 1))}
                  >
                    Next →
                  </button>
                </div>
                <div style={s.autoText}>Auto next in 3 seconds</div>
              </>
            ) : (
              <div className="guide-actions" style={s.finalActions}>
                <button style={s.homeBtn} type="button" onClick={handleBackHome}>Back Home</button>
                <button className="join-btn" style={s.playBtn} type="button" onClick={handlePlayGame}>Play the Game</button>
              </div>
            )}
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
  card: { background: 'rgba(255,255,255,0.98)', borderRadius: '24px', padding: '2.3rem', width: '100%', maxWidth: '660px', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', animation: 'fadeIn 0.6s ease', position: 'relative', zIndex: 1, overflow: 'hidden', maxHeight: '94vh', overflowY: 'auto' },
  accentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #01306B, #D4A843, #CC0000, #D4A843, #01306B)' },
  iconWrap: { marginBottom: '0.75rem' },
  iconBg: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, #FFF9F0, #FEF3C7)', border: '2px solid rgba(212,168,67,0.3)' },
  icon: { fontSize: '3rem', animation: 'float 3s ease-in-out infinite', display: 'block' },
  title: { fontSize: '2.2rem', fontWeight: '900', color: '#01306B', margin: '0 0 0.25rem' },
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
  sessionFound: { background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: '14px', padding: '0.85rem', marginBottom: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', border: '1px solid #bbf7d0' },
  sessionFoundIcon: { fontSize: '1.2rem' },
  sessionFoundText: { color: '#15803d', fontSize: '1rem', margin: 0, fontWeight: '700' },
  tips: { background: '#FAFAF5', borderRadius: '16px', padding: '1.25rem', textAlign: 'left', marginTop: '1rem', border: '1px solid rgba(212,168,67,0.2)' },
  tipIcon: { fontSize: '1.5rem', marginBottom: '0.5rem' },
  tipText: { color: '#64748b', fontSize: '0.9rem', margin: '0.3rem 0', lineHeight: 1.6 },
  guideHeader: { textAlign: 'center', marginBottom: '1rem' },
  guideHeroIcon: { fontSize: '3.7rem', lineHeight: 1, marginBottom: '0.6rem' },
  guideTitle: { color: '#01306B', fontSize: '2rem', fontWeight: '900', margin: '0.25rem 0' },
  guideSubtitle: { color: '#64748b', fontSize: '1.08rem', margin: 0, fontWeight: '600' },
  tabGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.65rem', marginBottom: '1rem' },
  tabBtn: { minHeight: '78px', border: '2px solid #111827', borderRadius: '14px', background: '#fff', color: '#01306B', cursor: 'pointer', fontSize: '1rem', fontWeight: '900', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', transition: 'all 0.2s' },
  tabIcon: { fontSize: '1.65rem', lineHeight: 1 },
  guideRows: { display: 'flex', flexDirection: 'column', gap: '0.85rem', margin: '1.2rem 0' },
  guideRow: { display: 'flex', alignItems: 'center', gap: '1.2rem', borderRadius: '14px', padding: '1.15rem 1.35rem', textAlign: 'left' },
  rowIcon: { fontSize: '2.1rem', width: '52px', flexShrink: 0, textAlign: 'center' },
  cpBadge: { color: '#fff', fontWeight: '900', fontSize: '1rem', padding: '0.45rem 0.75rem', borderRadius: '9px', flexShrink: 0, minWidth: '54px', textAlign: 'center' },
  guidePanelBody: { flex: 1 },
  guidePanelTitle: { margin: '0 0 0.35rem', color: '#01306B', fontSize: '1.25rem', fontWeight: '900' },
  guidePanelDesc: { margin: 0, color: '#334155', fontSize: '1.05rem', lineHeight: 1.55, fontWeight: '600' },
  keyRow: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.45rem', margin: '0.95rem 0 1rem' },
  keyCap: { background: '#1e293b', color: '#FFD700', border: '1px solid #334155', borderRadius: '8px', padding: '0.38rem 0.58rem', fontSize: '1rem', fontFamily: 'monospace', fontWeight: '900', minWidth: '36px', textAlign: 'center' },
  scoreNote: { background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '0.95rem 1rem', color: '#15803d', fontSize: '1.05rem', fontWeight: '700', marginBottom: '1rem' },
  dots: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.45rem', margin: '0.5rem 0 1rem' },
  dot: { height: '10px', borderRadius: '999px', border: 'none', cursor: 'pointer', transition: 'all 0.2s' },
  guideNav: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' },
  finalActions: { display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '0.75rem' },
  homeBtn: { padding: '1rem', background: '#64748b', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1.08rem', fontWeight: '850', cursor: 'pointer' },
  firstBtn: { padding: '1rem', background: '#01306B', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1.08rem', fontWeight: '850', cursor: 'pointer' },
  nextBtn: { padding: '1rem', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1.08rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 8px 20px rgba(37,99,235,0.3)' },
  playBtn: { padding: '1rem', background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1.08rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 8px 20px rgba(22,163,74,0.3)' },
  autoText: { marginTop: '0.75rem', color: '#64748b', fontSize: '0.92rem', fontWeight: '700' },
};

export default JoinGamePage;
