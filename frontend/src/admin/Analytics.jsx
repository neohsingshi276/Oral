import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#e11d48', '#9333ea', '#0d9488'];

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    api.get('/admin/analytics')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const downloadCSV = () => {
    const token = localStorage.getItem('token');
    window.open(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/api/admin/download-csv?token=${token}`);
  };

  if (loading) return <div style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>Loading analytics... 📊</div>;

  const completionData = [
    { name: 'Checkpoint 1', completed: data?.cp1_completed || 0, total: data?.total_players || 0, rate: data?.total_players ? Math.round((data.cp1_completed / data.total_players) * 100) : 0 },
    { name: 'Checkpoint 2', completed: data?.cp2_completed || 0, total: data?.total_players || 0, rate: data?.total_players ? Math.round((data.cp2_completed / data.total_players) * 100) : 0 },
    { name: 'Checkpoint 3', completed: data?.cp3_completed || 0, total: data?.total_players || 0, rate: data?.total_players ? Math.round((data.cp3_completed / data.total_players) * 100) : 0 },
  ];

  const attemptData = [
    { name: 'CP1', avgAttempts: data?.players?.length ? (data.players.reduce((s, p) => s + (p.cp1_attempts || 0), 0) / data.players.length).toFixed(1) : 0 },
    { name: 'CP2', avgAttempts: data?.players?.length ? (data.players.reduce((s, p) => s + (p.cp2_attempts || 0), 0) / data.players.length).toFixed(1) : 0 },
    { name: 'CP3', avgAttempts: data?.players?.length ? (data.players.reduce((s, p) => s + (p.cp3_attempts || 0), 0) / data.players.length).toFixed(1) : 0 },
  ];

  const sessionMap = {};
  data?.players?.forEach(p => {
    if (!sessionMap[p.session_name]) sessionMap[p.session_name] = { name: p.session_name, players: 0, cp1: 0, cp2: 0, cp3: 0 };
    sessionMap[p.session_name].players++;
    if (p.cp1_completed) sessionMap[p.session_name].cp1++;
    if (p.cp2_completed) sessionMap[p.session_name].cp2++;
    if (p.cp3_completed) sessionMap[p.session_name].cp3++;
  });
  const sessionData = Object.values(sessionMap);

  const timelineMap = {};
  data?.players?.forEach(p => {
    const date = new Date(p.joined_at).toLocaleDateString();
    timelineMap[date] = (timelineMap[date] || 0) + 1;
  });
  const timelineData = Object.entries(timelineMap).map(([date, count]) => ({ date, players: count })).sort((a, b) => new Date(a.date) - new Date(b.date));

  const leaderboard = [...(data?.players || [])].map(p => ({
    ...p,
    totalCompleted: (p.cp1_completed ? 1 : 0) + (p.cp2_completed ? 1 : 0) + (p.cp3_completed ? 1 : 0),
    totalAttempts: (p.cp1_attempts || 0) + (p.cp2_attempts || 0) + (p.cp3_attempts || 0),
  })).sort((a, b) => b.totalCompleted - a.totalCompleted || a.totalAttempts - b.totalAttempts);

  const pieData = [
    { name: 'Completed All', value: data?.cp3_completed || 0 },
    { name: 'In Progress', value: Math.max(0, (data?.total_players || 0) - (data?.cp3_completed || 0)) },
  ];

  const TABS = [
    { key: 'overview', label: '📊 Overview' },
    { key: 'completion', label: '📈 Completion' },
    { key: 'attempts', label: '🔁 Attempts' },
    { key: 'sessions', label: '🔀 Sessions' },
    { key: 'timeline', label: '📅 Timeline' },
    { key: 'leaderboard', label: '🏆 Leaderboard' },
  ];

  return (
    <div>
      {/* Summary Cards */}
      <div style={s.statsGrid}>
        {[
          { label: 'Total Players', value: data?.total_players || 0, icon: '👥', color: '#eff6ff', accent: '#2563eb' },
          { label: 'Total Sessions', value: data?.total_sessions || 0, icon: '🎮', color: '#f0fdf4', accent: '#16a34a' },
          { label: 'CP1 Completed', value: data?.cp1_completed || 0, icon: '🏁', color: '#fdf4ff', accent: '#9333ea' },
          { label: 'CP2 Completed', value: data?.cp2_completed || 0, icon: '🏁', color: '#fff7ed', accent: '#ea580c' },
          { label: 'CP3 Completed', value: data?.cp3_completed || 0, icon: '🏆', color: '#f0fdfa', accent: '#0d9488' },
        ].map((stat, i) => (
          <div key={i} style={{ ...s.statCard, background: stat.color }}>
            <div style={s.statIcon}>{stat.icon}</div>
            <div style={{ ...s.statValue, color: stat.accent }}>{stat.value}</div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map(tab => (
          <button key={tab.key} style={{ ...s.tab, ...(activeTab === tab.key ? s.tabActive : {}) }} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div style={s.grid2}>
          <div style={s.card}>
            <h3 style={s.cardTitle}>Completion Rate by Checkpoint</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={completionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(val) => [`${val}%`, 'Completion Rate']} />
                <Bar dataKey="rate" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={s.card}>
            <h3 style={s.cardTitle}>Overall Progress</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Completion */}
      {activeTab === 'completion' && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>📈 Completion Rate per Checkpoint</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={completionData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="completed" name="Completed" fill="#2563eb" radius={[6, 6, 0, 0]} />
              <Bar yAxisId="right" dataKey="rate" name="Rate %" fill="#16a34a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={s.completionCards}>
            {completionData.map((cp, i) => (
              <div key={i} style={s.cpCard}>
                <div style={s.cpName}>{cp.name}</div>
                <div style={s.cpBar}>
                  <div style={{ ...s.cpBarFill, width: `${cp.rate}%`, background: COLORS[i] }} />
                </div>
                <div style={s.cpRate}>{cp.rate}% ({cp.completed}/{cp.total})</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attempts */}
      {activeTab === 'attempts' && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>🔁 Average Attempts per Checkpoint</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={attemptData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(val) => [`${val} avg attempts`]} />
              <Bar dataKey="avgAttempts" name="Avg Attempts" radius={[6, 6, 0, 0]}>
                {attemptData.map((entry, i) => <Cell key={i} fill={parseFloat(entry.avgAttempts) > 2 ? '#e11d48' : parseFloat(entry.avgAttempts) > 1 ? '#f59e0b' : '#16a34a'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={s.legend}>
            <span style={{ ...s.legendDot, background: '#16a34a' }} /> Easy (≤1 attempt)
            <span style={{ ...s.legendDot, background: '#f59e0b', marginLeft: '1rem' }} /> Medium (1-2)
            <span style={{ ...s.legendDot, background: '#e11d48', marginLeft: '1rem' }} /> Hard (&gt;2)
          </div>
        </div>
      )}

      {/* Sessions */}
      {activeTab === 'sessions' && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>🔀 Session Comparison</h3>
          {sessionData.length === 0 ? <p style={s.muted}>No session data yet.</p> : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={sessionData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" angle={-30} textAnchor="end" fontSize={11} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="players" name="Total Players" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cp1" name="CP1 Done" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cp2" name="CP2 Done" fill="#9333ea" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cp3" name="CP3 Done" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Timeline */}
      {activeTab === 'timeline' && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>📅 Player Activity Timeline</h3>
          {timelineData.length === 0 ? <p style={s.muted}>No activity data yet.</p> : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="players" name="Players Joined" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ ...s.cardTitle, margin: 0 }}>🏆 Leaderboard</h3>
            <button style={s.downloadBtn} onClick={downloadCSV}>📥 Download Full Report (CSV)</button>
          </div>
          <p style={s.hint}>Ranked by most checkpoints completed, then fewest attempts.</p>
          <table style={s.table}>
            <thead><tr style={s.thead}>
              <th style={s.th}>Rank</th>
              <th style={s.th}>Nickname</th>
              <th style={s.th}>Session</th>
              <th style={s.th}>Checkpoints Done</th>
              <th style={s.th}>Total Attempts</th>
            </tr></thead>
            <tbody>
              {leaderboard.map((p, i) => (
                <tr key={p.id} style={i < 3 ? { ...s.trEven, background: ['#fef9ee', '#f8fafc', '#fafafa'][i] } : (i % 2 === 0 ? s.trEven : {})}>
                  <td style={s.td}><span style={s.rank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span></td>
                  <td style={s.td}><strong>{p.nickname}</strong></td>
                  <td style={s.td}>{p.session_name}</td>
                  <td style={s.td}>
                    <span style={p.totalCompleted === 3 ? s.badgeGold : p.totalCompleted > 0 ? s.badgeGreen : s.badgeGray}>
                      {p.totalCompleted}/3 {p.totalCompleted === 3 ? '🏆' : ''}
                    </span>
                  </td>
                  <td style={s.td}>{p.totalAttempts}</td>
                </tr>
              ))}
              {leaderboard.length === 0 && <tr><td colSpan="5" style={{ ...s.td, textAlign: 'center', color: '#94a3b8' }}>No players yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Download Bar */}
      <div style={s.downloadBar}>
        <button style={s.downloadBtn} onClick={downloadCSV}>⬇️ Download Full Report (CSV)</button>
      </div>
    </div>
  );
};

const s = {
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' },
  statCard: { padding: '1.25rem', borderRadius: '16px', textAlign: 'center', border: '1px solid #e2e8f0' },
  statIcon: { fontSize: '1.8rem', marginBottom: '0.5rem' },
  statValue: { fontSize: '2rem', fontWeight: '800', lineHeight: 1 },
  statLabel: { color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' },
  tabs: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  tab: { padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' },
  tabActive: { background: '#2563eb', color: '#fff', border: '1px solid #2563eb' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' },
  card: { background: '#fff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: '1.05rem', fontWeight: '700', color: '#1e3a5f', margin: '0 0 1.25rem' },
  completionCards: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' },
  cpCard: { display: 'flex', alignItems: 'center', gap: '1rem' },
  cpName: { width: '120px', fontSize: '0.88rem', fontWeight: '600', color: '#475569', flexShrink: 0 },
  cpBar: { flex: 1, height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' },
  cpBarFill: { height: '100%', borderRadius: '6px', transition: 'width 0.5s ease' },
  cpRate: { width: '100px', fontSize: '0.82rem', color: '#64748b', textAlign: 'right', flexShrink: 0 },
  legend: { display: 'flex', alignItems: 'center', marginTop: '1rem', fontSize: '0.85rem', color: '#64748b', flexWrap: 'wrap', gap: '0.25rem' },
  legendDot: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', marginRight: '4px' },
  hint: { color: '#64748b', fontSize: '0.88rem', margin: '0 0 1rem' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f8fafc' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: '600', color: '#64748b', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '0.75rem 1rem', fontSize: '0.88rem', color: '#334155', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  trEven: { background: '#fafafa' },
  rank: { fontSize: '1.1rem' },
  badgeGold: { background: '#fef9ee', color: '#b45309', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600' },
  badgeGreen: { background: '#f0fdf4', color: '#16a34a', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600' },
  badgeGray: { background: '#f1f5f9', color: '#94a3b8', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.82rem' },
  downloadBar: { display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' },
  downloadBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.65rem 1.5rem', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' },
  muted: { color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' },
};

export default Analytics;
