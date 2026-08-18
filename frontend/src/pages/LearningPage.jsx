import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import chero from '../assets/child.png';
import Brush from '../assets/Brush.png';
import Rinse from '../assets/Rinse.png';
import Floss from '../assets/Floss.png';
import Reduce from '../assets/Reduce.png';
import Smoking from '../assets/Smoking.png';
import Check from '../assets/Check.png';

const VIDEO_CARD_MIN_WIDTH = 200;
const VIDEO_GRID_GAP = 16;

const LearningPage = () => {
  const { t, language } = useLanguage();
  const [videos, setVideos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllVideos, setShowAllVideos] = useState(false);
  const [firstRowVideoCount, setFirstRowVideoCount] = useState(1);
  const [flippedFact, setFlippedFact] = useState(null);
  const videoGridRef = useRef(null);

  useEffect(() => {
    setSelected(null);
    setShowAllVideos(false);

    api.get('/videos', {
      params: {
        language
      }
    })
      .then(res => {
        const loadedVideos = res.data.videos || [];

        setVideos(loadedVideos);

        if (loadedVideos.length > 0) {
          setSelected(loadedVideos[0]);
        }
      })
      .catch(err => {
        console.error(err);
        setVideos([]);
        setSelected(null);
      })
      .finally(() => {
        setLoading(false);
      });

  }, [language]);

  useEffect(() => {
    // Must re-run once loading finishes — on first mount the loading
    // screen is shown instead of the grid, so videoGridRef.current is
    // still null and the observer never attaches, leaving
    // firstRowVideoCount stuck at 1 forever.
    const grid = videoGridRef.current;
    if (!grid) return;

    const updateFirstRowCount = () => {
      const width = grid.getBoundingClientRect().width;
      const count = Math.max(1, Math.floor((width + VIDEO_GRID_GAP) / (VIDEO_CARD_MIN_WIDTH + VIDEO_GRID_GAP)));
      setFirstRowVideoCount(count);
    };

    updateFirstRowCount();
    const observer = new ResizeObserver(updateFirstRowCount);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [loading]);

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

  const displayedVideos = showAllVideos ? videos : videos.slice(0, firstRowVideoCount);
  const hasHiddenVideos = videos.length > firstRowVideoCount;

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
          <h1 style={styles.heroTitle}>{t('learning.heroTitleTop')}<br />{t('learning.heroTitleBottom')} </h1>
          <p style={styles.heroText}>{t('learning.heroText')}</p>
        </div>
        <div style={styles.cheroContainer}>
          <img src={chero} alt="Happy Child" style={styles.chero} />
        </div>
      </div>

      {/* Fun Fact Flip Cards */}
      <section style={{ ...styles.section, background: '#FEF9EE' }}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>
            ⚡ {t('learning.factsTitle')}
          </h2>

          <p style={styles.flipInstruction}>
            {t('learning.flipInstruction') || (language === 'bi'
              ? 'Click each card to discover oral health care tips!'
              : 'Klik setiap kad untuk mengetahui tip penjagaan kesihatan pergigian!')}
          </p>

          <div style={styles.factGrid}>
            {[
              { image: Brush, ...t('learning.facts')[0] },
              { image: Rinse, ...t('learning.facts')[1] },
              { image: Floss, ...t('learning.facts')[2] },
              { image: Reduce, ...t('learning.facts')[3] },
              { image: Smoking, ...t('learning.facts')[4] },
              { image: Check, ...t('learning.facts')[5] },
            ].map((fact, i) => {
              const isFlipped = flippedFact === i;

              return (
                <div
                  key={i}
                  style={styles.flipCard}
                  onClick={() => setFlippedFact(isFlipped ? null : i)}
                  role="button"
                  tabIndex={0}
                  aria-label={fact.title}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setFlippedFact(isFlipped ? null : i);
                    }
                  }}
                >
                  <div
                    style={{
                      ...styles.flipCardInner,
                      transform: isFlipped
                        ? 'rotateY(180deg)'
                        : 'rotateY(0deg)',
                    }}
                  >
                    {/* Front */}
                    <div style={styles.flipCardFront}>
                      <img
                        src={fact.image}
                        alt={fact.title}
                        style={styles.factImage}
                      />

                      <div style={styles.factFrontOverlay}>
                        <h3 style={styles.factFrontTitle}>
                          {fact.title}
                        </h3>

                        <span style={styles.flipHint}>
                          {language === 'bi'
                            ? 'Click to flip'
                            : 'Klik untuk pusing'}
                        </span>
                      </div>
                    </div>

                    {/* Back */}
                    <div style={styles.flipCardBack}>
                      <h3 style={styles.factTitle}>
                        {fact.title}
                      </h3>

                      <p style={styles.factText}>
                        {fact.text}
                      </p>

                      <span style={styles.flipBackHint}>
                        {language === 'bi'
                          ? 'Click to return'
                          : 'Klik untuk kembali'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
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
          <div ref={videoGridRef} style={styles.videoGrid}>
            {displayedVideos.map((video, index) => (
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
                  <p style={styles.videoCardDesc} data-no-translate="true">{(video.description || "").slice(0, 70)}...</p>
                </div>
              </div>
            ))}
          </div>

          {hasHiddenVideos && (
            <div style={styles.showMoreWrap}>
              <button
                type="button"
                style={styles.showMoreBtn}
                onClick={() => setShowAllVideos(prev => !prev)}
              >
                {showAllVideos
                  ? (language === 'bi' ? 'Show Less' : 'Tunjuk Kurang')
                  : (language === 'bi'
                    ? `Show More (${videos.length - firstRowVideoCount} more)`
                    : `Tunjuk Lagi (${videos.length - firstRowVideoCount} lagi)`)}
              </button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>

  );
};

const styles = {
  page: { minHeight: '100vh', background: '#FFF9F0', fontFamily: '"Outfit", sans-serif' },
  loading: { textAlign: 'center', padding: '4rem', color: '#64748b', fontSize: '1.2rem' },
  hero: { background: 'linear-gradient(135deg, #01306B 0%, #1e5aad 100%)', padding: '2rem clamp(1.5rem, 5vw, 4rem)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap', gap: '2rem', },
  heroLeft: { flex: '1 1 auto', maxWidth: '680px', minWidth: 0, },
  heroBadge: { display: 'inline-block', background: '#D4A843', color: '#fff', padding: '0.5rem 1.3rem', borderRadius: '20px', fontSize: '1.05rem', fontWeight: '700', marginBottom: '1rem' }, heroTitle: { fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: '800', color: '#FFD700', margin: '0 0 1rem', lineHeight: 1.2 }, heroText: { fontSize: '1.3rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.7, margin: 0, maxWidth: '650px' },
  cheroContainer: { flex: '0 0 300px', display: 'flex', alignItems: 'center', justifyContent: 'center', },
  chero: { width: '300px', maxWidth: '100%', height: 'auto', objectFit: 'contain', display: 'block', },
  section: { padding: '3rem 2rem', background: '#fff' },
  sectionInner: { maxWidth: '1100px', margin: '0 auto' },
  sectionTitle: { fontSize: '1.8rem', fontWeight: '800', color: '#01306B', marginBottom: '1.5rem', textAlign: 'center' },
  sectionText: { fontSize: '1.05rem', color: '#475569', lineHeight: 1.8, marginBottom: '1rem', maxWidth: '800px', margin: '0 auto 1rem' },
  factGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginTop: '1rem' },
  flipInstruction: { textAlign: 'center', color: '#64748b', fontSize: '0.95rem', margin: '-0.75rem 0 1.5rem' },
  flipCard: { width: '100%', height: '320px', perspective: '1000px', cursor: 'pointer', outline: 'none' },
  flipCardInner: { position: 'relative', width: '100%', height: '100%', transition: 'transform 0.65s ease', transformStyle: 'preserve-3d' },
  flipCardFront: { position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: '18px', overflow: 'hidden', background: '#ffffff', border: '2px solid rgba(212,168,67,0.25)', boxShadow: '0 8px 24px rgba(1,48,107,0.12)', display: 'flex', flexDirection: 'column' },
  flipCardBack: { position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: '18px', background: 'linear-gradient(135deg, #01306B, #1e5aad)', border: '2px solid #D4A843', boxShadow: '0 8px 24px rgba(1,48,107,0.18)', padding: '1.75rem', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  factImage: { width: '100%', height: '220px', objectFit: 'contain', display: 'block', padding: '0.75rem', boxSizing: 'border-box' },
  factFrontOverlay: { flex: 1, padding: '0.8rem 1rem', textAlign: 'center', background: '#01306B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  factFrontTitle: { color: '#ffffff', fontSize: '1.1rem', fontWeight: '800', margin: '0 0 0.4rem' },
  flipHint: { display: 'inline-block', color: '#01306B', background: '#FFD700', borderRadius: '999px', padding: '0.3rem 0.75rem', fontSize: '0.75rem', fontWeight: '700' },
  factTitle: { fontSize: '1.2rem', fontWeight: '800', color: '#FFD700', margin: '0 0 1rem' },
  factText: { color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem', lineHeight: 1.7, margin: 0 },
  flipBackHint: { marginTop: '1.25rem', color: '#01306B', background: '#ffffff', borderRadius: '999px', padding: '0.35rem 0.8rem', fontSize: '0.75rem', fontWeight: '700' },
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
  showMoreWrap: { display: 'flex', justifyContent: 'center', marginTop: '1.5rem' },
  showMoreBtn: { background: '#01306B', color: '#FFD700', border: 'none', borderRadius: '999px', padding: '0.8rem 1.4rem', fontWeight: '800', cursor: 'pointer', boxShadow: '0 6px 18px rgba(1,48,107,0.18)' },
  cta: { background: '#01306B', padding: '3rem 2rem', textAlign: 'center' },
  ctaTitle: { fontSize: '1.8rem', fontWeight: '800', color: '#FFD700', margin: '0 0 0.75rem' },
  ctaText: { color: 'rgba(255,255,255,0.7)', fontSize: '1rem', margin: 0 },
};

export default LearningPage;