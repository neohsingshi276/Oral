import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';

const LearningPage = () => {
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
    <div style={styles.page}><Navbar /><div style={styles.loading}>Loading... 🦷</div></div>
  );

  return (
    <div style={styles.page}>
      <Navbar />

      {/* Hero Banner */}
      <div style={styles.hero}>
        <div style={styles.heroLeft}>
          <div style={styles.heroBadge}>📚 Learning Module</div>
          <h1 style={styles.heroTitle}>Let's Learn About<br />Our Teeth! 🦷</h1>
          <p style={styles.heroText}>Did you know your teeth are super important? They help you eat, talk, and smile! Let's learn how to take care of them.</p>
        </div>
        <div style={styles.heroEmojis}>
          <span style={{ fontSize: '5rem' }}>🦷</span>
          <span style={{ fontSize: '4rem', marginLeft: '1rem' }}>😁</span>
        </div>
      </div>

      {/* What is Oral Health */}
      <section style={styles.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>🌟 What is Oral Health?</h2>
          <p style={styles.sectionText}>
            <strong>Oral health</strong> means keeping your <strong>mouth, teeth, and gums</strong> healthy and clean!
            Your mouth is the door to your body — when your mouth is healthy, your whole body feels better too! 😊
          </p>
          <p style={styles.sectionText}>
            Tooth decay (also called <strong>cavities</strong>) and gum disease are very common problems — but the good news is,
            they can almost always be <strong>prevented</strong> just by brushing, flossing, and eating the right foods! 🎉
          </p>
        </div>
      </section>

      {/* Fun Fact Cards */}
      <section style={{ ...styles.section, background: '#fef9ee' }}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>⚡ Did You Know?</h2>
          <div style={styles.factGrid}>
            {[
              { icon: '🦠', title: 'Tiny Bacteria!', text: 'Your mouth has over 700 types of bacteria! Most are harmless but some can cause cavities if you don\'t brush.' },
              { icon: '🍬', title: 'Sugar is Sneaky!', text: 'When you eat sugar, bacteria in your mouth turn it into acid. That acid slowly eats away your teeth — yikes!' },
              { icon: '🪥', title: 'Brush 2x a Day!', text: 'Brushing in the morning and before bed removes the bacteria and food stuck on your teeth.' },
              { icon: '💧', title: 'Drink Water!', text: 'Water washes away food and bacteria. Fluoride in tap water also makes your teeth stronger!' },
              { icon: '🧵', title: 'Don\'t Forget to Floss!', text: 'Your toothbrush can\'t reach between your teeth! Flossing removes hidden food and bacteria every day.' },
              { icon: '👨‍⚕️', title: 'Visit the Dentist!', text: 'See your dentist every 6 months for a checkup — even if nothing hurts! Prevention is better than cure.' },
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
          <h2 style={styles.sectionTitle}>🪥 How to Brush Your Teeth the Right Way!</h2>
          <div style={styles.stepsRow}>
            {[
              { step: '1', icon: '🪥', title: 'Use a soft brush', text: 'Use a soft-bristle toothbrush and a pea-sized amount of fluoride toothpaste.' },
              { step: '2', icon: '⏱️', title: 'Brush for 2 minutes', text: 'Set a timer! Brush all surfaces — front, back, and the chewing surface of every tooth.' },
              { step: '3', icon: '🔄', title: 'Small circles', text: 'Use gentle small circular motions. Don\'t scrub too hard — you could hurt your gums!' },
              { step: '4', icon: '👅', title: 'Brush your tongue', text: 'Bacteria love hiding on your tongue too! Give it a gentle brush to keep your breath fresh.' },
              { step: '5', icon: '💦', title: 'Rinse well', text: 'Spit out the toothpaste and rinse your mouth with water. All clean!' },
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
          <h2 style={styles.sectionTitle}>🍎 Good Foods vs Bad Foods for Teeth</h2>
          <div style={styles.foodGrid}>
            <div style={styles.foodCard}>
              <h3 style={styles.foodGoodTitle}>✅ Good for Teeth</h3>
              {['🥛 Milk & Cheese — strong calcium for teeth', '🍎 Apples & Carrots — clean teeth naturally', '💧 Water — washes away bacteria', '🥦 Vegetables — vitamins for healthy gums', '🥜 Nuts — good minerals for strong teeth'].map((f, i) => (
                <div key={i} style={styles.foodItem}>{f}</div>
              ))}
            </div>
            <div style={{ ...styles.foodCard, background: '#fff1f2' }}>
              <h3 style={styles.foodBadTitle}>❌ Bad for Teeth</h3>
              {['🍬 Sweets & Candy — feeds bacteria', '🥤 Sugary drinks — acid attacks teeth', '🍟 Chips & crackers — stick to teeth', '🧃 Fruit juice — high in sugar', '🍦 Ice cream — sugar + cold = damage'].map((f, i) => (
                <div key={i} style={styles.foodItemBad}>{f}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Videos Section */}
      <section style={{ ...styles.section, background: '#eff6ff' }}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>🎬 Watch & Learn!</h2>
          <p style={{ textAlign: 'center', color: '#475569', marginBottom: '2rem' }}>Watch these fun videos to learn more about keeping your teeth healthy!</p>

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
                <h3 style={styles.playerTitle}>{selected.title}</h3>
                <p style={styles.playerDesc}>{selected.description}</p>
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
                  <span style={styles.videoNum}>Video {index + 1}</span>
                  <p style={styles.videoCardTitle}>{video.title}</p>
                  <p style={styles.videoCardDesc}>{video.description?.slice(0, 70)}...</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section style={styles.cta}>
        <h2 style={styles.ctaTitle}>Ready to Test What You Learned? 🎮</h2>
        <p style={styles.ctaText}>Ask your teacher for a game link and go on a dental adventure!</p>
      </section>
    </div>
  );
};

const styles = {
  page: { minHeight: '100vh', background: '#f8fafc', fontFamily: 'sans-serif' },
  loading: { textAlign: 'center', padding: '4rem', color: '#64748b', fontSize: '1.2rem' },
  hero: { background: 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)', padding: '3rem clamp(1rem, 5vw, 4rem)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' },
  heroLeft: { maxWidth: '600px' },
  heroBadge: { display: 'inline-block', background: '#2563eb', color: '#fff', padding: '0.3rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', marginBottom: '1rem' },
  heroTitle: { fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: '800', color: '#1e3a5f', margin: '0 0 1rem', lineHeight: 1.2 },
  heroText: { fontSize: '1.1rem', color: '#475569', lineHeight: 1.7, margin: 0 },
  heroEmojis: { display: 'flex', alignItems: 'center' },
  section: { padding: '3rem 2rem', background: '#fff' },
  sectionInner: { maxWidth: '1100px', margin: '0 auto' },
  sectionTitle: { fontSize: '1.8rem', fontWeight: '800', color: '#1e3a5f', marginBottom: '1.5rem', textAlign: 'center' },
  sectionText: { fontSize: '1.05rem', color: '#475569', lineHeight: 1.8, marginBottom: '1rem', maxWidth: '800px', margin: '0 auto 1rem' },
  factGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem', marginTop: '1rem' },
  factCard: { padding: '1.5rem', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  factIcon: { fontSize: '2.2rem', marginBottom: '0.75rem' },
  factTitle: { fontSize: '1.05rem', fontWeight: '700', color: '#1e3a5f', margin: '0 0 0.5rem' },
  factText: { color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 },
  stepsRow: { display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', marginTop: '1rem' },
  stepCard: { minWidth: '180px', flex: 1, background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', textAlign: 'center' },
  stepNumber: { background: '#2563eb', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', margin: '0 auto 0.75rem', fontSize: '1rem' },
  stepIcon: { fontSize: '2rem', marginBottom: '0.5rem' },
  stepTitle: { fontSize: '0.95rem', fontWeight: '700', color: '#1e3a5f', margin: '0 0 0.5rem' },
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
  playerTitle: { fontSize: '1.3rem', fontWeight: '700', color: '#1e3a5f', margin: '0 0 0.5rem' },
  playerDesc: { color: '#64748b', lineHeight: 1.6, margin: 0, fontSize: '0.95rem' },
  videoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' },
  videoCard: { background: '#fff', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', border: '2px solid transparent', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'all 0.2s' },
  videoCardActive: { border: '2px solid #2563eb' },
  videoThumb: { position: 'relative', aspectRatio: '16/9', background: '#1e3a5f', overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  playBtn: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(37,99,235,0.85)', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' },
  videoMeta: { padding: '0.75rem' },
  videoNum: { fontSize: '0.75rem', fontWeight: '600', color: '#2563eb', background: '#eff6ff', padding: '0.2rem 0.6rem', borderRadius: '10px' },
  videoCardTitle: { fontSize: '0.88rem', fontWeight: '700', color: '#1e3a5f', margin: '0.4rem 0 0.3rem' },
  videoCardDesc: { fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 },
  cta: { background: '#1e3a5f', padding: '3rem 2rem', textAlign: 'center' },
  ctaTitle: { fontSize: '1.8rem', fontWeight: '800', color: '#fff', margin: '0 0 0.75rem' },
  ctaText: { color: '#94a3b8', fontSize: '1rem', margin: 0 },
};

export default LearningPage;
