import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const AdminLoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.admin);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Log masuk gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .login-input:focus { border-color: #D4A843 !important; box-shadow: 0 0 0 4px rgba(212,168,67,0.15) !important; }
        .login-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(1,48,107,0.4) !important; }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .forgot-link:hover { color: #D4A843 !important; }
      `}</style>

      {/* Floating background elements */}
      <div style={s.bgElements}>
        <div style={{ ...s.bgDot, top: '10%', left: '8%', fontSize: '3rem', animationDelay: '0s' }}>🦷</div>
        <div style={{ ...s.bgDot, top: '25%', right: '12%', fontSize: '2rem', animationDelay: '0.5s' }}>🌺</div>
        <div style={{ ...s.bgDot, bottom: '20%', left: '15%', fontSize: '2.5rem', animationDelay: '1s' }}>😁</div>
        <div style={{ ...s.bgDot, bottom: '30%', right: '8%', fontSize: '2rem', animationDelay: '1.5s' }}>🪥</div>
        <div style={{ ...s.bgDot, top: '50%', left: '5%', fontSize: '1.5rem', animationDelay: '2s' }}>💧</div>
      </div>

      <div style={s.card}>
        {/* Top accent bar */}
        <div style={s.accentBar}></div>

        {/* Logo section */}
        <div style={s.logoSection}>
          <div style={s.logoIcon}>🦷</div>
          <h1 style={s.title}>DentalQuest</h1>
          <p style={s.subtitle}>Portal Pentadbir & Guru</p>
        </div>

        {/* Divider */}
        <div style={s.divider}>
          <div style={s.dividerLine}></div>
          <span style={s.dividerText}>Log masuk untuk meneruskan</span>
          <div style={s.dividerLine}></div>
        </div>

        {error && (
          <div style={s.error}>
            <span style={{ marginRight: '0.5rem' }}>⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={s.field}>
            <label style={s.label}>
              <span style={s.labelIcon}>📧</span>
              Alamat E-mel
            </label>
            <input
              className="login-input"
              style={s.input}
              type="email"
              name="email"
              placeholder="guru@gmail.com"
              value={form.email}
              onChange={handleChange}
              required
              maxLength={120}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>
              <span style={s.labelIcon}>🔒</span>
              Kata Laluan
            </label>
            <div style={s.passwordWrap}>
              <input
                className="login-input"
                style={{ ...s.input, paddingRight: '3rem' }}
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                maxLength={128}
              />
              <button
                type="button"
                style={s.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button className="login-btn" style={s.button} type="submit" disabled={loading}>
            {loading ? (
              <span style={s.loadingWrap}>
                <span style={s.loadingDot}></span>
                Sedang log masuk...
              </span>
            ) : (
              '🚀 Log Masuk'
            )}
          </button>

          <div style={s.footer}>
            <Link to="/admin/forgot-password" className="forgot-link" style={s.forgotLink}>
              Lupa Kata Laluan?
            </Link>
          </div>
        </form>

        {/* Bottom decoration */}
        <div style={s.bottomDeco}>
          <span>🌺</span>
          <span style={s.bottomText}>Platform Pendidikan Kesihatan Pergigian</span>
          <span>🌺</span>
        </div>
      </div>
    </div>
  );
};

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #01306B 0%, #012550 50%, #1e5aad 100%)',
    padding: '1rem',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: '"Outfit", sans-serif',
  },
  bgElements: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  bgDot: { position: 'absolute', animation: 'float 4s ease-in-out infinite', opacity: 0.3 },
  card: {
    background: 'rgba(255, 255, 255, 0.97)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    padding: '2.5rem',
    borderRadius: '24px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
    width: '100%',
    maxWidth: '440px',
    animation: 'fadeIn 0.6s ease',
    position: 'relative',
    zIndex: 1,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, #01306B, #D4A843, #CC0000, #D4A843, #01306B)',
    borderRadius: '24px 24px 0 0',
  },
  logoSection: { textAlign: 'center', marginBottom: '1.5rem' },
  logoIcon: {
    fontSize: '3.5rem',
    marginBottom: '0.5rem',
    animation: 'float 3s ease-in-out infinite',
    display: 'inline-block',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#01306B',
    margin: '0 0 0.25rem',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: '#D4A843',
    margin: 0,
    fontSize: '1rem',
    fontWeight: '600',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    margin: '1.5rem 0',
  },
  dividerLine: { flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, #D4A843, transparent)' },
  dividerText: { color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500', whiteSpace: 'nowrap' },
  error: {
    background: 'linear-gradient(135deg, #fff1f2, #fee2e2)',
    color: '#dc2626',
    padding: '0.85rem 1rem',
    borderRadius: '12px',
    marginBottom: '1.25rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    border: '1px solid #fecdd3',
    display: 'flex',
    alignItems: 'center',
  },
  field: { marginBottom: '1.25rem' },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    marginBottom: '0.5rem',
    fontWeight: '600',
    color: '#01306B',
    fontSize: '0.9rem',
  },
  labelIcon: { fontSize: '1rem' },
  input: {
    width: '100%',
    padding: '0.85rem 1.2rem',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s',
    background: '#FAFAF5',
    color: '#01306B',
    fontWeight: '500',
  },
  passwordWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.1rem',
    padding: '4px',
  },
  button: {
    width: '100%',
    padding: '0.95rem',
    marginTop: '0.5rem',
    background: 'linear-gradient(135deg, #01306B, #1e5aad)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 8px 20px rgba(1,48,107,0.3)',
  },
  loadingWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' },
  loadingDot: {
    width: '16px',
    height: '16px',
    border: '3px solid rgba(255,255,255,0.3)',
    borderTop: '3px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  footer: { textAlign: 'center', marginTop: '1.25rem' },
  forgotLink: {
    color: '#01306B',
    fontSize: '0.9rem',
    textDecoration: 'none',
    fontWeight: '600',
    transition: 'color 0.2s',
  },
  bottomDeco: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid rgba(212,168,67,0.3)',
  },
  bottomText: {
    color: '#94a3b8',
    fontSize: '0.8rem',
    fontWeight: '500',
  },
};

export default AdminLoginPage;
