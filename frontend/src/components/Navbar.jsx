import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from './LanguageToggle';

const Navbar = () => {
  const { t } = useLanguage();

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.logo}>🦷 DentalQuest</Link>
      <div style={styles.links}>
        <Link to="/" style={styles.link}>{t('nav.home')}</Link>
        <Link to="/learning" style={styles.link}>{t('nav.learning')}</Link>
        <Link to="/did-you-know" style={styles.link}>{t('nav.didYouKnow')}</Link>
        <Link to="/join" style={styles.link}>{t('nav.joinGame')}</Link>
        <LanguageToggle />
      </div>
    </nav>
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
};

export default Navbar;
