import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const COPY = {
  bm: {
    tabs: { monitoring: 'Pemantauan Admin', logs: 'Log Aktiviti' },
    monitoringTitle: 'Pemantauan Sesi Admin',
    monitoringSubtitle: 'Pantau aktiviti sesi permainan setiap admin. Sesi patut dijalankan sekurang-kurangnya setiap 3 bulan.',
    logsTitle: 'Log Aktiviti Admin',
    search: 'Cari nama, e-mel, tindakan atau butiran...',
    allRoles: 'Semua peranan',
    allActions: 'Semua jenis log',
    allDates: 'Semua tarikh',
    today: 'Hari ini',
    week: '7 hari',
    month: '30 hari',
    totalLogs: 'Jumlah Log',
    adminsTracked: 'Admin Dipantau',
    overdue: 'Lewat',
    noSessions: 'Tiada Sesi',
    totalSessions: 'Jumlah Sesi',
    lastSession: 'Sesi Terakhir',
    never: 'Tidak Pernah',
    active: 'Aktif',
    overdueText: 'Lewat',
    noSessionsYet: 'Tiada sesi lagi',
    daysAgo: 'hari lalu',
    noAdmins: 'Tiada admin dijumpai',
    noLogs: 'Tiada log aktiviti dijumpai',
    legendActive: 'Aktif (dalam 90 hari)',
    legendOverdue: 'Lewat (90+ hari)',
    legendNone: 'Tiada sesi lagi',
    role: { main_admin: 'Pentadbir Utama', admin: 'Pentadbir', teacher: 'Guru' },
    category: {
      session: 'Sesi',
      email: 'E-mel',
      invitation: 'Jemputan',
      password: 'Kata Laluan',
      analytics: 'Analitik',
      account: 'Akaun',
      data: 'Data',
      other: 'Lain-lain',
    },
  },
  bi: {
    tabs: { monitoring: 'Admin Monitoring', logs: 'Activity Logs' },
    monitoringTitle: 'Admin Session Monitoring',
    monitoringSubtitle: 'Monitor each admin’s game-session activity. Sessions should be held at least every 3 months.',
    logsTitle: 'Admin Activity Logs',
    search: 'Search name, email, action, or details...',
    allRoles: 'All roles',
    allActions: 'All log types',
    allDates: 'All dates',
    today: 'Today',
    week: '7 days',
    month: '30 days',
    totalLogs: 'Total Logs',
    adminsTracked: 'Admins Tracked',
    overdue: 'Overdue',
    noSessions: 'No Sessions',
    totalSessions: 'Total Sessions',
    lastSession: 'Last Session',
    never: 'Never',
    active: 'Active',
    overdueText: 'Overdue',
    noSessionsYet: 'No sessions yet',
    daysAgo: 'days ago',
    noAdmins: 'No admins found',
    noLogs: 'No activity logs found',
    legendActive: 'Active (within 90 days)',
    legendOverdue: 'Overdue (90+ days)',
    legendNone: 'No sessions yet',
    role: { main_admin: 'Main Admin', admin: 'Admin', teacher: 'Teacher' },
    category: {
      session: 'Session',
      email: 'Email',
      invitation: 'Invitation',
      password: 'Password',
      analytics: 'Analytics',
      account: 'Account',
      data: 'Data',
      other: 'Other',
    },
  },
};

const getCategory = (action = '') => {
  const value = action.toLowerCase();
  if (value.includes('session')) return 'session';
  if (value.includes('email') || value.includes('reminder')) return 'email';
  if (value.includes('invitation') || value.includes('invite')) return 'invitation';
  if (value.includes('password') || value.includes('otp')) return 'password';
  if (value.includes('comparison') || value.includes('analytics')) return 'analytics';
  if (value.includes('login') || value.includes('profile') || value.includes('role') || value.includes('admin')) return 'account';
  if (value.includes('download') || value.includes('csv') || value.includes('delete')) return 'data';
  return 'other';
};

const roleColor = (role) => role === 'main_admin' ? '#7c3aed' : role === 'teacher' ? '#D4A843' : '#2563eb';

