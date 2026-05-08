import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ManageVideos from '../admin/ManageVideos';
import ManageFacts from '../admin/ManageFacts';
import ManageStudents from '../admin/ManageStudents';
import Analytics from '../admin/Analytics';
import ManageSessions from '../admin/ManageSessions';
import ManageQuiz from '../admin/ManageQuiz';
import ManageCrossword from '../admin/ManageCrossword';
import AdminChat from '../admin/AdminChat';
import StaffChat from '../admin/StaffChat';
import ManageAdmins from '../admin/ManageAdmins';
import ProfileSettings from '../admin/ProfileSettings';
import EmailReminders from '../admin/EmailReminders';
import ActivityLog from '../admin/ActivityLog';
import LanguageToggle from '../components/LanguageToggle';

const AdminDashboard = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState('overview');
  const [showProfile, setShowProfile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const ALL_MENU = [
    { key: 'overview', icon: '📊', label: 'Gambaran Keseluruhan', roles: ['main_admin', 'admin', 'teacher'] },
    { key: 'sessions', icon: '🎮', label: 'Sesi Permainan', roles: ['main_admin', 'admin', 'teacher'] },
    { key: 'students', icon: '👥', label: 'Pemain', roles: ['main_admin', 'admin', 'teacher'] },
    { key: 'chat', icon: '💬', label: 'Sembang Pemain', roles: ['main_admin', 'admin', 'teacher'] },
    { key: 'staffchat', icon: '🏢', label: 'Sembang Staf', roles: ['main_admin', 'admin', 'teacher'] },
    { key: 'videos', icon: '📹', label: 'Video Pembelajaran', roles: ['main_admin', 'admin'] },
    { key: 'facts', icon: '💡', label: 'Tahukah Anda?', roles: ['main_admin', 'admin'] },
    { key: 'quiz', icon: '❓', label: 'Soalan Kuiz', roles: ['main_admin', 'admin'] },
    { key: 'crossword', icon: '🧩', label: 'Teka Silang Kata', roles: ['main_admin', 'admin'] },
    { key: 'analytics', icon: '📈', label: 'Analitik', roles: ['main_admin', 'admin', 'teacher'] },
    { key: 'admins', icon: '👨‍💼', label: 'Urus Pentadbir', roles: ['main_admin', 'admin'] },
    { key: 'email', icon: '✉️', label: admin?.role === 'main_admin' ? 'E-mel Peringatan' : 'Peti Masuk', roles: ['main_admin', 'admin', 'teacher'] },
    { key: 'activity', icon: '📋', label: 'Log Aktiviti', roles: ['main_admin'] },
  ];

  const MENU = ALL_MENU.filter(item => item.roles.includes(admin?.role || 'admin'));

  const handleLogout = () => { logout(); navigate('/'); };

  // Close sidebar when a nav item is clicked on mobile
  const handleNavClick = (key) => {
    setActive(key);
    setSidebarOpen(false);
  };

  const renderContent = () => {
    switch (active) {
      case 'overview': return <Overview admin={admin} setActive={setActive} menu={MENU} />;
      case 'sessions': return <ManageSessions />;
      case 'students': return <ManageStudents />;
      case 'chat': return <AdminChat />;
      case 'staffchat': return <StaffChat />;
      case 'videos': return <ManageVideos />;
      case 'facts': return <ManageFacts />;
      case 'quiz': return <ManageQuiz />;
      case 'crossword': return <ManageCrossword />;
      case 'analytics': return <Analytics />;
      case 'admins': return <ManageAdmins currentAdmin={admin} />;
      case 'email': return <EmailReminders currentAdmin={admin} />;
      case 'activity': return <ActivityLog />;
      default: return <Overview admin={admin} setActive={setActive} menu={MENU} />;
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'main_admin': return '⭐ Pentadbir Utama';
      case 'teacher': return '👩‍🏫 Guru';
      default: return 'Pentadbir';
    }
  };

  return (
    <div style={styles.layout}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        @media (max-width: 768px) {
          .admin-sidebar {
            transform: translateX(-100%);
            position: fixed !important;
            z-index: 1000;
            transition: transform 0.3s ease;
          }
          .admin-sidebar.open {
            transform: translateX(0);
          }
          .admin-hamburger {
            display: flex !important;
          }
          .admin-welcome-text {
            display: none !important;
          }
        }
      `}</style>

      {/* Dark overlay — only shown when sidebar is open on mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999,
            display: 'block',
          }}
        />
      )}

      <div className={`admin-sidebar${sidebarOpen ? ' open' : ''}`} style={styles.sidebar}>
        {/* Decorative top bar */}
        <div style={styles.sidebarAccent}></div>
        <div style={styles.sidebarTop}>
          <div style={styles.logo}>🦷 DentalQuest</div>
          <div style={styles.adminInfo}>
            <div style={styles.adminAvatar}>{admin?.name?.[0]?.toUpperCase()}</div>
            <div>
              <div style={styles.adminName}>{admin?.name}</div>
              <div style={styles.adminRole}>
                {getRoleLabel(admin?.role)}
              </div>
            </div>
          </div>
        </div>
        <nav style={styles.nav}>
          {MENU.map(item => (
            <button
              key={item.key}
              style={{ ...styles.navItem, ...(active === item.key ? styles.navItemActive : {}) }}
              onClick={() => handleNavClick(item.key)}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button style={styles.logoutBtn} onClick={handleLogout}>🚪 Log Keluar</button>
      </div>

      <div style={styles.main}>
        <div style={styles.topBar}>
          <button
            className="admin-hamburger"
            style={{ display: 'none', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem', alignItems: 'center' }}
            onClick={() => setSidebarOpen(o => !o)}
          >
            ☰
          </button>
          <h1 style={styles.pageTitle}>
            {MENU.find(m => m.key === active)?.icon} {MENU.find(m => m.key === active)?.label}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="admin-welcome-text" style={styles.welcomeText}>Selamat datang, {admin?.name}! 👋</span>
            <LanguageToggle compact />
            <button style={styles.profileBtn} onClick={() => setShowProfile(true)}>
              👤 Profil
            </button>
          </div>
        </div>
        {showProfile && <ProfileSettings onClose={() => setShowProfile(false)} />}
        <div style={styles.content}>{renderContent()}</div>
      </div>
    </div>
  );
};

const Overview = ({ admin, setActive, menu }) => {
  const allCards = [
    { icon: '🎮', label: 'Sesi Permainan', desc: 'Cipta dan urus sesi permainan', key: 'sessions', color: '#eff6ff', accent: '#01306B' },
    { icon: '👥', label: 'Pemain', desc: 'Lihat semua pemain dan kemajuan', key: 'students', color: '#f0fdf4', accent: '#16a34a' },
    { icon: '📹', label: 'Video Pembelajaran', desc: 'Tambah dan edit video pembelajaran', key: 'videos', color: '#fdf4ff', accent: '#9333ea' },
    { icon: '💡', label: 'Tahukah Anda?', desc: 'Urus fakta pergigian', key: 'facts', color: '#fff7ed', accent: '#ea580c' },
    { icon: '📈', label: 'Analitik', desc: 'Lihat markah dan muat turun laporan', key: 'analytics', color: '#f0fdfa', accent: '#0d9488' },
    { icon: '❓', label: 'Soalan Kuiz', desc: 'Urus soalan kuiz', key: 'quiz', color: '#FEF9EE', accent: '#D4A843' },
    { icon: '🧩', label: 'Teka Silang Kata', desc: 'Urus perkataan teka silang kata', key: 'crossword', color: '#f5f3ff', accent: '#7c3aed' },
    { icon: '💬', label: 'Sembang Pemain', desc: 'Balas mesej pelajar', key: 'chat', color: '#f0f9ff', accent: '#0284c7' },
    { icon: '🏢', label: 'Sembang Staf', desc: 'Berbual dengan pentadbir lain', key: 'staffchat', color: '#FFF7ED', accent: '#B45309' },
    { icon: '👨‍💼', label: 'Urus Pentadbir', desc: 'Urus akaun pentadbir dan guru', key: 'admins', color: '#f5f3ff', accent: '#6d28d9' },
    { icon: '✉️', label: 'Peti Masuk', desc: 'Lihat mesej e-mel', key: 'email', color: '#FEF2F2', accent: '#CC0000' },
    { icon: '📋', label: 'Log Aktiviti', desc: 'Lihat log aktiviti sistem', key: 'activity', color: '#f0f9ff', accent: '#0369a1' },
  ];

  // Filter cards to only show items the user has access to
  const menuKeys = menu.map(m => m.key);
  const cards = allCards.filter(c => menuKeys.includes(c.key));

  return (
    <div>
      <div style={styles.welcomeCard}>
        <div style={styles.welcomeCardInner}>
          <div>
            <h2 style={styles.welcomeTitle}>Selamat sejahtera, {admin?.name}! 🌺</h2>
            <p style={styles.welcomeSubtitle}>
              {admin?.role === 'main_admin'
                ? '⭐ Anda telah log masuk sebagai Pentadbir Utama — akses penuh diaktifkan.'
                : admin?.role === 'teacher'
                  ? '👩‍🏫 Anda telah log masuk sebagai Guru — urus sembang dan lihat analitik.'
                  : 'Urus program kesihatan pergigian anda dari sini.'}
            </p>
          </div>
          <div style={styles.welcomeEmoji}>🦷</div>
        </div>
      </div>
      <div style={styles.overviewGrid}>
        {cards.map((card, i) => (
          <div key={i} style={{ ...styles.overviewCard, background: card.color, cursor: 'pointer' }} onClick={() => setActive(card.key)}>
            <div style={styles.overviewCardTop}>
              <div style={{ ...styles.overviewIconWrap, background: card.accent }}>{card.icon}</div>
            </div>
            <h3 style={{ ...styles.overviewLabel, color: card.accent }}>{card.label}</h3>
            <p style={styles.overviewDesc}>{card.desc}</p>
            <div style={{ ...styles.overviewGo, color: card.accent }}>Pergi →</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  profileBtn: { background: '#01306B', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.45rem 1rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', transition: 'all 0.2s' },
  layout: { display: 'flex', height: '100vh', width: '100vw', background: '#FFF9F0', fontFamily: '"Outfit", sans-serif', overflow: 'hidden', position: 'fixed', inset: 0, isolation: 'isolate' },
  sidebar: { width: '275px', background: 'linear-gradient(180deg, #01306B 0%, #012550 100%)', display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh', overflowY: 'auto' },
  sidebarAccent: { height: '4px', background: 'linear-gradient(90deg, #D4A843, #FFD700, #D4A843)', flexShrink: 0 },
  sidebarTop: { padding: '1.5rem' },
  logo: { color: '#FFD700', fontSize: '1.4rem', fontWeight: '800', marginBottom: '1.5rem', letterSpacing: '-0.02em' },
  adminInfo: { display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.08)', padding: '0.85rem', borderRadius: '14px', border: '1px solid rgba(212,168,67,0.2)' },
  adminAvatar: { width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #D4A843, #FFD700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#01306B', fontSize: '1.1rem', flexShrink: 0 },
  adminName: { color: '#fff', fontWeight: '600', fontSize: '0.92rem' },
  adminRole: { color: '#D4A843', fontSize: '0.78rem', fontWeight: '500' },
  nav: { padding: '1rem 0.75rem', flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.7rem 1rem', borderRadius: '12px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem', fontWeight: '500', cursor: 'pointer', marginBottom: '0.2rem', textAlign: 'left', transition: 'all 0.2s' },
  navItemActive: { background: 'rgba(212,168,67,0.15)', color: '#FFD700', borderLeft: '3px solid #FFD700' },
  navIcon: { fontSize: '1.1rem', width: '22px', textAlign: 'center' },
  logoutBtn: { margin: '1rem', padding: '0.75rem', background: 'rgba(204,0,0,0.15)', color: '#FF6B6B', border: '1px solid rgba(204,0,0,0.2)', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem', transition: 'all 0.2s' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', width: '100%' },
  topBar: { background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', padding: '0.85rem clamp(0.75rem, 2vw, 2rem)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid rgba(212,168,67,0.15)', flexShrink: 0, gap: '0.5rem' },
  pageTitle: { fontSize: '1.3rem', fontWeight: '700', color: '#01306B', margin: 0 },
  welcomeText: { color: '#64748b', fontSize: '0.9rem' },
  content: { padding: 'clamp(1rem, 3vw, 2rem)', flex: 1, overflowY: 'auto', boxSizing: 'border-box', width: '100%' },
  welcomeCard: { background: 'linear-gradient(135deg, #01306B, #1e5aad)', borderRadius: '20px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 8px 24px rgba(1,48,107,0.2)' },
  welcomeCardInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  welcomeTitle: { fontSize: '1.5rem', fontWeight: '700', color: '#FFD700', margin: '0 0 0.5rem' },
  welcomeSubtitle: { color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.95rem', maxWidth: '500px', lineHeight: 1.6 },
  welcomeEmoji: { fontSize: '4rem', opacity: 0.3 },
  overviewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' },
  overviewCard: { padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(212,168,67,0.15)', transition: 'all 0.3s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' },
  overviewCardTop: { marginBottom: '1rem' },
  overviewIconWrap: { width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#fff' },
  overviewLabel: { fontSize: '1.05rem', fontWeight: '700', margin: '0 0 0.4rem' },
  overviewDesc: { color: '#64748b', fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: 1.5 },
  overviewGo: { fontSize: '0.85rem', fontWeight: '700' },
};

export default AdminDashboard;
