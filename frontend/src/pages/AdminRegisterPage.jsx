import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const AdminRegisterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [phase, setPhase] = useState('loading'); // loading | form | done | error
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setPhase('error'); return; }
    api.get(`/admin/verify-invite/${token}`)
      .then(res => { setEmail(res.data.email); setPhase('form'); })
      .catch(err => { setError(err.response?.data?.error || 'Invalid or expired invitation link'); setPhase('error'); });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError('Passwords do not match!'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/admin/complete-registration', { token, name, password });
      setPhase('done');
    } catch (err) { setError(err.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={s.card}>
        <div style={s.logo}>🦷 DentalQuest</div>

        {phase === 'loading' && (
          <div style={{textAlign:'center', padding:'2rem'}}>
            <div style={s.spinner} />
            <p style={{color:'#64748b', marginTop:'1rem'}}>Verifying invitation...</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {phase === 'error' && (
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:'4rem', marginBottom:'1rem'}}>❌</div>
            <h2 style={s.title}>Invalid Invitation</h2>
            <p style={{color:'#64748b', marginBottom:'1.5rem'}}>{error || 'This invitation link is invalid or has expired.'}</p>
            <button style={s.btn} onClick={() => navigate('/admin/login')}>Go to Login</button>
          </div>
        )}

        {phase === 'form' && (
          <>
            <h2 style={s.title}>Set Up Your Account 🎉</h2>
            <p style={s.subtitle}>You've been invited to join DentalQuest as an Admin. Complete your profile below.</p>
            <div style={s.emailBadge}>📧 {email}</div>
            {error && <div style={s.error}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={s.field}>
                <label style={s.label}>Your Full Name</label>
                <input style={s.input} value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Teacher Ahmad" autoFocus maxLength={80} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Password</label>
                <div style={s.passWrap}>
                  <input style={{...s.input, flex:1}} type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 6 characters" minLength={6} maxLength={128} />
                  <button type="button" style={s.eyeBtn} onClick={() => setShowPass(!showPass)}>{showPass ? '🙈' : '👁️'}</button>
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Confirm Password</label>
                <input style={s.input} type={showPass ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Repeat password" maxLength={128} />
                {password && confirmPassword && password !== confirmPassword && (
                  <p style={{color:'#e11d48', fontSize:'0.78rem', margin:'0.25rem 0 0'}}>⚠️ Passwords do not match</p>
                )}
              </div>
              <button style={s.btn} type="submit" disabled={loading}>
                {loading ? 'Creating Account...' : '✅ Create Account'}
              </button>
            </form>
          </>
        )}

        {phase === 'done' && (
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:'4rem', marginBottom:'1rem'}}>🎉</div>
            <h2 style={s.title}>Account Created!</h2>
            <p style={{color:'#64748b', marginBottom:'1.5rem'}}>Your admin account has been set up successfully. You can now login!</p>
            <button style={s.btn} onClick={() => navigate('/admin/login')}>→ Go to Login</button>
          </div>
        )}
      </div>
    </div>
  );
};

const s = {
  page: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', fontFamily:'sans-serif', padding:'1rem' },
  card: { background:'#fff', borderRadius:'24px', padding:'2.5rem', width:'100%', maxWidth:'420px', boxShadow:'0 20px 60px rgba(0,0,0,0.3)', animation:'fadeIn 0.5s ease' },
  logo: { fontSize:'1.5rem', fontWeight:'800', color:'#1e3a5f', textAlign:'center', marginBottom:'1.5rem' },
  title: { fontSize:'1.5rem', fontWeight:'800', color:'#1e3a5f', margin:'0 0 0.5rem', textAlign:'center' },
  subtitle: { color:'#64748b', fontSize:'0.9rem', margin:'0 0 1rem', textAlign:'center', lineHeight:1.6 },
  emailBadge: { background:'#f0f9ff', color:'#0284c7', padding:'0.5rem 1rem', borderRadius:'8px', fontSize:'0.88rem', fontWeight:'600', textAlign:'center', marginBottom:'1.25rem' },
  error: { background:'#fff1f2', color:'#e11d48', padding:'0.75rem', borderRadius:'10px', marginBottom:'1rem', fontSize:'0.88rem', textAlign:'center' },
  field: { marginBottom:'1rem' },
  label: { display:'block', fontSize:'0.85rem', fontWeight:'600', color:'#475569', marginBottom:'0.4rem' },
  input: { width:'100%', padding:'0.75rem 1rem', border:'2px solid #e2e8f0', borderRadius:'10px', fontSize:'1rem', outline:'none', boxSizing:'border-box' },
  passWrap: { display:'flex', gap:'0.5rem', alignItems:'center' },
  eyeBtn: { background:'#f1f5f9', border:'none', borderRadius:'8px', padding:'0.75rem', cursor:'pointer', fontSize:'1rem', flexShrink:0 },
  btn: { width:'100%', padding:'0.85rem', background:'linear-gradient(135deg, #2563eb, #1d4ed8)', color:'#fff', border:'none', borderRadius:'10px', fontSize:'1rem', fontWeight:'700', cursor:'pointer', marginTop:'0.5rem' },
  spinner: { width:'36px', height:'36px', border:'4px solid #e2e8f0', borderTop:'4px solid #2563eb', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' },
};

export default AdminRegisterPage;
