import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from './LanguageToggle';

const Navbar = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLearningPopup, setShowLearningPopup] = useState(false);

  const handleLearningZoneClick = (event) => {
    // If already inside Learning Zone, allow normal navigation
    if (location.pathname === '/learning') {
      return;
    }

    // Otherwise, stop navigation and show confirmation popup
    event.preventDefault();
    setShowLearningPopup(true);
  };

  const handleLearningYes = () => {
    setShowLearningPopup(false);
    navigate('/learning');
  };

  const handleLearningNo = () => {
    setShowLearningPopup(false);
    navigate('/join');
  };

  return (
    <>
      <nav style={styles.nav}>
        <Link to="/" style={styles.logo}>🦷 Kembara Gigi Sihat</Link>
        <div style={styles.links}>
          <Link to="/" style={styles.link}> {t('nav.home')} </Link>
          <Link to="/learning" onClick={handleLearningZoneClick} style={styles.link} > {t('nav.learning')} </Link>
          <Link to="/join" style={styles.link}> {t('nav.joinGame')}</Link>
          <LanguageToggle />
        </div>
      </nav>
      {showLearningPopup && (
        <div style={styles.popupOverlay}>
          <div style={styles.popup}>
            <div style={styles.popupIcon}>🦷</div>

            <h2 style={styles.popupTitle}>
              {language === 'bm'
                ? 'Zon Pembelajaran'
                : 'Learning Zone'}
            </h2>

            <p style={styles.popupText}>
              {language === 'bm'
                ? 'Sila lengkapkan Kembara Gigi Sihat sebelum meneruskan ke Zon Pembelajaran.'
                : 'Complete Kembara Gigi Sihat before proceeding to the Learning Zone.'}
            </p>

            <p style={styles.popupQuestion}>
              {language === 'bm'
                ? 'Adakah anda telah melengkapkan Kembara Gigi Sihat?'
                : 'Have you completed Kembara Gigi Sihat?'}
            </p>

            <div style={styles.popupActions}>
              <button
                type="button"
                style={{ ...styles.popupButton, ...styles.yesButton }}
                onClick={handleLearningYes}
              >
                {language === 'bm' ? 'Ya' : 'Yes'}
              </button>

              <button
                type="button"
                style={{ ...styles.popupButton, ...styles.noButton }}
                onClick={handleLearningNo}
              >
                {language === 'bm' ? 'Tidak' : 'No'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    borderBottom: '2px solid rgba(212,168,67,0.2)',
    fontFamily: '"Outfit", sans-serif',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  logo: { fontSize: '1.5rem', fontWeight: '800', color: '#01306B', textDecoration: 'none', letterSpacing: '-0.03em' },
  links: { display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'flex-end' },
  link: { color: '#01306B', textDecoration: 'none', fontWeight: '600', fontSize: '1rem', transition: 'color 0.2s ease' },
  popupOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(1, 48, 107, 0.55)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '1.5rem',
  },

  popup: {
    width: '100%',
    maxWidth: '470px',
    background: '#ffffff',
    borderRadius: '28px',
    padding: '2.3rem',
    textAlign: 'center',
    border: '3px solid #D4A843',
    boxShadow: '0 25px 60px rgba(1, 48, 107, 0.3)',
    fontFamily: '"Outfit", sans-serif',
  },

  popupIcon: {
    width: '75px',
    height: '75px',
    margin: '0 auto 1rem',
    borderRadius: '50%',
    background: '#FEF3C7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.7rem',
  },

  popupTitle: {
    color: '#01306B',
    fontSize: '1.8rem',
    fontWeight: '800',
    margin: '0 0 1rem',
  },

  popupText: {
    color: '#64748b',
    fontSize: '1rem',
    lineHeight: 1.6,
    margin: '0 0 1rem',
  },

  popupQuestion: {
    color: '#01306B',
    fontWeight: '700',
    fontSize: '1.08rem',
    lineHeight: 1.5,
    margin: 0,
  },

  popupActions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginTop: '1.5rem',
  },

  popupButton: {
    minWidth: '120px',
    padding: '0.85rem 1.5rem',
    border: 'none',
    borderRadius: '999px',
    fontFamily: '"Outfit", sans-serif',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
  },

  yesButton: {
    background: '#01306B',
    color: '#ffffff',
  },

  noButton: {
    background: '#D4A843',
    color: '#ffffff',
  },
};

export default Navbar;