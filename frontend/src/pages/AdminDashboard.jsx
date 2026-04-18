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

const AdminDashboard = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState('overview');
  const [showProfile, setShowProfile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const MENU = [
    { key: 'overview', icon: '📊', label: 'Overview' },
    { key: 'sessions', icon: '🎮', label: 'Game Sessions' },
    { key: 'students', icon: '👥', label: 'Players' },
    { key: 'chat', icon: '💬', label: 'Player Chat' },
    { key: 'staffchat', icon: '🏢', label: 'Staff Chat' },
    { key: 'videos', icon: '📹', label: 'Learning Videos' },
    { key: 'facts', icon: '💡', label: 'Did You Know?' },
    { key: 'quiz', icon: '❓', label: 'Quiz Questions' },
    { key: 'crossword', icon: '🧩', label: 'Crossword Words' },
    { key: 'analytics', icon: '📈', label: 'Analytics' },
    { key: 'admins', icon: '👨‍💼', label: 'Manage Admins' },
    { key: 'email', icon: '✉️', label: admin?.role === 'main_admin' ? 'Email Reminders' : 'Inbox' },
    ...(admin?.role === 'main_admin' ? [{ key: 'activity', icon: '📋', label: 'Activity Log' }] : []),
  ];

  const handleLogout = () => { logout(); navigate('/'); };

  // Close sidebar when a nav item is clicked on mobile
  const handleNavClick = (key) => {
    setActive(key);
    setSidebarOpen(false);
  };

  const renderContent = () => {
    switch (active) {
      case 'overview': return <Overview admin={admin} setActive={setActive} />;
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
      default: return <Overview admin={admin} setActive={setActive} />;
    }
  };

  return (
    <div style={styles.layout}>
      <style>{`
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
        <div style={styles.sidebarTop}>
          <div style={styles.logo}>🦷 DentalQuest</div>
          <div style={styles.adminInfo}>
            <div style={styles.adminAvatar}>{admin?.name?.[0]?.toUpperCase()}</div>
            <div>
              <div style={styles.adminName}>{admin?.name}</div>
              <div style={styles.adminRole}>
                {admin?.role === 'main_admin' ? '⭐ Main Admin' : 'Admin'}
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
        <button style={styles.logoutBtn} onClick={handleLogout}>🚪 Logout</button>
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
            <span className="admin-welcome-text" style={styles.welcomeText}>Welcome back, {admin?.name}! 👋</span>
            <button style={styles.profileBtn} onClick={() => setShowProfile(true)}>
              👤 Profile
            </button>
          </div>
        </div>
        {showProfile && <ProfileSettings onClose={() => setShowProfile(false)} />}
        <div style={styles.content}>{renderContent()}</div>
      </div>
    </div>
  );
};

const Overview = ({ admin, setActive }) => {
  const cards = [
    { icon: '🎮', label: 'Game Sessions', desc: 'Create and manage game sessions', key: 'sessions', color: '#eff6ff', accent: '#2563eb' },
    { icon: '👥', label: 'Players', desc: 'View all players and progress', key: 'students', color: '#f0fdf4', accent: '#16a34a' },
    { icon: '📹', label: 'Learning Videos', desc: 'Add and edit learning videos', key: 'videos', color: '#fdf4ff', accent: '#9333ea' },
    { icon: '💡', label: 'Did You Know?', desc: 'Manage dental facts', key: 'facts', color: '#fff7ed', accent: '#ea580c' },
    { icon: '📈', label: 'Analytics', desc: 'View scores and download reports', key: 'analytics', color: '#f0fdfa', accent: '#0d9488' },
    { icon: '❓', label: 'Quiz Questions', desc: 'Manage quiz questions', key: 'quiz', color: '#fef9ee', accent: '#f59e0b' },
    { icon: '🧩', label: 'Crossword', desc: 'Manage crossword words', key: 'crossword', color: '#f5f3ff', accent: '#7c3aed' },
    { icon: '💬', label: 'Player Chat', desc: 'Reply to student messages', key: 'chat', color: '#f0f9ff', accent: '#0284c7' },
  ];
  return (
    <div>
      <div style={styles.welcomeCard}>
        <h2 style={styles.welcomeTitle}>Good day, {admin?.name}! 🦷</h2>
        <p style={styles.welcomeSubtitle}>
          {admin?.role === 'main_admin' ? '⭐ You are logged in as Main Admin — full access enabled.' : 'Manage your dental health programme from here.'}
        </p>
      </div>
      <div style={styles.overviewGrid}>
        {cards.map((card, i) => (
          <div key={i} style={{ ...styles.overviewCard, background: card.color, cursor: 'pointer' }} onClick={() => setActive(card.key)}>
            <div style={styles.overviewIcon}>{card.icon}</div>
            <h3 style={{ ...styles.overviewLabel, color: card.accent }}>{card.label}</h3>
            <p style={styles.overviewDesc}>{card.desc}</p>
            <div style={{ color: card.accent, fontSize: '0.85rem', fontWeight: '700' }}>Go →</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  profileBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' },
  layout: { display: 'flex', height: '100vh', width: '100vw', background: '#f8fafc', fontFamily: 'sans-serif', overflow: 'hidden', position: 'fixed', inset: 0, isolation: 'isolate' },
  sidebar: { width: '260px', background: '#1e3a5f', display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh', overflowY: 'auto' },
  sidebarTop: { padding: '1.5rem' },
  logo: { color: '#fff', fontSize: '1.3rem', fontWeight: '800', marginBottom: '1.5rem' },
  adminInfo: { display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '10px' },
  adminAvatar: { width: '36px', height: '36px', borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#fff', fontSize: '1rem', flexShrink: 0 },
  adminName: { color: '#fff', fontWeight: '600', fontSize: '0.9rem' },
  adminRole: { color: '#94a3b8', fontSize: '0.75rem' },
  nav: { padding: '1rem 0.75rem', flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: 'none', background: 'transparent', color: '#94a3b8', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer', marginBottom: '0.25rem', textAlign: 'left', transition: 'all 0.2s' },
  navItemActive: { background: 'rgba(255,255,255,0.15)', color: '#fff' },
  navIcon: { fontSize: '1.1rem', width: '20px', textAlign: 'center' },
  logoutBtn: { margin: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', width: '100%' },
  topBar: { background: '#fff', padding: '0.75rem clamp(0.75rem, 2vw, 2rem)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', flexShrink: 0, gap: '0.5rem' },
  pageTitle: { fontSize: '1.3rem', fontWeight: '700', color: '#1e3a5f', margin: 0 },
  welcomeText: { color: '#64748b', fontSize: '0.9rem' },
  content: { padding: 'clamp(1rem, 3vw, 2rem)', flex: 1, overflowY: 'auto', boxSizing: 'border-box', width: '100%' },
  welcomeCard: { background: 'linear-gradient(135deg, #dbeafe, #eff6ff)', borderRadius: '16px', padding: '1.5rem 2rem', marginBottom: '2rem' },
  welcomeTitle: { fontSize: '1.4rem', fontWeight: '700', color: '#1e3a5f', margin: '0 0 0.25rem' },
  welcomeSubtitle: { color: '#475569', margin: 0, fontSize: '0.95rem' },
  overviewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' },
  overviewCard: { padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', transition: 'transform 0.2s' },
  overviewIcon: { fontSize: '2rem', marginBottom: '0.75rem' },
  overviewLabel: { fontSize: '1rem', fontWeight: '700', margin: '0 0 0.4rem' },
  overviewDesc: { color: '#64748b', fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: 1.5 },
};

export default AdminDashboard;
