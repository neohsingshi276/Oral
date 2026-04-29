import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.logo}>🦷 DentalQuest</Link>
      <div style={styles.links}>
        <Link to="/" style={styles.link}>Utama</Link>
        <Link to="/learning" style={styles.link}>Pembelajaran</Link>
        <Link to="/did-you-know" style={styles.link}>Tahukah Anda?</Link>
        <Link to="/join" style={styles.link}>Sertai Permainan</Link>
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
    fontFamily: '"Outfit", sans-serif'
  },
  logo: { fontSize: '1.5rem', fontWeight: '800', color: '#01306B', textDecoration: 'none', letterSpacing: '-0.03em' },
  links: { display: 'flex', alignItems: 'center', gap: '2rem' },
  link: { color: '#01306B', textDecoration: 'none', fontWeight: '600', fontSize: '1rem', transition: 'color 0.2s ease' },
};

export default Navbar;
