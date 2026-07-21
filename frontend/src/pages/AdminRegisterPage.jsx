import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import LanguageToggle from '../components/LanguageToggle';
import { useLanguage } from '../context/LanguageContext';

const AdminRegisterPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
      .catch(err => { setError(err.response?.data?.error || t('register.errInvalidLink')); setPhase('error'); });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError(t('register.errMismatch')); return; }
    if (password.length < 6) { setError(t('register.errMinLength')); return; }
    setLoading(true); setError('');
    try {
      await api.post('/admin/complete-registration', { token, name, password });
      setPhase('done');
    } catch (err) { setError(err.response?.data?.error || t('register.errFailed')); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <LanguageToggle style={s.langToggle} />
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={s.card}>
        <div style={s.logo}>🦷 DentalQuest</div>

        {phase === 'loading' && (
          <div style={{textAlign:'center', padding:'2rem'}}>
            <div style={s.spinner} />
            <p style={{color:'#64748b', marginTop:'1rem'}}>{t('register.verifying')}</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {phase === 'error' && (
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:'4rem', marginBottom:'1rem'}}>❌</div>
            <h2 style={s.title}>{t('register.invalidTitle')}</h2>
            <p style={{color:'#64748b', marginBottom:'1.5rem'}}>{error || t('register.invalidDefault')}</p>
            <button style={s.btn} onClick={() => navigate('/admin/login')}>{t('register.goToLogin')}</button>
          </div>
        )}

        {phase === 'form' && (
          <>
            <h2 style={s.title}>{t('register.setupTitle')}</h2>
            <p style={s.subtitle}>{t('register.setupSubtitle')}</p>
            <div style={s.emailBadge}>📧 {email}</div>
            {error && <div style={s.error}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={s.field}>
                <label style={s.label}>{t('register.fullName')}</label>
                <input style={s.input} value={name} onChange={e => setName(e.target.value)} required placeholder={t('register.namePlaceholder')} autoFocus maxLength={80} />
              </div>
              <div style={s.field}>
                <label style={s.label}>{t('register.password')}</label>
                <div style={s.passWrap}>
                  <input style={{...s.input, flex:1}} type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder={t('register.passwordPlaceholder')} minLength={6} maxLength={128} />
                  <button type="button" style={s.eyeBtn} onClick={() => setShowPass(!showPass)}>{showPass ? '🙈' : '👁️'}</button>
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>{t('register.confirmPassword')}</label>
                <input style={s.input} type={showPass ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder={t('register.confirmPlaceholder')} maxLength={128} />
                {password && confirmPassword && password !== confirmPassword && (
                  <p style={{color:'#e11d48', fontSize:'0.78rem', margin:'0.25rem 0 0'}}>{t('register.passwordMismatch')}</p>
                )}
              </div>
              <button style={s.btn} type="submit" disabled={loading}>
                {loading ? t('register.creating') : t('register.createBtn')}
              </button>
            </form>
          </>
        )}

        {phase === 'done' && (
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:'4rem', marginBottom:'1rem'}}>🎉</div>
            <h2 style={s.title}>{t('register.doneTitle')}</h2>
            <p style={{color:'#64748b', marginBottom:'1.5rem'}}>{t('register.doneSubtitle')}</p>
            <button style={s.btn} onClick={() => navigate('/admin/login')}>→ {t('register.goToLogin')}</button>
          </div>
        )}
      </div>
    </div>
  );
};

const s = {
  page: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #01306B 0%, #1e5aad 100%)', fontFamily:'"Outfit", sans-serif', padding:'1rem' },
  langToggle: { position:'absolute', top:'1rem', right:'1rem', zIndex:2 },
  card: { background:'#fff', borderRadius:'24px', padding:'2.5rem', width:'100%', maxWidth:'420px', boxShadow:'0 20px 60px rgba(0,0,0,0.3)', animation:'fadeIn 0.5s ease' },
  logo: { fontSize:'1.5rem', fontWeight:'800', color:'#01306B', textAlign:'center', marginBottom:'1.5rem' },
  title: { fontSize:'1.5rem', fontWeight:'800', color:'#01306B', margin:'0 0 0.5rem', textAlign:'center' },
  subtitle: { color:'#64748b', fontSize:'0.9rem', margin:'0 0 1rem', textAlign:'center', lineHeight:1.6 },
  emailBadge: { background:'#f0f9ff', color:'#0284c7', padding:'0.5rem 1rem', borderRadius:'8px', fontSize:'0.88rem', fontWeight:'600', textAlign:'center', marginBottom:'1.25rem' },
  error: { background:'#fff1f2', color:'#e11d48', padding:'0.75rem', borderRadius:'10px', marginBottom:'1rem', fontSize:'0.88rem', textAlign:'center' },
  field: { marginBottom:'1rem' },
  label: { display:'block', fontSize:'0.85rem', fontWeight:'600', color:'#475569', marginBottom:'0.4rem' },
  input: { width:'100%', padding:'0.75rem 1rem', border:'2px solid #e2e8f0', borderRadius:'10px', fontSize:'1rem', outline:'none', boxSizing:'border-box' },
  passWrap: { display:'flex', gap:'0.5rem', alignItems:'center' },
  eyeBtn: { background:'#f1f5f9', border:'none', borderRadius:'8px', padding:'0.75rem', cursor:'pointer', fontSize:'1rem', flexShrink:0 },
  btn: { width:'100%', padding:'0.85rem', background:'linear-gradient(135deg, #01306B, #1e5aad)', color:'#fff', border:'none', borderRadius:'10px', fontSize:'1rem', fontWeight:'700', cursor:'pointer', marginTop:'0.5rem' },
  spinner: { width:'36px', height:'36px', border:'4px solid #e2e8f0', borderTop:'4px solid #01306B', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' },
};

export default AdminRegisterPage;
