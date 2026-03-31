import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.logo}>🦷 DentalQuest</Link>
      <div style={styles.links}>
        <Link to="/" style={styles.link}>Home</Link>
        <Link to="/learning" style={styles.link}>Learning</Link>
        <Link to="/did-you-know" style={styles.link}>Did You Know?</Link>
        <Link to="/join" style={styles.link}>Join Game</Link>
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
    background: 'rgba(255, 255, 255, 0.8)', 
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
    position: 'sticky', 
    top: 0, 
    zIndex: 100,
    borderBottom: '1px solid rgba(255,255,255,0.3)',
    fontFamily: '"Outfit", sans-serif'
  },
  logo: { fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', textDecoration: 'none', letterSpacing: '-0.03em' },
  links: { display: 'flex', alignItems: 'center', gap: '2rem' },
  link: { color: '#475569', textDecoration: 'none', fontWeight: '600', fontSize: '1rem', transition: 'color 0.2s ease' },
};

export default Navbar;
