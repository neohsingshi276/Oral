import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

const JoinGamePage = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState(['', '', '', '']);
  const [nickname, setNickname] = useState('');
  const [step, setStep] = useState('code');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { code: urlCode } = useParams();

  useEffect(() => {
    if (urlCode && urlCode.length === 4) {
      setCode(urlCode.split(''));
      api.get(`/sessions/validate/${urlCode}`)
        .then(res => {
          setSession(res.data.session);
          setStep('nickname');
        })
        .catch(() => setError('Invalid code! Please try again.'));
    }
  }, [urlCode]);

  const handleCodeChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
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
    if (fullCode.length !== 4) return setError('Please enter the full 4-digit code!');
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/sessions/validate/${fullCode}`);
      setSession(res.data.session);
      setStep('nickname');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code! Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNicknameSubmit = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return setError('Please enter a nickname!');
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/game/join/${session.unique_token}`, { nickname: nickname.trim() });
      localStorage.setItem('player', JSON.stringify(res.data.player));
      navigate(`/game/${session.unique_token}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join. Please try again!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        .code-input:focus { border-color: #3b82f6 !important; background: #fff !important; box-shadow: 0 0 0 4px rgba(59,130,246,0.15) !important; }
        .join-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(59,130,246,0.4) !important; }
      `}</style>

      {/* Background decorations */}
      <div style={s.bg}>
        <div style={{ ...s.bgShape, width: '300px', height: '300px', top: '-80px', right: '-80px', background: 'rgba(59,130,246,0.08)' }}></div>
        <div style={{ ...s.bgShape, width: '200px', height: '200px', bottom: '-60px', left: '-60px', background: 'rgba(245,158,11,0.08)' }}></div>
        <div style={s.bubble1}>🦷</div>
        <div style={s.bubble2}>⭐</div>
        <div style={s.bubble3}>🌟</div>
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
        <p style={s.tagline}>Your dental adventure awaits</p>

        {error && <div style={s.error}><span>⚠️</span> {error}</div>}

        {/* Step 1: Enter Code */}
        {step === 'code' && (
          <>
            <div style={s.stepBadge}>
              <span style={s.stepNum}>1</span>
              <span>Enter Game Code</span>
            </div>
            <p style={s.subtitle}>Enter the 4-digit code from your teacher</p>
            <form onSubmit={handleCodeSubmit}>
              <div style={s.codeRow}>
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`code-${idx}`}
                    className="code-input"
                    style={s.codeInput}
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
                {loading ? '🔍 Checking...' : '🔍 Check Code'}
              </button>
            </form>
            <div style={s.tips}>
              <div style={s.tipIcon}>💡</div>
              <p style={s.tipText}>Ask your teacher for the 4-digit game code to join!</p>
            </div>
          </>
        )}

        {/* Step 2: Enter Nickname */}
        {step === 'nickname' && session && (
          <>
            <div style={s.sessionFound}>
              <div style={s.sessionFoundIcon}>✅</div>
              <p style={s.sessionFoundText}>Joined: <strong>{session.session_name}</strong></p>
            </div>

            <div style={s.stepBadge}>
              <span style={s.stepNum}>2</span>
              <span>Pick a Nickname</span>
            </div>
            <p style={s.subtitle}>Now enter your nickname to start!</p>
            <form onSubmit={handleNicknameSubmit}>
              <input
                style={s.input}
                type="text"
                placeholder="e.g. SuperBrusher 🦷"
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
                {loading ? '🚀 Joining...' : '🚀 Start Adventure!'}
              </button>
              <button style={s.backBtn} type="button" onClick={() => { setStep('code'); setError(''); }}>
                ← Change Code
              </button>
            </form>
            <div style={s.tips}>
              <p style={s.tipTitle}>🎮 How to play:</p>
              <p style={s.tipText}>Use <strong>W A S D</strong> or <strong>Arrow Keys</strong> to move</p>
              <p style={s.tipText}>Walk to each checkpoint and press <strong>E</strong> to enter!</p>
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#2563eb', fontWeight: '600' }}>🔄 Accidentally closed? Don't worry — your progress is saved automatically!</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)', padding: '1rem', position: 'relative', overflow: 'hidden' },
  bg: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  bgShape: { position: 'absolute', borderRadius: '50%' },
  bubble1: { position: 'absolute', top: '10%', left: '8%', fontSize: '3rem', animation: 'float 3s ease-in-out infinite', opacity: 0.3 },
  bubble2: { position: 'absolute', top: '20%', right: '10%', fontSize: '2.5rem', animation: 'float 2.5s ease-in-out infinite 0.5s', opacity: 0.3 },
  bubble3: { position: 'absolute', bottom: '20%', left: '12%', fontSize: '2rem', animation: 'float 2s ease-in-out infinite 1s', opacity: 0.3 },
  bubble4: { position: 'absolute', bottom: '15%', right: '8%', fontSize: '3rem', animation: 'float 3.5s ease-in-out infinite 0.3s', opacity: 0.3 },
  card: { background: 'rgba(255,255,255,0.97)', borderRadius: '28px', padding: '2.5rem', width: '100%', maxWidth: '440px', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', animation: 'fadeIn 0.6s ease', position: 'relative', zIndex: 1, overflow: 'hidden' },
  accentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #f59e0b)', borderRadius: '28px 28px 0 0' },
  iconWrap: { marginBottom: '0.75rem' },
  iconBg: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '2px solid #bfdbfe' },
  icon: { fontSize: '3rem', animation: 'float 3s ease-in-out infinite', display: 'block' },
  title: { fontSize: '2.2rem', fontWeight: '900', color: '#0f172a', margin: '0 0 0.25rem', letterSpacing: '-0.02em' },
  tagline: { color: '#94a3b8', fontSize: '0.95rem', fontWeight: '500', margin: '0 0 1.5rem' },
  stepBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#eff6ff', color: '#2563eb', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.75rem', border: '1px solid #bfdbfe' },
  stepNum: { width: '22px', height: '22px', borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: '1rem', margin: '0 0 1.5rem', lineHeight: 1.5, fontWeight: '500' },
  error: { background: 'linear-gradient(135deg, #fff1f2, #fee2e2)', color: '#e11d48', padding: '0.85rem', borderRadius: '14px', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', border: '1px solid #fecdd3' },
  codeRow: { display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1.5rem' },
  codeInput: { width: '68px', height: '78px', textAlign: 'center', fontSize: '2.2rem', fontWeight: '900', borderRadius: '18px', border: '3px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', outline: 'none', transition: 'all 0.2s' },
  input: { width: '100%', padding: '1rem 1.2rem', borderRadius: '14px', border: '2px solid #e2e8f0', fontSize: '1.1rem', outline: 'none', boxSizing: 'border-box', textAlign: 'center', fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem', background: '#f8fafc', transition: 'all 0.2s' },
  charCount: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' },
  charBar: { flex: 1, height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' },
  charFill: { height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '2px', transition: 'width 0.2s' },
  charText: { color: '#94a3b8', fontSize: '0.78rem', fontWeight: '600', minWidth: '40px', textAlign: 'right' },
  btn: { width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer', marginBottom: '0.75rem', boxShadow: '0 8px 20px rgba(59,130,246,0.3)', transition: 'all 0.2s' },
  backBtn: { width: '100%', padding: '0.75rem', background: 'transparent', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: '14px', fontSize: '0.95rem', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' },
  sessionFound: { background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: '14px', padding: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', border: '1px solid #bbf7d0' },
  sessionFoundIcon: { fontSize: '1.2rem' },
  sessionFoundText: { color: '#15803d', fontSize: '0.95rem', margin: 0, fontWeight: '600' },
  tips: { background: '#f8fafc', borderRadius: '16px', padding: '1.25rem', textAlign: 'left', marginTop: '1rem', border: '1px solid #e2e8f0' },
  tipIcon: { fontSize: '1.5rem', marginBottom: '0.5rem' },
  tipTitle: { fontWeight: '700', color: '#0f172a', margin: '0 0 0.5rem', fontSize: '0.95rem' },
  tipText: { color: '#64748b', fontSize: '0.9rem', margin: '0.3rem 0', lineHeight: 1.6 },
};

export default JoinGamePage;
