import { useState, useEffect } from 'react';
import api from '../services/api';

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [monitoring, setMonitoring] = useState([]);
  const [tab, setTab] = useState('monitoring');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.get('/activity/monitoring').then(res => setMonitoring(res.data.admins));
    api.get('/activity/logs').then(res => setLogs(res.data.logs));
  }, []);

  const filtered = logs.filter(l =>
    l.admin_name?.toLowerCase().includes(filter.toLowerCase()) ||
    l.action?.toLowerCase().includes(filter.toLowerCase())
  );

  const getOverdueColor = (admin) => {
    if (admin.total_sessions === 0) return '#e11d48';
    if (admin.is_overdue) return '#f59e0b';
    return '#16a34a';
  };

  const getOverdueText = (admin) => {
    if (admin.total_sessions === 0) return 'No sessions yet';
    if (admin.is_overdue) return `⚠️ Overdue (${admin.days_since_last_session} days ago)`;
    return `✅ Active (${admin.days_since_last_session} days ago)`;
  };

  return (
    <div>
      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(tab === 'monitoring' ? s.tabActive : {}) }} onClick={() => setTab('monitoring')}>📊 Admin Monitoring</button>
        <button style={{ ...s.tab, ...(tab === 'logs' ? s.tabActive : {}) }} onClick={() => setTab('logs')}>📋 Activity Logs</button>
      </div>

      {/* MONITORING */}
      {tab === 'monitoring' && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>📊 Admin Session Monitoring</h2>
          <p style={s.subtitle}>Monitor when each admin last conducted a game session. Sessions should be held every 3 months.</p>

          <div style={s.monitorGrid}>
            {monitoring.map(admin => (
              <div key={admin.id} style={{ ...s.monitorCard, borderLeft: `4px solid ${getOverdueColor(admin)}` }}>
                <div style={s.monitorTop}>
                  <div style={s.monitorAvatar}>{admin.name?.[0]?.toUpperCase()}</div>
                  <div style={s.monitorInfo}>
                    <div style={s.monitorName}>
                      {admin.name}
                      <span style={{ ...s.roleBadge, background: admin.role === 'main_admin' ? '#7c3aed' : '#2563eb' }}>
                        {admin.role === 'main_admin' ? '⭐ Main Admin' : 'Admin'}
                      </span>
                    </div>
                    <div style={s.monitorEmail}>{admin.email}</div>
                  </div>
                </div>
                <div style={s.monitorStats}>
                  <div style={s.monitorStat}>
                    <div style={s.monitorStatVal}>{admin.total_sessions}</div>
                    <div style={s.monitorStatLabel}>Total Sessions</div>
                  </div>
                  <div style={s.monitorStat}>
                    <div style={s.monitorStatVal}>
                      {admin.last_session_date ? new Date(admin.last_session_date).toLocaleDateString() : 'Never'}
                    </div>
                    <div style={s.monitorStatLabel}>Last Session</div>
                  </div>
                </div>
                <div style={{ ...s.statusBadge, color: getOverdueColor(admin), background: getOverdueColor(admin) + '15' }}>
                  {getOverdueText(admin)}
                </div>
              </div>
            ))}
            {monitoring.length === 0 && <p style={s.empty}>No admins found</p>}
          </div>

          {/* Legend */}
          <div style={s.legend}>
            <div style={s.legendItem}><div style={{ ...s.legendDot, background: '#16a34a' }} /> Active (within 90 days)</div>
            <div style={s.legendItem}><div style={{ ...s.legendDot, background: '#f59e0b' }} /> Overdue (90+ days)</div>
            <div style={s.legendItem}><div style={{ ...s.legendDot, background: '#e11d48' }} /> No sessions yet</div>
          </div>
        </div>
      )}

      {/* ACTIVITY LOGS */}
      {tab === 'logs' && (
        <div style={s.card}>
          <div style={s.logHeader}>
            <h2 style={{ ...s.cardTitle, margin: 0 }}>📋 Admin Activity Logs</h2>
            <input style={s.search} value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search by name or action..." />
          </div>
          <div style={s.logList}>
            {filtered.map(log => (
              <div key={log.id} style={s.logItem}>
                <div style={s.logAvatar}>{log.admin_name?.[0]?.toUpperCase()}</div>
                <div style={s.logContent}>
                  <div style={s.logAction}>
                    <strong>{log.admin_name}</strong> — {log.action}
                    <span style={{ ...s.roleBadge, background: log.role === 'main_admin' ? '#7c3aed' : '#2563eb', fontSize: '0.65rem', marginLeft: '0.4rem' }}>
                      {log.role === 'main_admin' ? 'Main Admin' : 'Admin'}
                    </span>
                  </div>
                  {log.details && <div style={s.logDetails}>{log.details}</div>}
                  <div style={s.logTime}>{new Date(log.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p style={s.empty}>No activity logs found</p>}
          </div>
        </div>
      )}
    </div>
  );
};

const s = {
  tabs: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' },
  tab: { padding: '0.5rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: '500', fontSize: '0.9rem' },
  tabActive: { background: '#2563eb', color: '#fff', border: '1px solid #2563eb' },
  card: { background: '#fff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: '1.1rem', fontWeight: '700', color: '#1e3a5f', margin: '0 0 0.5rem' },
  subtitle: { color: '#64748b', fontSize: '0.88rem', margin: '0 0 1.5rem' },
  monitorGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' },
  monitorCard: { background: '#fafafa', borderRadius: '12px', padding: '1.25rem', border: '1px solid #f1f5f9' },
  monitorTop: { display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' },
  monitorAvatar: { width: '44px', height: '44px', borderRadius: '50%', background: '#1e3a5f', color: '#FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.2rem', flexShrink: 0 },
  monitorInfo: { flex: 1 },
  monitorName: { fontWeight: '700', color: '#1e3a5f', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' },
  monitorEmail: { color: '#64748b', fontSize: '0.8rem' },
  roleBadge: { color: '#fff', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '6px', fontWeight: '700' },
  monitorStats: { display: 'flex', gap: '1rem', marginBottom: '0.75rem' },
  monitorStat: { flex: 1, textAlign: 'center', background: '#fff', borderRadius: '8px', padding: '0.5rem' },
  monitorStatVal: { fontWeight: '700', color: '#1e3a5f', fontSize: '0.9rem' },
  monitorStatLabel: { color: '#94a3b8', fontSize: '0.72rem' },
  statusBadge: { padding: '0.3rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '600', textAlign: 'center' },
  legend: { display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#475569' },
  legendDot: { width: '10px', height: '10px', borderRadius: '50%' },
  logHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem' },
  search: { padding: '0.5rem 0.9rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.88rem', outline: 'none', width: '250px' },
  logList: { display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '500px', overflowY: 'auto' },
  logItem: { display: 'flex', gap: '0.75rem', padding: '0.75rem', background: '#fafafa', borderRadius: '10px', border: '1px solid #f1f5f9' },
  logAvatar: { width: '32px', height: '32px', borderRadius: '50%', background: '#1e3a5f', color: '#FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.85rem', flexShrink: 0 },
  logContent: { flex: 1 },
  logAction: { fontSize: '0.88rem', color: '#1e293b', marginBottom: '0.2rem' },
  logDetails: { fontSize: '0.78rem', color: '#64748b', marginBottom: '0.2rem' },
  logTime: { fontSize: '0.72rem', color: '#94a3b8' },
  empty: { color: '#94a3b8', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' },
};

export default ActivityLog;
