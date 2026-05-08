import { useLanguage } from '../context/LanguageContext';

const LanguageToggle = ({ compact = false, style }) => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      type="button"
      aria-label="Toggle language"
      title="Toggle language"
      onClick={toggleLanguage}
      style={{ ...styles.button, ...(compact ? styles.compact : {}), ...style }}
    >
      <span aria-hidden="true">🌐</span>
      <span>{language === 'bm' ? 'BM' : 'BI'}</span>
    </button>
  );
};

const styles = {
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.35rem',
    background: 'rgba(255,255,255,0.82)',
    color: '#01306B',
    border: '2px solid rgba(212,168,67,0.75)',
    borderRadius: '999px',
    padding: '0.42rem 0.85rem',
    fontSize: '0.9rem',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(1,48,107,0.08)',
    whiteSpace: 'nowrap',
  },
  compact: {
    padding: '0.32rem 0.7rem',
    fontSize: '0.82rem',
  },
};

export default LanguageToggle;
