import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import LanguageToggle from '../components/LanguageToggle';

const AdminRegisterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [phase, setPhase] = useState('loading'); // loading | form | done | error
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviteSchool, setInviteSchool] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setPhase('error'); return; }
    api.get(`/admin/verify-invite/${token}`)
      .then(res => { setEmail(res.data.email); setInviteRole(res.data.role || ''); setInviteSchool(res.data.school || ''); setPhase('form'); })
      .catch(err => { setError(err.response?.data?.error || 'Pautan jemputan tidak sah atau telah tamat tempoh'); setPhase('error'); });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError('Kata laluan tidak sepadan!'); return; }
    if (password.length < 6) { setError('Kata laluan mesti sekurang-kurangnya 6 aksara'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/admin/complete-registration', { token, name, password });
      setPhase('done');
    } catch (err) { setError(err.response?.data?.error || 'Pendaftaran gagal'); }
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
            <p style={{color:'#64748b', marginTop:'1rem'}}>Mengesahkan jemputan...</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {phase === 'error' && (
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:'4rem', marginBottom:'1rem'}}>❌</div>
            <h2 style={s.title}>Jemputan Tidak Sah</h2>
            <p style={{color:'#64748b', marginBottom:'1.5rem'}}>{error || 'Pautan jemputan ini tidak sah atau telah tamat tempoh.'}</p>
            <button style={s.btn} onClick={() => navigate('/admin/login')}>Pergi ke Log Masuk</button>
          </div>
        )}

        {phase === 'form' && (
          <>
            <h2 style={s.title}>Sediakan Akaun Anda 🎉</h2>
            <p style={s.subtitle}>Anda telah dijemput untuk menyertai DentalQuest. Lengkapkan profil anda di bawah.</p>
            <div style={s.emailBadge}>📧 {email}</div>
            {inviteRole && (
              <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                <span style={{ background: inviteRole === 'teacher' ? '#fef3c7' : '#ede9fe', color: inviteRole === 'teacher' ? '#92400e' : '#6d28d9', padding: '3px 12px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600' }}>
                  {inviteRole === 'teacher' ? '👩‍🏫 Guru' : '🛡️ Pentadbir'}
                </span>
              </div>
            )}
            {inviteSchool && (
              <div style={{ background: '#f0fdf4', color: '#166534', padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center', marginBottom: '1rem' }}>
                🏫 {inviteSchool}
              </div>
            )}
            {error && <div style={s.error}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={s.field}>
                <label style={s.label}>Nama Penuh Anda</label>
                <input style={s.input} value={name} onChange={e => setName(e.target.value)} required placeholder="cth. Cikgu Ahmad" autoFocus maxLength={80} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Kata Laluan</label>
                <div style={s.passWrap}>
                  <input style={{...s.input, flex:1}} type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 6 aksara" minLength={6} maxLength={128} />
                  <button type="button" style={s.eyeBtn} onClick={() => setShowPass(!showPass)}>{showPass ? '🙈' : '👁️'}</button>
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Sahkan Kata Laluan</label>
                <input style={s.input} type={showPass ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Ulang kata laluan" maxLength={128} />
                {password && confirmPassword && password !== confirmPassword && (
                  <p style={{color:'#e11d48', fontSize:'0.78rem', margin:'0.25rem 0 0'}}>⚠️ Kata laluan tidak sepadan</p>
                )}
              </div>
              <button style={s.btn} type="submit" disabled={loading}>
                {loading ? 'Mencipta Akaun...' : '✅ Cipta Akaun'}
              </button>
            </form>
          </>
        )}

        {phase === 'done' && (
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:'4rem', marginBottom:'1rem'}}>🎉</div>
            <h2 style={s.title}>Akaun Berjaya Dicipta!</h2>
            <p style={{color:'#64748b', marginBottom:'1.5rem'}}>Akaun anda telah berjaya disediakan. Anda boleh log masuk sekarang!</p>
            <button style={s.btn} onClick={() => navigate('/admin/login')}>→ Pergi ke Log Masuk</button>
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
