// ============================================
// src/pages/HomePage.jsx — Malaysian Theme + Full BM
// ============================================

import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import heroImage from '../assets/child.png';
import { useLanguage } from '../context/LanguageContext';

const HomePage = () => {
  const { t } = useLanguage();
  const featureCards = t('home.cards');
  const details = t('home.details');

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

        .homepage-container {
          min-height: 100vh;
          background-color: #FFF9F0;
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #1a1a2e;
          overflow: hidden;
          position: relative;
        }

        .bg-shape {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          z-index: 0;
          opacity: 0.5;
        }

        .bg-shape-1 {
          top: -10%;
          left: -5%;
          width: 500px;
          height: 500px;
          background: linear-gradient(135deg, #01306B, #1e5aad);
        }

        .bg-shape-2 {
          top: 30%;
          right: -10%;
          width: 600px;
          height: 600px;
          background: linear-gradient(135deg, #D4A843, #FFD700);
        }

        .bg-shape-3 {
          bottom: -20%;
          left: 20%;
          width: 800px;
          height: 800px;
          background: linear-gradient(135deg, #01306B, #2563eb);
          opacity: 0.3;
        }

        .homepage-main {
          position: relative;
          z-index: 1;
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 6rem;
        }

        .hero-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4rem;
          min-height: 80vh;
          margin-top: 2rem;
        }

        .hero-content {
          flex: 1;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          animation: slideUp 0.8s ease-out forwards;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          border: 1px solid rgba(212,168,67,0.3);
          width: fit-content;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          font-weight: 600;
          color: #01306B;
          font-size: 0.9rem;
        }

        .hero-title {
          font-size: 6rem;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.04em;
          margin: 0;
          color: #01306B;
        }

        .text-gradient {
          background: linear-gradient(135deg, #D4A843, #FFD700, #D4A843);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 1.25rem;
          color: #475569;
          line-height: 1.7;
          font-weight: 400;
          max-width: 500px;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: 1rem;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1.2rem 2.5rem;
          border-radius: 9999px;
          font-weight: 700;
          font-size: 1.1rem;
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          border: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #01306B, #1e5aad);
          color: white;
          box-shadow: 0 10px 25px -5px rgba(1, 48, 107, 0.4);
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #012550, #01306B);
          transform: translateY(-3px);
          box-shadow: 0 15px 30px -5px rgba(1, 48, 107, 0.5);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: #01306B;
          border: 2px solid rgba(212,168,67,0.4);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .btn-secondary:hover {
          background: white;
          transform: translateY(-3px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          border-color: #D4A843;
        }

        .hero-graphic {
          flex: 1;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .main-glass {
          position: relative;
          width: 100%;
          max-width: 500px;
          aspect-ratio: 4/5;
          border-radius: 40px;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 2px solid rgba(212,168,67,0.3);
          box-shadow: 0 25px 50px -12px rgba(1,48,107,0.15);
          display: flex;
        }

        .hero-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 32px;
        }

        .floating-card {
          position: absolute;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 2px solid rgba(212,168,67,0.3);
          border-radius: 20px;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }

        .card-1 {
          bottom: 40px;
          left: -40px;
        }

        .card-2 {
          top: 60px;
          right: -30px;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: #01306B;
          line-height: 1.1;
        }

        .stat-label {
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 500;
        }

        .emoji {
          font-size: 2rem;
          background: linear-gradient(135deg, #FFF9F0, #FEF3C7);
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }

        .features-nav {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          z-index: 2;
        }

        .feature-nav-card {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 2px solid rgba(212,168,67,0.2);
          border-radius: 32px;
          padding: 2.5rem;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          cursor: pointer;
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05);
          position: relative;
          overflow: hidden;
        }

        .feature-nav-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #01306B, #D4A843, #CC0000);
        }

        .feature-nav-card:hover {
          transform: translateY(-15px) scale(1.02);
          background: rgba(255, 255, 255, 1);
          box-shadow: 0 25px 50px -12px rgba(1,48,107,0.15);
        }

        .nav-card-icon {
          width: 60px;
          height: 60px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }

        .bg-blue { background: linear-gradient(135deg, #01306B, #1e5aad); color: white; }
        .bg-gold { background: linear-gradient(135deg, #D4A843, #FFD700); color: white; }
        .bg-red { background: linear-gradient(135deg, #CC0000, #e53e3e); color: white; }

        .feature-nav-card h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          color: #01306B;
        }

        .feature-nav-card p {
          color: #64748b;
          margin: 0;
          line-height: 1.5;
          font-size: 1.05rem;
        }

        .detailed-features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 3rem;
          padding: 4rem 0;
          border-top: 2px solid rgba(212,168,67,0.2);
          margin-bottom: 4rem;
        }

        .feature-box {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
        }

        .feature-icon-wrapper {
          flex-shrink: 0;
        }

        .feature-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          width: 80px;
          height: 80px;
          background: white;
          border-radius: 24px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
          border: 1px solid rgba(212,168,67,0.2);
        }

        .feature-title {
          font-size: 1.6rem;
          font-weight: 800;
          color: #01306B;
          margin: 0 0 0.5rem 0;
          letter-spacing: -0.02em;
        }

        .feature-desc {
          font-size: 1.1rem;
          color: #475569;
          line-height: 1.6;
          margin: 0;
        }

        @media (max-width: 1024px) {
          .hero-section {
            flex-direction: column;
            text-align: center;
            gap: 3rem;
          }
          
          .hero-content {
            align-items: center;
          }
          
          .hero-badge {
            margin: 0 auto;
          }
          
          .hero-title {
            font-size: 4.5rem;
          }
          
          .hero-subtitle {
             margin-left: auto;
             margin-right: auto;
          }
          
          .hero-actions {
            justify-content: center;
          }
          
          .features-nav {
            grid-template-columns: 1fr;
            max-width: 500px;
            margin: 0 auto;
            width: 100%;
          }
        }

        @media (max-width: 640px) {
          .hero-title {
            font-size: 3.5rem;
          }
          
          .hero-actions {
            flex-direction: column;
            width: 100%;
          }
          
          .btn {
            width: 100%;
          }
          
          .card-1 {
            left: -10px;
            bottom: -20px;
            transform: scale(0.85);
          }
          
          .card-2 {
            right: -10px;
            top: -20px;
            transform: scale(0.85);
          }
        }
      `}</style>

      <div className="homepage-container">
        <Navbar />

        <main className="homepage-main">
          <div className="bg-shape bg-shape-1"></div>
          <div className="bg-shape bg-shape-2"></div>
          <div className="bg-shape bg-shape-3"></div>

          <section className="hero-section">
            <div className="hero-content">
              <div className="hero-badge">
                <span className="badge-icon">🌺</span>
                <span className="badge-text">{t('home.badge')}</span>
              </div>

              <h1 className="hero-title">
                Dental<br />
                <span className="text-gradient">Quest</span>
              </h1>

              <p className="hero-subtitle">
                {t('home.subtitle')} 😁
              </p>

              <div className="hero-actions">
                <Link to="/learning" className="btn btn-primary">
                <span>{t('home.primaryButton')}</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <Link to="/join" className="btn btn-secondary">
                  {t('home.secondaryButton')}
                </Link>
              </div>
            </div>

            <div className="hero-graphic">
              <div className="glass-panel main-glass">
                <img
                  src={heroImage}
                  alt={t('home.heroAlt')}
                  className="hero-image"
                />
                <div className="floating-card stat-card card-1">
                  <span className="emoji">🦷</span>
                  <div className="stat-info">
                    <span className="stat-value">100%</span>
                    <span className="stat-label">{t('home.statOneLabel')}</span>
                  </div>
                </div>
                <div className="floating-card stat-card card-2">
                  <span className="emoji">⭐</span>
                  <div className="stat-info">
                    <span className="stat-value">{t('home.statTwoValue')}</span>
                    <span className="stat-label">{t('home.statTwoLabel')}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="features-nav">
            <div className="feature-nav-card">
              <div className="nav-card-icon bg-blue">📘</div>
              <h3>{featureCards[0].title}</h3>
              <p>{featureCards[0].text}</p>
            </div>
            <div className="feature-nav-card">
              <div className="nav-card-icon bg-gold">🎮</div>
              <h3>{featureCards[1].title}</h3>
              <p>{featureCards[1].text}</p>
            </div>
            <div className="feature-nav-card">
              <div className="nav-card-icon bg-red">🌱</div>
              <h3>{featureCards[2].title}</h3>
              <p>{featureCards[2].text}</p>
            </div>
          </section>

          <section className="detailed-features">
            <div className="feature-box">
              <div className="feature-icon-wrapper">
                <span className="feature-icon">📚</span>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">{details[0].title}</h3>
                <p className="feature-desc">{details[0].text}</p>
              </div>
            </div>
            <div className="feature-box">
              <div className="feature-icon-wrapper">
                <span className="feature-icon">🕹️</span>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">{details[1].title}</h3>
                <p className="feature-desc">{details[1].text}</p>
              </div>
            </div>
            <div className="feature-box">
              <div className="feature-icon-wrapper">
                <span className="feature-icon">💡</span>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">{details[2].title}</h3>
                <p className="feature-desc">{details[2].text}</p>
              </div>
            </div>
          </section>

        </main>
      </div>
    </>
  );
};

export default HomePage;
