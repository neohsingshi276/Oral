import usmLogo from '../assets/usm-logo.png';
import { useLanguage } from '../context/LanguageContext';

const Footer = () => {
    const { language } = useLanguage();

    return (
        <footer style={styles.footer}>
            <div style={styles.content}>
                <img
                    src={usmLogo}
                    alt="Universiti Sains Malaysia"
                    style={styles.logo}
                />

                <div style={styles.text}>
                    {language === 'bm' ? (
                        <>
                            <p style={styles.developed}>Dibangunkan oleh</p>

                            <p style={styles.school}>
                                Pusat Pengajian Sains Pergigian &amp; Pusat Pengajian Sains Komputer
                            </p>

                            <p style={styles.university}>
                                Universiti Sains Malaysia
                            </p>

                            <div style={styles.divider} />

                            <p style={styles.copyright}>
                                © 2026 Universiti Sains Malaysia. Semua hak cipta terpelihara.
                            </p>
                        </>
                    ) : (
                        <>
                            <p style={styles.developed}>Developed by</p>

                            <p style={styles.school}>
                                School of Dental Sciences &amp; School of Computer Sciences
                            </p>

                            <p style={styles.university}>
                                Universiti Sains Malaysia
                            </p>

                            <div style={styles.divider} />

                            <p style={styles.copyright}>
                                © 2026 Universiti Sains Malaysia. All rights reserved.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </footer>
    );
};

const styles = {
    footer: {
        background: 'linear-gradient(135deg, #87CEEB, #60B5E0)',
        color: '#fff',
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
    },

    content: {
        maxWidth: '900px',
        margin: '0 auto',
        padding: '2rem',
    },

    logo: {
        width: '180px',
        height: 'auto',
        objectFit: 'contain',
        marginBottom: '1.2rem',
    },

    text: {
        maxWidth: '750px',
        margin: '0 auto',
    },

    developed: {
        margin: '0 0 0.5rem',
        fontSize: '0.95rem',
        color: 'rgba(255,255,255,0.8)',
    },

    school: {
        margin: 0,
        fontSize: '1.05rem',
        fontWeight: '700',
        lineHeight: 1.6,
    },

    university: {
        margin: '0.35rem 0 1rem',
        fontSize: '1.15rem',
        fontWeight: '800',
        color: '#FFD700',
    },

    divider: {
        width: '80px',
        height: '3px',
        background: '#FFD700',
        borderRadius: '999px',
        margin: '1rem auto',
    },

    copyright: {
        margin: 0,
        fontSize: '0.88rem',
        color: 'rgba(255,255,255,0.75)',
    },
};

export default Footer;