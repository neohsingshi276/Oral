import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // email | otp | reset | done
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setStep('otp');
    } catch (err) { setError(err.response?.data?.error || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  const handleOTPChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[idx] = val.slice(-1);
    setOtp(newOtp);
    if (val && idx < 3) document.getElementById(`otp-${idx + 1}`)?.focus();
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const otpStr = otp.join('');
    if (otpStr.length !== 4) { setError('Please enter the full 4-digit OTP'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/verify-otp', { email, otp: otpStr });
      setResetToken(res.data.resetToken);
      setStep('reset');
    } catch (err) { setError(err.response?.data?.error || 'Invalid OTP'); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError('Passwords do not match!'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/reset-password', { resetToken, newPassword });
      setStep('done');
    } catch (err) { setError(err.response?.data?.error || 'Failed to reset password'); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={s.card}>
        <div style={s.logo}>🦷 DentalQuest</div>

        {error && <div style={s.error}>{error}</div>}

        {/* Step 1: Enter Email */}
        {step === 'email' && (
          <>
            <h2 style={s.title}>Forgot Password? 🔑</h2>
            <p style={s.subtitle}>Enter your admin email and we'll send you a 4-digit OTP to reset your password.</p>
            <form onSubmit={handleSendOTP}>
              <div style={s.field}>
                <label style={s.label}>Admin Email</label>
                <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@example.com" autoFocus />
              </div>
              <button style={s.btn} type="submit" disabled={loading}>
                {loading ? 'Sending...' : '📧 Send OTP'}
              </button>
            </form>
            <div style={s.backLink}>
              <Link to="/admin/login" style={s.link}>← Back to Login</Link>
            </div>
          </>
        )}

        {/* Step 2: Enter OTP */}
        {step === 'otp' && (
          <>
            <h2 style={s.title}>Enter OTP 📬</h2>
            <p style={s.subtitle}>We sent a 4-digit OTP to <strong>{email}</strong>. Check your inbox!</p>
            <form onSubmit={handleVerifyOTP}>
              <div style={s.otpRow}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    style={s.otpInput}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOTPChange(idx, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Backspace' && !otp[idx] && idx > 0) document.getElementById(`otp-${idx - 1}`)?.focus(); }}
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
              <button style={s.btn} type="submit" disabled={loading || otp.join('').length !== 4}>
                {loading ? 'Verifying...' : '✅ Verify OTP'}
              </button>
            </form>
            <div style={s.backLink}>
              <button style={s.linkBtn} onClick={() => { setStep('email'); setOtp(['','','','']); setError(''); }}>
                ← Resend OTP
              </button>
            </div>
          </>
        )}

        {/* Step 3: Reset Password */}
        {step === 'reset' && (
          <>
            <h2 style={s.title}>Reset Password 🔒</h2>
            <p style={s.subtitle}>Enter your new password below.</p>
            <form onSubmit={handleResetPassword}>
              <div style={s.field}>
                <label style={s.label}>New Password</label>
                <div style={s.passWrap}>
                  <input style={{...s.input, flex:1}} type={showPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="Min 6 characters" minLength={6} />
                  <button type="button" style={s.eyeBtn} onClick={() => setShowPass(!showPass)}>{showPass ? '🙈' : '👁️'}</button>
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Confirm New Password</label>
                <input style={s.input} type={showPass ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Repeat new password" />
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p style={{color:'#e11d48', fontSize:'0.78rem', margin:'0.25rem 0 0'}}>⚠️ Passwords do not match</p>
                )}
              </div>
              <button style={s.btn} type="submit" disabled={loading}>
                {loading ? 'Resetting...' : '🔒 Reset Password'}
              </button>
            </form>
          </>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:'4rem', marginBottom:'1rem'}}>🎉</div>
            <h2 style={s.title}>Password Reset!</h2>
            <p style={s.subtitle}>Your password has been reset successfully. You can now login with your new password.</p>
            <button style={s.btn} onClick={() => navigate('/admin/login')}>
              → Go to Login
            </button>
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
  subtitle: { color:'#64748b', fontSize:'0.9rem', margin:'0 0 1.5rem', textAlign:'center', lineHeight:1.6 },
  error: { background:'#fff1f2', color:'#e11d48', padding:'0.75rem', borderRadius:'10px', marginBottom:'1rem', fontSize:'0.88rem', textAlign:'center' },
  field: { marginBottom:'1rem' },
  label: { display:'block', fontSize:'0.85rem', fontWeight:'600', color:'#475569', marginBottom:'0.4rem' },
  input: { width:'100%', padding:'0.75rem 1rem', border:'2px solid #e2e8f0', borderRadius:'10px', fontSize:'1rem', outline:'none', boxSizing:'border-box' },
  passWrap: { display:'flex', gap:'0.5rem', alignItems:'center' },
  eyeBtn: { background:'#f1f5f9', border:'none', borderRadius:'8px', padding:'0.75rem', cursor:'pointer', fontSize:'1rem', flexShrink:0 },
  btn: { width:'100%', padding:'0.85rem', background:'linear-gradient(135deg, #2563eb, #1d4ed8)', color:'#fff', border:'none', borderRadius:'10px', fontSize:'1rem', fontWeight:'700', cursor:'pointer', marginTop:'0.5rem' },
  otpRow: { display:'flex', gap:'0.75rem', justifyContent:'center', marginBottom:'1.5rem' },
  otpInput: { width:'64px', height:'72px', textAlign:'center', fontSize:'2rem', fontWeight:'900', borderRadius:'12px', border:'2px solid #e2e8f0', background:'#f8fafc', color:'#1e3a5f', outline:'none' },
  backLink: { textAlign:'center', marginTop:'1rem' },
  link: { color:'#2563eb', textDecoration:'none', fontSize:'0.88rem', fontWeight:'600' },
  linkBtn: { background:'none', border:'none', color:'#2563eb', fontSize:'0.88rem', fontWeight:'600', cursor:'pointer' },
};

export default ForgotPasswordPage;
