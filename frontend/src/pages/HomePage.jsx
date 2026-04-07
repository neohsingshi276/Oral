// ============================================
// src/pages/HomePage.jsx
// ============================================

import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import heroImage from '../assets/child.png';

const HomePage = () => {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

        .homepage-container {
          min-height: 100vh;
          background-color: #f8fafc;
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #0f172a;
          overflow: hidden;
          position: relative;
        }

        .bg-shape {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          z-index: 0;
          opacity: 0.6;
        }

        .bg-shape-1 {
          top: -10%;
          left: -5%;
          width: 500px;
          height: 500px;
          background: linear-gradient(135deg, #38bdf8, #818cf8);
        }

        .bg-shape-2 {
          top: 30%;
          right: -10%;
          width: 600px;
          height: 600px;
          background: linear-gradient(135deg, #f472b6, #fb7185);
        }

        .bg-shape-3 {
          bottom: -20%;
          left: 20%;
          width: 800px;
          height: 800px;
          background: linear-gradient(135deg, #a78bfa, #38bdf8);
          opacity: 0.4;
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
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          width: fit-content;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          font-weight: 600;
          color: #4f46e5;
          font-size: 0.9rem;
        }

        .hero-title {
          font-size: 6rem;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.04em;
          margin: 0;
          color: #0f172a;
        }

        .text-gradient {
          background: linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6);
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
          background: #3b82f6;
          color: white;
          box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.5);
        }

        .btn-primary:hover {
          background: #2563eb;
          transform: translateY(-3px);
          box-shadow: 0 15px 30px -5px rgba(59, 130, 246, 0.6);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .btn-secondary:hover {
          background: white;
          transform: translateY(-3px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
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
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
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
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 1);
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
          color: #0f172a;
          line-height: 1.1;
        }

        .stat-label {
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 500;
        }

        .emoji {
          font-size: 2rem;
          background: #f1f5f9;
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
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 32px;
          padding: 2.5rem;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          cursor: pointer;
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05);
        }

        .feature-nav-card:hover {
          transform: translateY(-15px) scale(1.02);
          background: rgba(255, 255, 255, 1);
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);
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

        .bg-blue { background: linear-gradient(135deg, #60a5fa, #3b82f6); color: white; }
        .bg-pink { background: linear-gradient(135deg, #f472b6, #ec4899); color: white; }
        .bg-yellow { background: linear-gradient(135deg, #fcd34d, #f59e0b); color: white; }

        .feature-nav-card h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          color: #1e293b;
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
          border-top: 1px solid rgba(0,0,0,0.05);
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
        }

        .feature-title {
          font-size: 1.6rem;
          font-weight: 800;
          color: #0f172a;
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
                <span className="badge-icon">✨</span>
                <span className="badge-text">Trusted Educational Platform for Kids</span>
              </div>

              <h1 className="hero-title">
                Dental<br />
                <span className="text-gradient">Quest</span>
              </h1>

              <p className="hero-subtitle">
                We wish to provide fun, engaging dental education that matches modern technology. We believe in the power of your smile.
              </p>

              <div className="hero-actions">
                <Link to="/learning" className="btn btn-primary">
                  <span>Start Learning</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <Link to="/join" className="btn btn-secondary">
                  Join Game
                </Link>
              </div>
            </div>

            <div className="hero-graphic">
              <div className="glass-panel main-glass">
                <img
                  src={heroImage}
                  alt="Modern Dental Clinic"
                  className="hero-image"
                />
                <div className="floating-card stat-card card-1">
                  <span className="emoji">🦷</span>
                  <div className="stat-info">
                    <span className="stat-value">100%</span>
                    <span className="stat-label">Fun Learning</span>
                  </div>
                </div>
                <div className="floating-card stat-card card-2">
                  <span className="emoji">⭐</span>
                  <div className="stat-info">
                    <span className="stat-value">Top</span>
                    <span className="stat-label">Rated Minigames</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="features-nav">
            <div className="feature-nav-card">
              <div className="nav-card-icon bg-blue">📘</div>
              <h3>Interactive Learning Modules</h3>
              <p>Dive into detailed animated lessons.</p>
            </div>
            <div className="feature-nav-card">
              <div className="nav-card-icon bg-pink">🎮</div>
              <h3>Fun Dental Minigames</h3>
              <p>Play quizzes, crosswords, and more.</p>
            </div>
            <div className="feature-nav-card">
              <div className="nav-card-icon bg-yellow">🌱</div>
              <h3>Build Healthy Habits</h3>
              <p>Track your daily brushing progress.</p>
            </div>
          </section>

          <section className="detailed-features">
            <div className="feature-box">
              <div className="feature-icon-wrapper">
                <span className="feature-icon">📚</span>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">Video Lessons</h3>
                <p className="feature-desc">Watch high-quality animated videos teaching proper brushing, flossing, and the science of cavities.</p>
              </div>
            </div>
            <div className="feature-box">
              <div className="feature-icon-wrapper">
                <span className="feature-icon">🕹️</span>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">Quest Minigames</h3>
                <p className="feature-desc">Join the food game, race the clock in interactive quizzes, and conquer dental crosswords.</p>
              </div>
            </div>
            <div className="feature-box">
              <div className="feature-icon-wrapper">
                <span className="feature-icon">💡</span>
              </div>
              <div className="feature-text">
                <h3 className="feature-title">Did You Know?</h3>
                <p className="feature-desc">Explore amazing facts about your teeth that will blow your mind and keep your smile bright.</p>
              </div>
            </div>
          </section>

        </main>
      </div>
    </>
  );
};

export default HomePage;
