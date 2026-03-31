import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';

const CARD_COLORS = [
  { bg: '#fff7ed', border: '#fed7aa', accent: '#ea580c' },
  { bg: '#f0fdf4', border: '#bbf7d0', accent: '#16a34a' },
  { bg: '#eff6ff', border: '#bfdbfe', accent: '#2563eb' },
  { bg: '#fdf4ff', border: '#e9d5ff', accent: '#9333ea' },
  { bg: '#fff1f2', border: '#fecdd3', accent: '#e11d48' },
  { bg: '#f0fdfa', border: '#99f6e4', accent: '#0d9488' },
];

const FACT_IMAGES = [
  'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&q=80',
  'https://images.unsplash.com/photo-1588776814546-daab30f310ce?w=400&q=80',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80',
  'https://images.unsplash.com/photo-1571772996211-2f02c9727629?w=400&q=80',
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&q=80',
  'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&q=80',
  'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=400&q=80',
  'https://images.unsplash.com/photo-1606265752439-1f18756aa5fc?w=400&q=80',
];

const DidYouKnowPage = () => {
  const [facts, setFacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [flipped, setFlipped] = useState({});
  const [visible, setVisible] = useState({});
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    api.get('/facts')
      .then(res => {
        setFacts(res.data.facts);
        const timer = setTimeout(() => {
          res.data.facts.forEach((f, i) => {
            setTimeout(() => setVisible(prev => ({ ...prev, [f.id]: true })), i * 120);
          });
        }, 100);
        return () => clearTimeout(timer);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % FACT_IMAGES.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const filtered = facts.filter(f =>
    f.title.toLowerCase().includes(search.toLowerCase()) ||
    f.content.toLowerCase().includes(search.toLowerCase())
  );

  const toggleFlip = (id) => setFlipped(prev => ({ ...prev, [id]: !prev[id] }));

  if (loading) return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.loadingWrap}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading fun facts... 💡</p>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        `}</style>
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes bounce {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fact-card:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 12px 32px rgba(0,0,0,0.13) !important; }
        .stat-card:hover { transform: scale(1.08); }
        .search-input:focus { border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
      `}</style>

      <Navbar />

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroLeft}>
          <div style={styles.heroBadge}>💡 Did You Know?</div>
          <h1 style={styles.heroTitle}>Cool Tooth Facts<br />You Never Knew! 🦷</h1>
          <p style={styles.heroText}>
            Get ready to be amazed! Discover super fun and surprising facts about teeth, mouths, and oral health. Click any card to reveal the full fact!
          </p>
          <div style={styles.heroStats}>
            <div style={styles.heroStat}><strong style={{ color: '#f59e0b' }}>{facts.length}</strong> fun facts</div>
            <div style={styles.heroDot}></div>
            <div style={styles.heroStat}>Click cards to <strong style={{ color: '#f59e0b' }}>flip!</strong></div>
          </div>
        </div>
        <div style={styles.heroImgWrap}>
          <img
            src={FACT_IMAGES[heroIndex]}
            alt="dental"
            style={styles.heroImg}
          />
          <div style={styles.heroBubble1}>🦷</div>
          <div style={styles.heroBubble2}>✨</div>
          <div style={styles.heroBubble3}>😁</div>
        </div>
      </div>

      {/* Stats Banner */}
      <div style={styles.statsBanner}>
        {[
          { icon: '🦷', value: '32', label: 'Adult Teeth' },
          { icon: '🦠', value: '700+', label: 'Bacteria Types' },
          { icon: '💧', value: '1 Litre', label: 'Saliva Per Day' },
          { icon: '⏱️', value: '2 Min', label: 'Brush Time' },
          { icon: '📅', value: '2x', label: 'Brush Per Day' },
          { icon: '🏥', value: '6 Mo', label: 'Dentist Visit' },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ ...styles.statCard, animationDelay: `${i * 0.1}s` }}>
            <div style={styles.statIcon}>{s.icon}</div>
            <div style={styles.statValue}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={styles.searchSection}>
        <div style={styles.searchWrap}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            className="search-input"
            style={styles.searchInput}
            placeholder="Search for a fact..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button style={styles.clearBtn} onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        <p style={styles.searchHint}>
          {search ? `Found ${filtered.length} fact${filtered.length !== 1 ? 's' : ''}` : `${facts.length} amazing facts to discover!`}
        </p>
      </div>

      <p style={styles.flipHint}>👆 Tap any card to flip and read the full fact!</p>

      {/* Facts Grid */}
      <div style={styles.grid}>
        {filtered.map((fact, index) => {
          const color = CARD_COLORS[index % CARD_COLORS.length];
          const img = FACT_IMAGES[index % FACT_IMAGES.length];
          const isFlipped = flipped[fact.id];
          const isVisible = visible[fact.id];

          return (
            <div
              key={fact.id}
              className="fact-card"
              style={{
                ...styles.card,
                background: color.bg,
                border: `2px solid ${color.border}`,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
                transition: 'opacity 0.4s ease, transform 0.4s ease, box-shadow 0.2s ease',
              }}
              onClick={() => toggleFlip(fact.id)}
            >
              {!isFlipped ? (
                <div style={styles.cardFront}>
                  <div style={styles.cardImgWrap}>
                    <img
                      src={img}
                      alt={fact.title}
                      style={styles.cardImg}
                      onError={e => { e.target.src = 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&q=80'; }}
                    />
                    <div style={{ ...styles.cardImgOverlay, background: `${color.accent}22` }}></div>
                  </div>
                  <div style={styles.cardBody}>
                    <div style={{ ...styles.cardBadge, background: color.accent }}>💡 Did You Know?</div>
                    <h3 style={{ ...styles.cardTitle, color: color.accent }}>{fact.title}</h3>
                    <div style={styles.cardFlipHint}>
                      <span>Tap to read more</span>
                      <span style={{ marginLeft: '4px' }}>→</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={styles.cardBackFace}>
                  <div style={{ ...styles.cardBadgeBack, background: color.accent }}>💡 Fact!</div>
                  <h3 style={{ ...styles.cardTitleBack, color: color.accent }}>{fact.title}</h3>
                  <p style={styles.cardContent}>{fact.content}</p>
                  {fact.author && <p style={styles.cardAuthor}>— {fact.author}</p>}
                  <div style={styles.cardFlipHint}>↩ Tap to flip back</div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={styles.empty}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem', animation: 'bounce 1s infinite' }}>🔍</div>
            <p style={{ color: '#64748b', fontSize: '1.2rem', fontWeight: '600' }}>No facts found!</p>
            <p style={{ color: '#94a3b8' }}>Try a different search term</p>
          </div>
        )}
      </div>

      {/* Photo Banner */}
      <div style={styles.photoBanner}>
        <h2 style={styles.bannerTitle}>Keep Your Smile Shining! ✨</h2>
        <div style={styles.photoGrid}>
          {[
            { src: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80', label: 'Visit Your Dentist' },
            { src: 'https://images.unsplash.com/photo-1571772996211-2f02c9727629?w=400&q=80', label: 'Brush Every Day' },
            { src: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&q=80', label: 'Healthy Habits' },
            { src: 'https://images.unsplash.com/photo-1588776814546-daab30f310ce?w=400&q=80', label: 'Bright Smile' },
          ].map((item, i) => (
            <div key={i} style={styles.photoCard}>
              <img
                src={item.src}
                alt={item.label}
                style={styles.photoImg}
                onError={e => e.target.style.display = 'none'}
              />
              <div style={styles.photoOverlay}>
                <p style={styles.photoLabel}>{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={styles.cta}>
        <h2 style={styles.ctaTitle}>Want to Learn Even More? 📚</h2>
        <p style={styles.ctaText}>Head over to our Learning Module for videos and tips!</p>
        <a href="/learning" style={styles.ctaBtn}>Go to Learning Module →</a>
      </div>
    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: '#f8fafc', fontFamily: 'sans-serif' },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' },
  loadingSpinner: { width: '48px', height: '48px', border: '4px solid #e2e8f0', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadingText: { color: '#64748b', fontSize: '1.1rem' },
  hero: { background: 'linear-gradient(135deg, #fef9ee 0%, #fff7ed 50%, #fdf4ff 100%)', padding: '3rem 4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem', overflow: 'hidden' },
  heroLeft: { maxWidth: '560px', animation: 'slideInLeft 0.7s ease' },
  heroBadge: { display: 'inline-block', background: '#f59e0b', color: '#fff', padding: '0.35rem 1.1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '1rem' },
  heroTitle: { fontSize: '2.8rem', fontWeight: '800', color: '#1e3a5f', margin: '0 0 1rem', lineHeight: 1.2 },
  heroText: { fontSize: '1.05rem', color: '#475569', lineHeight: 1.7, margin: '0 0 1.5rem' },
  heroStats: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  heroStat: { color: '#475569', fontSize: '0.95rem' },
  heroDot: { width: '5px', height: '5px', borderRadius: '50%', background: '#cbd5e1' },
  heroImgWrap: { position: 'relative', width: '300px', height: '300px', flexShrink: 0 },
  heroImg: { width: '300px', height: '300px', objectFit: 'cover', borderRadius: '50%', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', animation: 'float 3s ease-in-out infinite', transition: 'opacity 0.8s ease' },
  heroBubble1: { position: 'absolute', top: '10px', right: '-10px', fontSize: '2.5rem', animation: 'bounce 2s infinite' },
  heroBubble2: { position: 'absolute', bottom: '20px', right: '10px', fontSize: '2rem', animation: 'bounce 2.5s infinite 0.5s' },
  heroBubble3: { position: 'absolute', top: '50%', left: '-20px', fontSize: '2rem', animation: 'bounce 2s infinite 1s' },
  statsBanner: { display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1.5rem 2rem', background: '#1e3a5f', flexWrap: 'wrap' },
  statCard: { textAlign: 'center', color: '#fff', minWidth: '90px', padding: '0.5rem', borderRadius: '12px', cursor: 'default', transition: 'transform 0.2s', animation: 'fadeInUp 0.5s ease both' },
  statIcon: { fontSize: '1.6rem', marginBottom: '0.25rem' },
  statValue: { fontSize: '1.4rem', fontWeight: '800', color: '#fbbf24' },
  statLabel: { fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' },
  searchSection: { padding: '2rem 4rem 0', maxWidth: '700px', margin: '0 auto' },
  searchWrap: { display: 'flex', alignItems: 'center', background: '#fff', border: '2px solid #e2e8f0', borderRadius: '50px', padding: '0.5rem 1rem', gap: '0.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  searchIcon: { fontSize: '1.1rem', flexShrink: 0 },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '1rem', background: 'transparent', color: '#1e293b' },
  clearBtn: { background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  searchHint: { textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem' },
  flipHint: { textAlign: 'center', color: '#64748b', fontSize: '0.9rem', margin: '1rem 0 0', fontStyle: 'italic' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', padding: '1.5rem 4rem 3rem' },
  card: { borderRadius: '20px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', minHeight: '320px', display: 'flex', flexDirection: 'column' },
  cardFront: { display: 'flex', flexDirection: 'column', flex: 1 },
  cardImgWrap: { position: 'relative', height: '160px', overflow: 'hidden' },
  cardImg: { width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' },
  cardImgOverlay: { position: 'absolute', inset: 0 },
  cardBody: { padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' },
  cardBadge: { display: 'inline-block', color: '#fff', padding: '0.2rem 0.7rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700', marginBottom: '0.6rem', alignSelf: 'flex-start' },
  cardTitle: { fontSize: '1rem', fontWeight: '700', margin: '0 0 auto', lineHeight: 1.4 },
  cardFlipHint: { color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.75rem', display: 'flex', alignItems: 'center' },
  cardBackFace: { padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' },
  cardBadgeBack: { display: 'inline-block', color: '#fff', padding: '0.2rem 0.7rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700', marginBottom: '0.75rem', alignSelf: 'flex-start' },
  cardTitleBack: { fontSize: '1rem', fontWeight: '700', margin: '0 0 0.75rem', lineHeight: 1.4 },
  cardContent: { color: '#475569', fontSize: '0.9rem', lineHeight: 1.7, margin: '0 0 auto', flex: 1 },
  cardAuthor: { color: '#94a3b8', fontSize: '0.78rem', fontStyle: 'italic', margin: '0.75rem 0 0.25rem' },
  empty: { gridColumn: '1/-1', textAlign: 'center', padding: '4rem' },
  photoBanner: { background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)', padding: '3rem 4rem', textAlign: 'center' },
  bannerTitle: { fontSize: '1.8rem', fontWeight: '800', color: '#fff', marginBottom: '2rem' },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', maxWidth: '1000px', margin: '0 auto' },
  photoCard: { position: 'relative', borderRadius: '16px', overflow: 'hidden', aspectRatio: '4/3', cursor: 'pointer' },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' },
  photoOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', padding: '1rem 0.75rem 0.75rem' },
  photoLabel: { color: '#fff', fontWeight: '700', margin: 0, fontSize: '0.9rem' },
  cta: { background: '#0f172a', padding: '3rem 2rem', textAlign: 'center' },
  ctaTitle: { fontSize: '1.8rem', fontWeight: '800', color: '#fff', margin: '0 0 0.75rem' },
  ctaText: { color: '#94a3b8', fontSize: '1rem', margin: '0 0 1.5rem' },
  ctaBtn: { display: 'inline-block', background: '#f59e0b', color: '#fff', padding: '0.85rem 2rem', borderRadius: '10px', textDecoration: 'none', fontWeight: '700', fontSize: '1rem' },
};

export default DidYouKnowPage;
