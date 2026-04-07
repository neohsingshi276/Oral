import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div style={s.page}>
      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes wiggle { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-5deg); } 75% { transform: rotate(5deg); } }
        .home-btn:hover { transform: translateY(-3px) !important; box-shadow: 0 12px 30px rgba(59,130,246,0.4) !important; }
      `}</style>

      <div style={s.card}>
        <div style={s.emojis}>
          <span style={{ fontSize: '2rem', animation: 'float 3s ease-in-out infinite' }}>🦷</span>
          <span style={{ fontSize: '5rem', animation: 'wiggle 2s ease-in-out infinite' }}>😬</span>
          <span style={{ fontSize: '2rem', animation: 'float 3s ease-in-out infinite 0.5s' }}>🦷</span>
        </div>

        <h1 style={s.code}>404</h1>
        <h2 style={s.title}>Oops! Page Not Found</h2>
        <p style={s.text}>
          This page seems to have fallen out like a baby tooth! 🪥
          <br />
          Let's get you back on track.
        </p>

        <div style={s.funFact}>
          <span style={{ fontWeight: '700', color: '#f59e0b' }}>💡 Did You Know?</span>
          <br />
          Humans only get two sets of teeth in their lifetime — baby teeth and adult teeth. Take care of them!
        </div>

        <Link to="/" className="home-btn" style={s.btn}>
          🏠 Go Back Home
        </Link>
        <Link to="/learning" style={s.secondaryBtn}>
          📚 Go to Learning
        </Link>
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
    background: 'linear-gradient(135deg, #fef9ee 0%, #fff7ed 50%, #fdf4ff 100%)',
    padding: '1rem',
  },
  card: {
    background: 'white',
    borderRadius: '28px',
    padding: '3rem 2.5rem',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
    animation: 'fadeIn 0.6s ease',
  },
  emojis: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  code: {
    fontSize: '6rem',
    fontWeight: '900',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '0',
    lineHeight: 1,
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0.5rem 0 1rem',
  },
  text: {
    color: '#64748b',
    fontSize: '1.05rem',
    lineHeight: 1.6,
    margin: '0 0 1.5rem',
  },
  funFact: {
    background: '#fef9ee',
    border: '1px solid #fed7aa',
    borderRadius: '16px',
    padding: '1rem 1.25rem',
    fontSize: '0.9rem',
    color: '#475569',
    lineHeight: 1.6,
    marginBottom: '2rem',
    textAlign: 'left',
  },
  btn: {
    display: 'block',
    width: '100%',
    padding: '1rem',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    fontSize: '1.1rem',
    fontWeight: '700',
    textDecoration: 'none',
    textAlign: 'center',
    boxShadow: '0 8px 20px rgba(59,130,246,0.3)',
    transition: 'all 0.2s',
    marginBottom: '0.75rem',
    boxSizing: 'border-box',
  },
  secondaryBtn: {
    display: 'block',
    width: '100%',
    padding: '0.85rem',
    background: 'transparent',
    color: '#3b82f6',
    border: '2px solid #e2e8f0',
    borderRadius: '14px',
    fontSize: '1rem',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
  },
};

export default NotFoundPage;