const ActivityLog = () => {
  const { language } = useLanguage();
  const c = COPY[language];
  const [logs, setLogs] = useState([]);
  const [monitoring, setMonitoring] = useState([]);
  const [tab, setTab] = useState('monitoring');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    api.get('/activity/monitoring').then(res => setMonitoring(res.data.admins || []));
    api.get('/activity/logs').then(res => setLogs(res.data.logs || []));
  }, []);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const dateCutoff = dateFilter === 'today'
      ? new Date().setHours(0, 0, 0, 0)
      : dateFilter === 'week'
        ? now - 7 * 24 * 60 * 60 * 1000
        : dateFilter === 'month'
          ? now - 30 * 24 * 60 * 60 * 1000
          : null;

    return logs.filter(log => {
      const category = getCategory(log.action);
      const haystack = `${log.admin_name || ''} ${log.admin_email || ''} ${log.action || ''} ${log.details || ''}`.toLowerCase();
      if (q && !haystack.includes(q)) return false;
      if (roleFilter !== 'all' && log.role !== roleFilter) return false;
      if (categoryFilter !== 'all' && category !== categoryFilter) return false;
      if (dateCutoff && new Date(log.created_at).getTime() < dateCutoff) return false;
      return true;
    });
  }, [logs, search, roleFilter, categoryFilter, dateFilter]);

  const overdueCount = monitoring.filter(admin => admin.is_overdue && admin.total_sessions > 0).length;
  const noSessionCount = monitoring.filter(admin => admin.total_sessions === 0).length;

  const getStatus = (admin) => {
    if (admin.total_sessions === 0) return { color: '#e11d48', text: c.noSessionsYet };
    if (admin.is_overdue) return { color: '#f59e0b', text: `${c.overdueText} (${admin.days_since_last_session} ${c.daysAgo})` };
    return { color: '#16a34a', text: `${c.active} (${admin.days_since_last_session} ${c.daysAgo})` };
  };

  return (
    <div>
      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(tab === 'monitoring' ? s.tabActive : {}) }} onClick={() => setTab('monitoring')}>{c.tabs.monitoring}</button>
        <button style={{ ...s.tab, ...(tab === 'logs' ? s.tabActive : {}) }} onClick={() => setTab('logs')}>{c.tabs.logs}</button>
      </div>

      <div style={s.summaryGrid}>
        <Metric label={c.totalLogs} value={logs.length} />
        <Metric label={c.adminsTracked} value={monitoring.length} />
        <Metric label={c.overdue} value={overdueCount} accent="#f59e0b" />
        <Metric label={c.noSessions} value={noSessionCount} accent="#e11d48" />
      </div>

      {tab === 'monitoring' && (
        <section style={s.panel}>
          <div style={s.header}>
            <div>
              <h2 style={s.title}>{c.monitoringTitle}</h2>
              <p style={s.subtitle}>{c.monitoringSubtitle}</p>
            </div>
          </div>

          <div style={s.monitorGrid}>
            {monitoring.map(admin => {
              const status = getStatus(admin);
              return (
                <div key={admin.id} style={{ ...s.monitorCard, borderLeftColor: status.color }}>
                  <div style={s.personRow}>
                    <div style={s.avatar}>{admin.name?.[0]?.toUpperCase()}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={s.personName}>{admin.name}</div>
                      <div style={s.email}>{admin.email}</div>
                    </div>
                    <span style={{ ...s.roleBadge, background: roleColor(admin.role) }}>{c.role[admin.role] || admin.role}</span>
                  </div>
                  <div style={s.statRow}>
                    <div style={s.statBox}>
                      <strong>{admin.total_sessions}</strong>
                      <span>{c.totalSessions}</span>
                    </div>
                    <div style={s.statBox}>
                      <strong>{admin.last_session_date ? new Date(admin.last_session_date).toLocaleDateString() : c.never}</strong>
                      <span>{c.lastSession}</span>
                    </div>
                  </div>
                  <div style={{ ...s.status, color: status.color, background: `${status.color}18` }}>{status.text}</div>
                </div>
              );
            })}
            {monitoring.length === 0 && <p style={s.empty}>{c.noAdmins}</p>}
          </div>

          <div style={s.legend}>
            <Legend color="#16a34a" label={c.legendActive} />
            <Legend color="#f59e0b" label={c.legendOverdue} />
            <Legend color="#e11d48" label={c.legendNone} />
          </div>
        </section>
      )}

      {tab === 'logs' && (
        <section style={s.panel}>
          <div style={s.header}>
            <h2 style={s.title}>{c.logsTitle}</h2>
          </div>
          <div style={s.filters}>
            <input style={s.search} value={search} onChange={e => setSearch(e.target.value)} placeholder={c.search} />
            <select style={s.select} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="all">{c.allRoles}</option>
              <option value="main_admin">{c.role.main_admin}</option>
              <option value="admin">{c.role.admin}</option>
              <option value="teacher">{c.role.teacher}</option>
            </select>
            <select style={s.select} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="all">{c.allActions}</option>
              {Object.keys(c.category).map(key => <option key={key} value={key}>{c.category[key]}</option>)}
            </select>
            <select style={s.select} value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
              <option value="all">{c.allDates}</option>
              <option value="today">{c.today}</option>
              <option value="week">{c.week}</option>
              <option value="month">{c.month}</option>
            </select>
          </div>

          <div style={s.logList}>
            {filteredLogs.map(log => {
              const category = getCategory(log.action);
              return (
                <article key={log.id} style={s.logItem}>
                  <div style={s.avatar}>{log.admin_name?.[0]?.toUpperCase()}</div>
                  <div style={s.logContent}>
                    <div style={s.logTop}>
                      <strong>{log.admin_name}</strong>
                      <span style={{ ...s.roleBadge, background: roleColor(log.role) }}>{c.role[log.role] || log.role}</span>
                      <span style={s.categoryBadge}>{c.category[category]}</span>
                      <time style={s.time}>{new Date(log.created_at).toLocaleString()}</time>
                    </div>
                    <div style={s.action}>{log.action}</div>
                    {log.details && <div style={s.details}>{log.details}</div>}
                  </div>
                </article>
              );
            })}
            {filteredLogs.length === 0 && <p style={s.empty}>{c.noLogs}</p>}
          </div>
        </section>
      )}
    </div>
  );
};

