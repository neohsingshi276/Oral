import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';


const CARD_COLORS = [
  { bg: '#fff7ed', border: '#fed7aa', accent: '#ea580c' },
  { bg: '#f0fdf4', border: '#bbf7d0', accent: '#16a34a' },
  { bg: '#eff6ff', border: '#bfdbfe', accent: '#01306B' },
  { bg: '#fdf4ff', border: '#e9d5ff', accent: '#9333ea' },
  { bg: '#fff1f2', border: '#fecdd3', accent: '#CC0000' },
  { bg: '#FEF9EE', border: '#FDE68A', accent: '#D4A843' },
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
        <p style={styles.loadingText}>Memuatkan fakta menarik... 💡</p>
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
        .search-input:focus { border-color: #D4A843 !important; box-shadow: 0 0 0 3px rgba(212,168,67,0.15); }
      `}</style>

      <Navbar />

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroLeft}>
          <div style={styles.heroBadge}>💡 Tahukah Anda?</div>
          <h1 style={styles.heroTitle}>Fakta Gigi Menarik<br />Yang Anda Tidak Tahu! 🦷</h1>
          <p style={styles.heroText}>
            Bersedialah untuk terkejut! Temui fakta yang sangat menyeronokkan dan mengejutkan tentang gigi, mulut, dan kesihatan mulut. Klik mana-mana kad untuk mendedahkan fakta penuh!
          </p>
          <div style={styles.heroStats}>
            <div style={styles.heroStat}><strong style={{ color: '#FFD700' }}>{facts.length}</strong> fakta menarik</div>
            <div style={styles.heroDot}></div>
            <div style={styles.heroStat}>Klik kad untuk <strong style={{ color: '#FFD700' }}>terbalik!</strong></div>
          </div>
        </div>
        <div style={styles.heroImgWrap}>
          <img
            src={FACT_IMAGES[heroIndex]}
            alt="pergigian"
            style={styles.heroImg}
          />
          <div style={styles.heroBubble1}>🦷</div>
          <div style={styles.heroBubble2}>🌺</div>
          <div style={styles.heroBubble3}>😁</div>
        </div>
      </div>

      {/* Stats Banner */}
      <div style={styles.statsBanner}>
        {[
          { icon: '🦷', value: '32', label: 'Gigi Dewasa' },
          { icon: '🦠', value: '700+', label: 'Jenis Bakteria' },
          { icon: '💧', value: '1 Liter', label: 'Air Liur Sehari' },
          { icon: '⏱️', value: '2 Min', label: 'Masa Memberus' },
          { icon: '📅', value: '2x', label: 'Memberus Sehari' },
          { icon: '🏥', value: '6 Bln', label: 'Lawatan Doktor Gigi' },
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
            placeholder="Cari fakta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button style={styles.clearBtn} onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        <p style={styles.searchHint}>
          {search ? `Dijumpai ${filtered.length} fakta` : `${facts.length} fakta menakjubkan untuk diterokai!`}
        </p>
      </div>

      <p style={styles.flipHint}>👆 Ketik mana-mana kad untuk terbalik dan baca fakta penuh!</p>

      {/* Facts Grid */}
      <div style={styles.grid}>
        {filtered.map((fact, index) => {
          const color = CARD_COLORS[index % CARD_COLORS.length];
          const img = fact.image_url
            ? fact.image_url
            : FACT_IMAGES[index % FACT_IMAGES.length];
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
                    <div style={{ ...styles.cardBadge, background: color.accent }}>💡 Tahukah Anda?</div>
                    <h3 style={{ ...styles.cardTitle, color: color.accent }}>{fact.title}</h3>
                    <div style={styles.cardFlipHint}>
                      <span>Ketik untuk baca lagi</span>
                      <span style={{ marginLeft: '4px' }}>→</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={styles.cardBackFace}>
                  <div style={{ ...styles.cardBadgeBack, background: color.accent }}>💡 Fakta!</div>
                  <h3 style={{ ...styles.cardTitleBack, color: color.accent }}>{fact.title}</h3>
                  <p style={styles.cardContent}>{fact.content}</p>
                  {fact.author && <p style={styles.cardAuthor}>— {fact.author}</p>}
                  <div style={styles.cardFlipHint}>↩ Ketik untuk terbalik semula</div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={styles.empty}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem', animation: 'bounce 1s infinite' }}>🔍</div>
            <p style={{ color: '#64748b', fontSize: '1.2rem', fontWeight: '600' }}>Tiada fakta dijumpai!</p>
            <p style={{ color: '#94a3b8' }}>Cuba istilah carian yang berbeza</p>
          </div>
        )}
      </div>

      {/* Photo Banner */}
      <div style={styles.photoBanner}>
        <h2 style={styles.bannerTitle}>Kekalkan Senyuman Anda Bersinar! 🌺</h2>
        <div style={styles.photoGrid}>
          {[
            { src: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80', label: 'Lawati Doktor Gigi' },
            { src: 'https://images.unsplash.com/photo-1571772996211-2f02c9727629?w=400&q=80', label: 'Memberus Setiap Hari' },
            { src: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&q=80', label: 'Tabiat Sihat' },
            { src: 'https://images.unsplash.com/photo-1588776814546-daab30f310ce?w=400&q=80', label: 'Senyuman Cerah' },
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
        <h2 style={styles.ctaTitle}>Mahu Belajar Lebih Lanjut? 📚</h2>
        <p style={styles.ctaText}>Pergi ke Modul Pembelajaran kami untuk video dan petua!</p>
        <a href="/learning" style={styles.ctaBtn}>Pergi ke Modul Pembelajaran →</a>
      </div>
    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: '#FFF9F0', fontFamily: '"Outfit", sans-serif' },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' },
  loadingSpinner: { width: '48px', height: '48px', border: '4px solid #e2e8f0', borderTop: '4px solid #01306B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadingText: { color: '#64748b', fontSize: '1.1rem' },
  hero: { background: 'linear-gradient(135deg, #FEF9EE 0%, #FFF7ED 50%, #FEF3C7 100%)', padding: '3rem clamp(1rem, 5vw, 4rem)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem', overflow: 'hidden' },
  heroLeft: { maxWidth: '560px', animation: 'slideInLeft 0.7s ease' },
  heroBadge: { display: 'inline-block', background: '#D4A843', color: '#fff', padding: '0.35rem 1.1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '1rem' },
  heroTitle: { fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: '800', color: '#01306B', margin: '0 0 1rem', lineHeight: 1.2 },
  heroText: { fontSize: '1.05rem', color: '#475569', lineHeight: 1.7, margin: '0 0 1.5rem' },
  heroStats: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  heroStat: { color: '#475569', fontSize: '0.95rem' },
  heroDot: { width: '5px', height: '5px', borderRadius: '50%', background: '#D4A843' },
  heroImgWrap: { position: 'relative', width: 'clamp(180px, 40vw, 300px)', height: 'clamp(180px, 40vw, 300px)', flexShrink: 0 },
  heroImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', animation: 'float 3s ease-in-out infinite', transition: 'opacity 0.8s ease', border: '4px solid rgba(212,168,67,0.3)' },
  heroBubble1: { position: 'absolute', top: '10px', right: '-10px', fontSize: '2.5rem', animation: 'bounce 2s infinite' },
  heroBubble2: { position: 'absolute', bottom: '20px', right: '10px', fontSize: '2rem', animation: 'bounce 2.5s infinite 0.5s' },
  heroBubble3: { position: 'absolute', top: '50%', left: '-20px', fontSize: '2rem', animation: 'bounce 2s infinite 1s' },
  statsBanner: { display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1.5rem 2rem', background: '#01306B', flexWrap: 'wrap' },
  statCard: { textAlign: 'center', color: '#fff', minWidth: '90px', padding: '0.5rem', borderRadius: '12px', cursor: 'default', transition: 'transform 0.2s', animation: 'fadeInUp 0.5s ease both' },
  statIcon: { fontSize: '1.6rem', marginBottom: '0.25rem' },
  statValue: { fontSize: '1.4rem', fontWeight: '800', color: '#FFD700' },
  statLabel: { fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.2rem' },
  searchSection: { padding: '2rem clamp(1rem, 5vw, 4rem) 0', maxWidth: '700px', margin: '0 auto' },
  searchWrap: { display: 'flex', alignItems: 'center', background: '#fff', border: '2px solid rgba(212,168,67,0.3)', borderRadius: '50px', padding: '0.5rem 1rem', gap: '0.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  searchIcon: { fontSize: '1.1rem', flexShrink: 0 },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '1rem', background: 'transparent', color: '#01306B' },
  clearBtn: { background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  searchHint: { textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem' },
  flipHint: { textAlign: 'center', color: '#64748b', fontSize: '0.9rem', margin: '1rem 0 0', fontStyle: 'italic' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem', padding: '1.5rem clamp(1rem, 5vw, 4rem) 3rem' },
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
  photoBanner: { background: 'linear-gradient(135deg, #01306B 0%, #1e5aad 100%)', padding: '3rem clamp(1rem, 5vw, 4rem)', textAlign: 'center' },
  bannerTitle: { fontSize: '1.8rem', fontWeight: '800', color: '#FFD700', marginBottom: '2rem' },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', maxWidth: '1000px', margin: '0 auto' },
  photoCard: { position: 'relative', borderRadius: '16px', overflow: 'hidden', aspectRatio: '4/3', cursor: 'pointer' },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' },
  photoOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', padding: '1rem 0.75rem 0.75rem' },
  photoLabel: { color: '#fff', fontWeight: '700', margin: 0, fontSize: '0.9rem' },
  cta: { background: '#012550', padding: '3rem 2rem', textAlign: 'center' },
  ctaTitle: { fontSize: '1.8rem', fontWeight: '800', color: '#FFD700', margin: '0 0 0.75rem' },
  ctaText: { color: 'rgba(255,255,255,0.7)', fontSize: '1rem', margin: '0 0 1.5rem' },
  ctaBtn: { display: 'inline-block', background: '#D4A843', color: '#fff', padding: '0.85rem 2rem', borderRadius: '10px', textDecoration: 'none', fontWeight: '700', fontSize: '1rem' },
};

export default DidYouKnowPage;
