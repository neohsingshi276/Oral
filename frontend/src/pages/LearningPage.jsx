import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const LearningPage = () => {
  const { t } = useLanguage();
  const [videos, setVideos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/videos')
      .then(res => {
        setVideos(res.data.videos);
        if (res.data.videos.length > 0) setSelected(res.data.videos[0]);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const getEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('/embed/')) return url;
    if (url.includes('/shorts/')) {
      const videoId = url.split('/shorts/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    const videoId = url.split('v=')[1]?.split('&')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  if (loading) return (
    <div style={styles.page}><Navbar /><div style={styles.loading}>{t('learning.loading')} 🦷</div></div>
  );

  return (
    <div style={styles.page}>
      <Navbar />

      {/* Hero Banner */}
      <div style={styles.hero}>
        <div style={styles.heroLeft}>
          <div style={styles.heroBadge}>📚 {t('learning.heroBadge')}</div>
          <h1 style={styles.heroTitle}>{t('learning.heroTitleTop')}<br />{t('learning.heroTitleBottom')} 🦷</h1>
          <p style={styles.heroText}>{t('learning.heroText')}</p>
        </div>
        <div style={styles.heroEmojis}>
          <span style={{ fontSize: '5rem' }}>🦷</span>
          <span style={{ fontSize: '4rem', marginLeft: '1rem' }}>😁</span>
        </div>
      </div>

      {/* What is Oral Health */}
      <section style={styles.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>🌟 {t('learning.oralTitle')}</h2>
          <p style={styles.sectionText}>{t('learning.oralOne')} 😊</p>
          <p style={styles.sectionText}>{t('learning.oralTwo')} 🎉</p>
        </div>
      </section>

      {/* Fun Fact Cards */}
      <section style={{ ...styles.section, background: '#FEF9EE' }}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>⚡ {t('learning.factsTitle')}</h2>
          <div style={styles.factGrid}>
            {[
              { icon: '🦠', ...t('learning.facts')[0] },
              { icon: '🍬', ...t('learning.facts')[1] },
              { icon: '🪥', ...t('learning.facts')[2] },
              { icon: '💧', ...t('learning.facts')[3] },
              { icon: '🧵', ...t('learning.facts')[4] },
              { icon: '👨‍⚕️', ...t('learning.facts')[5] },
            ].map((fact, i) => (
              <div key={i} style={{ ...styles.factCard, background: ['#fff7ed', '#f0fdf4', '#eff6ff', '#fdf4ff', '#fff1f2', '#f0fdfa'][i] }}>
                <div style={styles.factIcon}>{fact.icon}</div>
                <h3 style={styles.factTitle}>{fact.title}</h3>
                <p style={styles.factText}>{fact.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Brush Steps */}
      <section style={styles.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>🪥 {t('learning.brushTitle')}</h2>
          <div style={styles.stepsRow}>
            {[
              { step: '1', icon: '🪥', ...t('learning.steps')[0] },
              { step: '2', icon: '⏱️', ...t('learning.steps')[1] },
              { step: '3', icon: '🔄', ...t('learning.steps')[2] },
              { step: '4', icon: '👅', ...t('learning.steps')[3] },
              { step: '5', icon: '💦', ...t('learning.steps')[4] },
            ].map((s, i) => (
              <div key={i} style={styles.stepCard}>
                <div style={styles.stepNumber}>{s.step}</div>
                <div style={styles.stepIcon}>{s.icon}</div>
                <h4 style={styles.stepTitle}>{s.title}</h4>
                <p style={styles.stepText}>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Foods Section */}
      <section style={{ ...styles.section, background: '#f0fdf4' }}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>🍎 {t('learning.foodTitle')}</h2>
          <div style={styles.foodGrid}>
            <div style={styles.foodCard}>
              <h3 style={styles.foodGoodTitle}>✅ {t('learning.goodFoodTitle')}</h3>
              {t('learning.goodFoods').map((f, i) => (
                <div key={i} style={styles.foodItem}>{['🥛', '🍎', '💧', '🥦', '🥜'][i]} {f}</div>
              ))}
            </div>
            <div style={{ ...styles.foodCard, background: '#fff1f2' }}>
              <h3 style={styles.foodBadTitle}>❌ {t('learning.badFoodTitle')}</h3>
              {t('learning.badFoods').map((f, i) => (
                <div key={i} style={styles.foodItemBad}>{['🍬', '🥤', '🍟', '🧃', '🍦'][i]} {f}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Videos Section */}
      <section style={{ ...styles.section, background: '#eff6ff' }}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>🎬 {t('learning.videosTitle')}</h2>
          <p style={{ textAlign: 'center', color: '#475569', marginBottom: '2rem' }}>{t('learning.videosText')}</p>

          {/* Selected Video Player */}
          {selected && (
            <div style={styles.playerWrap}>
              <iframe
                style={styles.iframe}
                src={getEmbedUrl(selected.youtube_url)}
                title={selected.title}
                frameBorder="0"
                allowFullScreen
              />
              <div style={styles.playerInfo}>
                <h3 style={styles.playerTitle} data-no-translate="true">{selected.title}</h3>
                <p style={styles.playerDesc} data-no-translate="true">{selected.description}</p>
              </div>
            </div>
          )}

          {/* Video Cards Row */}
          <div style={styles.videoGrid}>
            {videos.map((video, index) => (
              <div
                key={video.id}
                style={{ ...styles.videoCard, ...(selected?.id === video.id ? styles.videoCardActive : {}) }}
                onClick={() => setSelected(video)}
              >
                <div style={styles.videoThumb}>
                  <img
                    src={`https://img.youtube.com/vi/${getEmbedUrl(video.youtube_url).split('/embed/')[1]}/hqdefault.jpg`}
                    alt={video.title}
                    style={styles.thumbImg}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <div style={styles.playBtn}>▶</div>
                </div>
                <div style={styles.videoMeta}>
                  <span style={styles.videoNum}>{t('learning.videoLabel')} {index + 1}</span>
                  <p style={styles.videoCardTitle} data-no-translate="true">{video.title}</p>
                  <p style={styles.videoCardDesc} data-no-translate="true">{video.description?.slice(0, 70)}...</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section style={styles.cta}>
        <h2 style={styles.ctaTitle}>{t('learning.ctaTitle')} 🎮</h2>
        <p style={styles.ctaText}>{t('learning.ctaText')}</p>
      </section>
    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: '#FFF9F0', fontFamily: '"Outfit", sans-serif' },
  loading: { textAlign: 'center', padding: '4rem', color: '#64748b', fontSize: '1.2rem' },
  hero: { background: 'linear-gradient(135deg, #01306B 0%, #1e5aad 100%)', padding: '3rem clamp(1rem, 5vw, 4rem)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' },
  heroLeft: { maxWidth: '600px' },
  heroBadge: { display: 'inline-block', background: '#D4A843', color: '#fff', padding: '0.3rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', marginBottom: '1rem' },
  heroTitle: { fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: '800', color: '#FFD700', margin: '0 0 1rem', lineHeight: 1.2 },
  heroText: { fontSize: '1.1rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, margin: 0 },
  heroEmojis: { display: 'flex', alignItems: 'center' },
  section: { padding: '3rem 2rem', background: '#fff' },
  sectionInner: { maxWidth: '1100px', margin: '0 auto' },
  sectionTitle: { fontSize: '1.8rem', fontWeight: '800', color: '#01306B', marginBottom: '1.5rem', textAlign: 'center' },
  sectionText: { fontSize: '1.05rem', color: '#475569', lineHeight: 1.8, marginBottom: '1rem', maxWidth: '800px', margin: '0 auto 1rem' },
  factGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem', marginTop: '1rem' },
  factCard: { padding: '1.5rem', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid rgba(212,168,67,0.15)' },
  factIcon: { fontSize: '2.2rem', marginBottom: '0.75rem' },
  factTitle: { fontSize: '1.05rem', fontWeight: '700', color: '#01306B', margin: '0 0 0.5rem' },
  factText: { color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 },
  stepsRow: { display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', marginTop: '1rem' },
  stepCard: { minWidth: '180px', flex: 1, background: '#FAFAF5', border: '2px solid rgba(212,168,67,0.2)', borderRadius: '16px', padding: '1.5rem', textAlign: 'center' },
  stepNumber: { background: '#01306B', color: '#FFD700', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', margin: '0 auto 0.75rem', fontSize: '1rem' },
  stepIcon: { fontSize: '2rem', marginBottom: '0.5rem' },
  stepTitle: { fontSize: '0.95rem', fontWeight: '700', color: '#01306B', margin: '0 0 0.5rem' },
  stepText: { color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5, margin: 0 },
  foodGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' },
  foodCard: { background: '#f0fdf4', borderRadius: '16px', padding: '1.5rem' },
  foodGoodTitle: { color: '#15803d', fontWeight: '700', fontSize: '1.1rem', marginBottom: '1rem' },
  foodBadTitle: { color: '#dc2626', fontWeight: '700', fontSize: '1.1rem', marginBottom: '1rem' },
  foodItem: { background: '#dcfce7', color: '#15803d', padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' },
  foodItemBad: { background: '#fee2e2', color: '#dc2626', padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' },
  playerWrap: { background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '2rem' },
  iframe: { width: '100%', aspectRatio: '16/9', display: 'block', background: '#000' },
  playerInfo: { padding: '1.5rem' },
  playerTitle: { fontSize: '1.3rem', fontWeight: '700', color: '#01306B', margin: '0 0 0.5rem' },
  playerDesc: { color: '#64748b', lineHeight: 1.6, margin: 0, fontSize: '0.95rem' },
  videoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' },
  videoCard: { background: '#fff', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', border: '2px solid transparent', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'all 0.2s' },
  videoCardActive: { border: '2px solid #01306B' },
  videoThumb: { position: 'relative', aspectRatio: '16/9', background: '#01306B', overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  playBtn: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(1,48,107,0.85)', color: '#FFD700', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' },
  videoMeta: { padding: '0.75rem' },
  videoNum: { fontSize: '0.75rem', fontWeight: '600', color: '#01306B', background: '#FEF9EE', padding: '0.2rem 0.6rem', borderRadius: '10px' },
  videoCardTitle: { fontSize: '0.88rem', fontWeight: '700', color: '#01306B', margin: '0.4rem 0 0.3rem' },
  videoCardDesc: { fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 },
  cta: { background: '#01306B', padding: '3rem 2rem', textAlign: 'center' },
  ctaTitle: { fontSize: '1.8rem', fontWeight: '800', color: '#FFD700', margin: '0 0 0.75rem' },
  ctaText: { color: 'rgba(255,255,255,0.7)', fontSize: '1rem', margin: 0 },
};

export default LearningPage;