const Metric = ({ label, value, accent = '#2563eb' }) => (
  <div style={s.metric}>
    <strong style={{ color: accent }}>{value}</strong>
    <span>{label}</span>
  </div>
);

const Legend = ({ color, label }) => (
  <div style={s.legendItem}>
    <span style={{ ...s.legendDot, background: color }} />
    {label}
  </div>
);

const s = {
  tabs: { display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' },
  tab: { padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #dbe3ee', background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem' },
  tabActive: { background: '#1e3a5f', color: '#fff', borderColor: '#1e3a5f' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1rem' },
  metric: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' },
  panel: { background: '#fff', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' },
  title: { fontSize: '1.1rem', fontWeight: 800, color: '#1e3a5f', margin: 0 },
  subtitle: { color: '#64748b', fontSize: '0.88rem', margin: '0.25rem 0 0' },
  monitorGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.9rem' },
  monitorCard: { background: '#fbfdff', border: '1px solid #e2e8f0', borderLeft: '4px solid #16a34a', borderRadius: '10px', padding: '1rem' },
  personRow: { display: 'grid', gridTemplateColumns: '40px minmax(0, 1fr) auto', alignItems: 'center', gap: '0.7rem', marginBottom: '0.9rem' },
  avatar: { width: 40, height: 40, borderRadius: '50%', background: '#1e3a5f', color: '#FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 },
  personName: { fontWeight: 800, color: '#1e3a5f', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  email: { color: '#64748b', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  roleBadge: { color: '#fff', fontSize: '0.68rem', padding: '0.16rem 0.45rem', borderRadius: '999px', fontWeight: 800, whiteSpace: 'nowrap' },
  statRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' },
  statBox: { background: '#fff', border: '1px solid #e8eef6', borderRadius: '8px', padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', textAlign: 'center', color: '#1e3a5f' },
  status: { borderRadius: '8px', padding: '0.4rem 0.65rem', textAlign: 'center', fontWeight: 800, fontSize: '0.78rem' },
  legend: { display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem', background: '#f8fafc', borderRadius: '8px', padding: '0.75rem' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569', fontSize: '0.8rem', fontWeight: 600 },
  legendDot: { width: 10, height: 10, borderRadius: '50%' },
  filters: { display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) repeat(3, minmax(140px, 180px))', gap: '0.65rem', marginBottom: '1rem' },
  search: { padding: '0.6rem 0.85rem', border: '1px solid #dbe3ee', borderRadius: '8px', fontSize: '0.88rem', outline: 'none', minWidth: 0 },
  select: { padding: '0.6rem 0.75rem', border: '1px solid #dbe3ee', borderRadius: '8px', fontSize: '0.86rem', background: '#fff', color: '#334155', outline: 'none' },
  logList: { display: 'flex', flexDirection: 'column', gap: '0.55rem', maxHeight: '560px', overflowY: 'auto' },
  logItem: { display: 'flex', gap: '0.75rem', background: '#fbfdff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem' },
  logContent: { flex: 1, minWidth: 0 },
  logTop: { display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', color: '#1e3a5f', fontSize: '0.85rem', marginBottom: '0.3rem' },
  categoryBadge: { background: '#eef6ff', color: '#2563eb', borderRadius: '999px', padding: '0.15rem 0.45rem', fontSize: '0.68rem', fontWeight: 800 },
  time: { marginLeft: 'auto', color: '#94a3b8', fontSize: '0.74rem' },
  action: { color: '#1e293b', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.2rem' },
  details: { color: '#64748b', fontSize: '0.8rem', lineHeight: 1.45 },
  empty: { color: '#94a3b8', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' },
};

export default ActivityLog;
