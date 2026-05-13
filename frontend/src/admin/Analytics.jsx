import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#e11d48', '#9333ea', '#0d9488'];

const CP_WEIGHT = 100 / 3;

const computeMarks = (players) => {
  const maxCP3 = Math.max(1, ...players.map(p => p.cp3_score || 0));
  return players.map(p => {
    const cp1Exact = (p.quiz_total > 0)
      ? (p.quiz_correct / p.quiz_total) * CP_WEIGHT
      : (p.quiz_score > 0 ? (p.quiz_score / Math.max(1, ...players.map(x => x.quiz_score || 0))) * CP_WEIGHT : 0);

    const cp2Exact = p.cp2_completed ? CP_WEIGHT : 0;
    const cp3Exact = p.cp3_score ? Math.min(CP_WEIGHT, (p.cp3_score / maxCP3) * CP_WEIGHT) : 0;
    const totalExact = cp1Exact + cp2Exact + cp3Exact;

    return {
      ...p,
      cp1_mark:   Math.round(cp1Exact),
      cp2_mark:   Math.round(cp2Exact),
      cp3_mark:   Math.round(cp3Exact),
      total_mark: totalExact >= 99.5 ? 100 : Math.floor(totalExact),
    };
  });
};

const Analytics = () => {
  const [data, setData]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState('overview');
  const [selectedSession, setSelectedSession] = useState('all');
  const [finalLeaderboard, setFinalLeaderboard] = useState([]);
  const [lbLoading, setLbLoading]         = useState(false);

  useEffect(() => {
    api.get('/admin/analytics')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard' && selectedSession !== 'all') {
      setLbLoading(true);
      api.get(`/cp3/final/${selectedSession}`)
        .then(res => setFinalLeaderboard(res.data.leaderboard || []))
        .catch(() => setFinalLeaderboard([]))
        .finally(() => setLbLoading(false));
    }
  }, [activeTab, selectedSession]);

  const downloadCSV = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${baseUrl}/admin/download-csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'data_pemain.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('Gagal memuat turun CSV. Sila cuba lagi.');
    }
  };

  if (loading) return <div style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>Memuatkan analitik... 📊</div>;

  const sessions = [...new Map(
    (data?.players || []).map(p => [p.session_id, { id: p.session_id, name: p.session_name }])
  ).values()].sort((a, b) => a.name.localeCompare(b.name));

  const filteredPlayers = selectedSession === 'all'
    ? (data?.players || [])
    : (data?.players || []).filter(p => String(p.session_id) === selectedSession);

  let markedPlayers;
  if (selectedSession === 'all') {
    const bySession = {};
    (data?.players || []).forEach(p => {
      if (!bySession[p.session_id]) bySession[p.session_id] = [];
      bySession[p.session_id].push(p);
    });
    markedPlayers = Object.values(bySession).flatMap(group => computeMarks(group));
  } else {
    markedPlayers = computeMarks(filteredPlayers);
  }

  const displayPlayers = selectedSession === 'all'
    ? markedPlayers
    : markedPlayers.filter(p => String(p.session_id) === selectedSession);

  const filteredCP1 = displayPlayers.filter(p => p.cp1_completed).length;
  const filteredCP2 = displayPlayers.filter(p => p.cp2_completed).length;
  const filteredCP3 = displayPlayers.filter(p => p.cp3_completed).length;

  const avgCP1Mark = displayPlayers.length
    ? Math.round(displayPlayers.reduce((s, p) => s + p.cp1_mark, 0) / displayPlayers.length) : 0;
  const avgCP2Mark = displayPlayers.length
    ? Math.round(displayPlayers.reduce((s, p) => s + p.cp2_mark, 0) / displayPlayers.length) : 0;
  const avgCP3Mark = displayPlayers.length
    ? Math.round(displayPlayers.reduce((s, p) => s + p.cp3_mark, 0) / displayPlayers.length) : 0;
  const avgTotal = displayPlayers.length
    ? Math.round(displayPlayers.reduce((s, p) => s + p.total_mark, 0) / displayPlayers.length) : 0;

  const completionData = [
    { name: 'CP1 Kuiz',          completed: filteredCP1, total: displayPlayers.length, rate: displayPlayers.length ? Math.round((filteredCP1 / displayPlayers.length) * 100) : 0, avgMark: avgCP1Mark },
    { name: 'CP2 Kata Silang',   completed: filteredCP2, total: displayPlayers.length, rate: displayPlayers.length ? Math.round((filteredCP2 / displayPlayers.length) * 100) : 0, avgMark: avgCP2Mark },
    { name: 'CP3 Permainan Makanan', completed: filteredCP3, total: displayPlayers.length, rate: displayPlayers.length ? Math.round((filteredCP3 / displayPlayers.length) * 100) : 0, avgMark: avgCP3Mark },
  ];

  const attemptData = [
    { name: 'CP1 Kuiz',          avgAttempts: displayPlayers.length ? (displayPlayers.reduce((s, p) => s + (p.cp1_attempts || 0), 0) / displayPlayers.length).toFixed(1) : 0 },
    { name: 'CP2 Kata Silang',   avgAttempts: displayPlayers.length ? (displayPlayers.reduce((s, p) => s + (p.cp2_attempts || 0), 0) / displayPlayers.length).toFixed(1) : 0 },
    { name: 'CP3 Permainan Makanan', avgAttempts: displayPlayers.length ? (displayPlayers.reduce((s, p) => s + (p.cp3_attempts || 0), 0) / displayPlayers.length).toFixed(1) : 0 },
  ];

  const sessionMap = {};
  markedPlayers.forEach(p => {
    if (!sessionMap[p.session_name]) sessionMap[p.session_name] = { name: p.session_name, players: 0, cp1: 0, cp2: 0, cp3: 0, avgMark: 0, totalMark: 0 };
    sessionMap[p.session_name].players++;
    if (p.cp1_completed) sessionMap[p.session_name].cp1++;
    if (p.cp2_completed) sessionMap[p.session_name].cp2++;
    if (p.cp3_completed) sessionMap[p.session_name].cp3++;
    sessionMap[p.session_name].totalMark += p.total_mark;
  });
  const sessionData = Object.values(sessionMap).map(s => ({
    ...s,
    avgMark: s.players ? Math.round(s.totalMark / s.players) : 0,
  }));

  const timelineMap = {};
  displayPlayers.forEach(p => {
    const date = new Date(p.joined_at).toLocaleDateString();
    timelineMap[date] = (timelineMap[date] || 0) + 1;
  });
  const timelineData = Object.entries(timelineMap)
    .map(([date, count]) => ({ date, players: count }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const pieData = [
    { name: 'Selesai Semua', value: filteredCP3 },
    { name: 'Sedang Berjalan', value: Math.max(0, displayPlayers.length - filteredCP3) },
  ];

  const allSessionsLeaderboard = [...displayPlayers]
    .sort((a, b) => b.total_mark - a.total_mark || a.nickname.localeCompare(b.nickname));

  const TABS = [
    { key: 'overview',    label: '📊 Ringkasan' },
    { key: 'completion',  label: '📈 Penyelesaian' },
    { key: 'attempts',    label: '🔁 Percubaan' },
    { key: 'sessions',    label: '🔀 Sesi' },
    { key: 'timeline',    label: '📅 Garis Masa' },
    { key: 'leaderboard', label: '🏆 Papan Pendahulu' },
  ];

  const markColor = (mark, max = 100) => {
    const pct = mark / max;
    if (pct >= 0.66) return { bg: '#f0fdf4', color: '#16a34a' };
    if (pct >= 0.33) return { bg: '#fffbeb', color: '#b45309' };
    return { bg: '#fff1f2', color: '#e11d48' };
  };

  return (
    <div>
      {/* Penapis Sesi */}
      <div style={s.filterBar}>
        <span style={s.filterLabel}>📌 Tapis mengikut Sesi:</span>
        <select
          style={s.filterSelect}
          value={selectedSession}
          onChange={e => setSelectedSession(e.target.value)}
        >
          <option value="all">Semua Sesi (Gabungan)</option>
          {sessions.map(sess => (
            <option key={sess.id} value={String(sess.id)}>{sess.name}</option>
          ))}
        </select>
        {selectedSession !== 'all' && (
          <button style={s.clearBtn} onClick={() => setSelectedSession('all')}>✕ Kosongkan</button>
        )}
      </div>

      {/* Kad Ringkasan */}
      <div style={s.statsGrid}>
        {[
          { label: 'Jumlah Pemain',  value: displayPlayers.length,                                                      icon: '👥', color: '#eff6ff', accent: '#2563eb' },
          { label: 'Jumlah Sesi',    value: selectedSession === 'all' ? (data?.total_sessions || 0) : 1,                icon: '🎮', color: '#f0fdf4', accent: '#16a34a' },
          { label: 'Purata Markah CP1', value: displayPlayers.length ? `${Math.round(avgCP1Mark / 33 * 100)}/100` : '—', icon: '❓', color: '#fdf4ff', accent: '#9333ea' },
          { label: 'Purata Markah CP2', value: displayPlayers.length ? `${Math.round(avgCP2Mark / 33 * 100)}/100` : '—', icon: '🧩', color: '#fff7ed', accent: '#ea580c' },
          { label: 'Purata Markah CP3', value: displayPlayers.length ? `${Math.round(avgCP3Mark / 33 * 100)}/100` : '—', icon: '🎮', color: '#f0fdfa', accent: '#0d9488' },
          { label: 'Purata Jumlah', value: displayPlayers.length ? `${avgTotal}/100` : '—',                             icon: '🏆', color: '#fefce8', accent: '#ca8a04' },
        ].map((stat, i) => (
          <div key={i} style={{ ...s.statCard, background: stat.color }}>
            <div style={s.statIcon}>{stat.icon}</div>
            <div style={{ ...s.statValue, color: stat.accent }}>{stat.value}</div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tab navigasi */}
      <div style={s.tabs}>
        {TABS.map(tab => (
          <button key={tab.key} style={{ ...s.tab, ...(activeTab === tab.key ? s.tabActive : {}) }} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ringkasan */}
      {activeTab === 'overview' && (
        <>
          <div style={s.grid2}>
            <div style={s.card}>
              <h3 style={s.cardTitle}>Kadar Penyelesaian mengikut Pusat Semak</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={completionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={12} domain={[0, 100]} />
                  <Tooltip formatter={(val) => [`${val}%`, 'Kadar Penyelesaian']} />
                  <Bar dataKey="rate" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={s.card}>
              <h3 style={s.cardTitle}>Kemajuan Keseluruhan</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Purata Markah Ringkasan */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>📋 Purata Markah setiap Pusat Semak (jumlah /100)</h3>
            <div style={s.markOverview}>
              {completionData.map((cp, i) => {
                const pct = (cp.avgMark / 33) * 100;
                const scaledMark = Math.round(pct);
                const col = pct >= 66 ? '#16a34a' : pct >= 33 ? '#f59e0b' : '#e11d48';
                return (
                  <div key={i} style={s.markCard}>
                    <div style={s.markCardTitle}>{cp.name}</div>
                    <div style={{ ...s.markCircle, borderColor: col, color: col }}>
                      <span style={s.markNum}>{scaledMark}</span>
                      <span style={s.markDen}>/100</span>
                    </div>
                    <div style={s.markBar}>
                      <div style={{ ...s.markBarFill, width: `${pct}%`, background: col }} />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem' }}>
                      {cp.completed}/{cp.total} selesai ({cp.rate}%)
                    </div>
                  </div>
                );
              })}
              <div style={s.markCard}>
                <div style={s.markCardTitle}>🏆 Purata Jumlah</div>
                <div style={{ ...s.markCircle, borderColor: '#2563eb', color: '#2563eb' }}>
                  <span style={s.markNum}>{avgTotal}</span>
                  <span style={s.markDen}>/100</span>
                </div>
                <div style={s.markBar}>
                  <div style={{ ...s.markBarFill, width: `${avgTotal}%`, background: '#2563eb' }} />
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem' }}>
                  daripada {displayPlayers.length} pemain
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Penyelesaian */}
      {activeTab === 'completion' && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>📈 Kadar Penyelesaian setiap Pusat Semak</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={completionData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left"  dataKey="completed" name="Pemain Selesai" fill="#2563eb" radius={[6, 6, 0, 0]} />
              <Bar yAxisId="right" dataKey="rate"      name="Kadar %"        fill="#16a34a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={s.completionCards}>
            {completionData.map((cp, i) => (
              <div key={i} style={s.cpCard}>
                <div style={s.cpName}>{cp.name}</div>
                <div style={s.cpBar}><div style={{ ...s.cpBarFill, width: `${cp.rate}%`, background: COLORS[i] }} /></div>
                <div style={s.cpRate}>{cp.rate}% ({cp.completed}/{cp.total})</div>
                <div style={{ ...s.avgMarkBadge, background: markColor(cp.avgMark, 33).bg, color: markColor(cp.avgMark, 33).color }}>
                  purata {Math.round(cp.avgMark / 33 * 100)}/100
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Percubaan */}
      {activeTab === 'attempts' && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>🔁 Purata Percubaan setiap Pusat Semak</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={attemptData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis />
              <Tooltip formatter={(val) => [`${val} purata percubaan`]} />
              <Bar dataKey="avgAttempts" name="Purata Percubaan" radius={[6, 6, 0, 0]}>
                {attemptData.map((entry, i) => (
                  <Cell key={i} fill={parseFloat(entry.avgAttempts) > 2 ? '#e11d48' : parseFloat(entry.avgAttempts) > 1 ? '#f59e0b' : '#16a34a'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={s.legend}>
            <span style={{ ...s.legendDot, background: '#16a34a' }} /> Mudah (≤1 percubaan)
            <span style={{ ...s.legendDot, background: '#f59e0b', marginLeft: '1rem' }} /> Sederhana (1–2)
            <span style={{ ...s.legendDot, background: '#e11d48', marginLeft: '1rem' }} /> Sukar (&gt;2)
          </div>
        </div>
      )}

      {/* Sesi */}
      {activeTab === 'sessions' && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>🔀 Perbandingan Sesi</h3>
          {sessionData.length === 0 ? <p style={s.muted}>Tiada data sesi lagi.</p> : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sessionData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" angle={-30} textAnchor="end" fontSize={11} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="players"  name="Jumlah Pemain"    fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cp1"      name="CP1 Selesai"      fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cp2"      name="CP2 Selesai"      fill="#9333ea" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cp3"      name="CP3 Selesai"      fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgMark"  name="Purata Markah /100" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <table style={{ ...s.table, marginTop: '1.5rem' }}>
                <thead><tr style={s.thead}>
                  <th style={s.th}>Sesi</th>
                  <th style={s.th}>Pemain</th>
                  <th style={s.th}>CP1 Selesai</th>
                  <th style={s.th}>CP2 Selesai</th>
                  <th style={s.th}>CP3 Selesai</th>
                  <th style={s.th}>Purata Markah /100</th>
                </tr></thead>
                <tbody>
                  {sessionData.map((sess, i) => (
                    <tr key={i} style={i % 2 === 0 ? s.trEven : {}}>
                      <td style={s.td}><strong>{sess.name}</strong></td>
                      <td style={s.td}>{sess.players}</td>
                      <td style={s.td}>{sess.cp1}/{sess.players}</td>
                      <td style={s.td}>{sess.cp2}/{sess.players}</td>
                      <td style={s.td}>{sess.cp3}/{sess.players}</td>
                      <td style={s.td}>
                        <span style={{ ...s.totalBadge, ...markColor(sess.avgMark) }}>
                          {sess.avgMark}/100
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Garis Masa */}
      {activeTab === 'timeline' && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>📅 Garis Masa Aktiviti Pemain</h3>
          {timelineData.length === 0 ? <p style={s.muted}>Tiada data aktiviti lagi.</p> : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="players" name="Pemain Menyertai" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Papan Pendahulu */}
      {activeTab === 'leaderboard' && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ ...s.cardTitle, margin: 0 }}>🏆 Papan Pendahulu</h3>
            <button style={s.downloadBtn} onClick={downloadCSV}>📥 Muat Turun Laporan Penuh (CSV)</button>
          </div>

          {selectedSession === 'all' ? (
            <>
              <p style={s.hint}>
                Setiap pusat semak dinilai /33.33 — jumlah /100. Markah berdasarkan prestasi sebenar.
              </p>
              <table style={s.table}>
                <thead><tr style={s.thead}>
                  <th style={s.th}>Kedudukan</th>
                  <th style={s.th}>Nama Panggilan</th>
                  <th style={s.th}>Sesi</th>
                  <th style={s.th}>CP1 Kuiz</th>
                  <th style={s.th}>CP2 Kata Silang</th>
                  <th style={s.th}>CP3 Permainan Makanan</th>
                  <th style={s.th}>Jumlah / 100</th>
                </tr></thead>
                <tbody>
                  {allSessionsLeaderboard.map((p, i) => (
                    <tr key={p.id} style={i % 2 === 0 ? s.trEven : {}}>
                      <td style={s.td}><span style={s.rank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span></td>
                      <td style={s.td}><strong>{p.nickname}</strong></td>
                      <td style={s.td}><span style={s.sessionTag}>{p.session_name}</span></td>
                      <td style={s.td}>
                        <span style={{ fontWeight: '700', color: '#2563eb' }}>{Math.round(p.cp1_mark / 33 * 100)}/100</span>
                        {p.quiz_correct != null && (
                          <span style={{ color: '#94a3b8', fontSize: '0.78rem', marginLeft: '0.35rem' }}>
                            ({p.quiz_correct}/{p.quiz_total || '?'} betul)
                          </span>
                        )}
                      </td>
                      <td style={s.td}>
                        <span style={p.cp2_completed ? s.badgeGreen : s.badgeGray}>
                          {p.cp2_completed ? `✅ ${Math.round(p.cp2_mark / 33 * 100)}/100` : '❌ 0/100'}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={{ fontWeight: '700', color: '#0d9488' }}>{Math.round(p.cp3_mark / 33 * 100)}/100</span>
                        {p.cp3_score != null && (
                          <span style={{ color: '#94a3b8', fontSize: '0.78rem', marginLeft: '0.35rem' }}>
                            ({p.cp3_score} mata)
                          </span>
                        )}
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.totalBadge, ...markColor(p.total_mark) }}>
                          {p.total_mark}/100
                        </span>
                      </td>
                    </tr>
                  ))}
                  {allSessionsLeaderboard.length === 0 && (
                    <tr><td colSpan="7" style={{ ...s.td, textAlign: 'center', color: '#94a3b8' }}>Tiada pemain lagi</td></tr>
                  )}
                </tbody>
              </table>
            </>
          ) : lbLoading ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Memuatkan skor... 📊</div>
          ) : (
            <>
              <p style={s.hint}>
                Setiap pusat semak dinilai /33.33 — jumlah /100. Markah berdasarkan prestasi sebenar.
              </p>
              <table style={s.table}>
                <thead><tr style={s.thead}>
                  <th style={s.th}>Kedudukan</th>
                  <th style={s.th}>Nama Panggilan</th>
                  <th style={s.th}>CP1 Kuiz</th>
                  <th style={s.th}>CP2 Kata Silang</th>
                  <th style={s.th}>CP3 Permainan Makanan</th>
                  <th style={s.th}>Jumlah / 100</th>
                </tr></thead>
                <tbody>
                  {finalLeaderboard.map((p, i) => (
                    <tr key={p.player_id} style={i % 2 === 0 ? s.trEven : {}}>
                      <td style={s.td}><span style={s.rank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span></td>
                      <td style={s.td}><strong>{p.nickname}</strong></td>
                      <td style={s.td}>
                        <span style={{ fontWeight: '700', color: '#2563eb' }}>{Math.round(p.cp1_mark / 33 * 100)}/100</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.78rem', marginLeft: '0.35rem' }}>
                          ({p.cp1_correct}/{p.cp1_total} betul)
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={p.cp2_completed ? s.badgeGreen : p.cp2_mark > 0 ? s.badgeYellow : s.badgeGray}>
                          {p.cp2_completed ? `✅ ${Math.round(p.cp2_mark / 33 * 100)}/100` : p.cp2_mark > 0 ? `⚠️ ${Math.round(p.cp2_mark / 33 * 100)}/100` : '❌ 0/100'}
                        </span>
                        {p.cp2_total > 0 && (
                          <span style={{ color: '#94a3b8', fontSize: '0.78rem', marginLeft: '0.35rem' }}>
                            ({p.cp2_words}/{p.cp2_total} perkataan)
                          </span>
                        )}
                      </td>
                      <td style={s.td}>
                        <span style={{ fontWeight: '700', color: '#0d9488' }}>{Math.round(p.cp3_mark / 33 * 100)}/100</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.78rem', marginLeft: '0.35rem' }}>
                          ({p.cp3_raw}/{p.cp3_target} mata)
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.totalBadge, ...markColor(p.total_mark) }}>
                          {p.total_mark}/100
                        </span>
                      </td>
                    </tr>
                  ))}
                  {finalLeaderboard.length === 0 && (
                    <tr><td colSpan="6" style={{ ...s.td, textAlign: 'center', color: '#94a3b8' }}>Tiada pemain dalam sesi ini lagi</td></tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Bar Muat Turun */}
      <div style={s.downloadBar}>
        <button style={s.downloadBtn} onClick={downloadCSV}>⬇️ Muat Turun Laporan Penuh (CSV)</button>
      </div>
    </div>
  );
};

const s = {
  filterBar: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', background: '#fff', borderRadius: '12px', padding: '0.85rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flexWrap: 'wrap' },
  filterLabel: { fontSize: '0.88rem', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' },
  filterSelect: { flex: 1, minWidth: '200px', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#1e293b', background: '#f8fafc', cursor: 'pointer' },
  clearBtn: { background: '#fff1f2', color: '#e11d48', border: 'none', borderRadius: '8px', padding: '0.4rem 0.85rem', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' },
  statCard: { padding: '1.25rem', borderRadius: '16px', textAlign: 'center', border: '1px solid #e2e8f0' },
  statIcon: { fontSize: '1.8rem', marginBottom: '0.5rem' },
  statValue: { fontSize: '1.6rem', fontWeight: '800', lineHeight: 1 },
  statLabel: { color: '#64748b', fontSize: '0.78rem', marginTop: '0.25rem' },
  tabs: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  tab: { padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' },
  tabActive: { background: '#2563eb', color: '#fff', border: '1px solid #2563eb' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' },
  card: { background: '#fff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: '1.05rem', fontWeight: '700', color: '#1e3a5f', margin: '0 0 1.25rem' },
  markOverview: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem', marginTop: '0.5rem' },
  markCard: { textAlign: 'center', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fafbff' },
  markCardTitle: { fontWeight: '700', color: '#334155', fontSize: '0.88rem', marginBottom: '0.75rem' },
  markCircle: { width: '72px', height: '72px', borderRadius: '50%', border: '4px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', flexDirection: 'column' },
  markNum: { fontSize: '1.4rem', fontWeight: '800', lineHeight: 1 },
  markDen: { fontSize: '0.7rem', fontWeight: '600', opacity: 0.7 },
  markBar: { height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', margin: '0 auto', width: '80%' },
  markBarFill: { height: '100%', borderRadius: '3px', transition: 'width 0.5s ease' },
  completionCards: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' },
  cpCard: { display: 'flex', alignItems: 'center', gap: '1rem' },
  cpName: { width: '130px', fontSize: '0.85rem', fontWeight: '600', color: '#475569', flexShrink: 0 },
  cpBar: { flex: 1, height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' },
  cpBarFill: { height: '100%', borderRadius: '6px', transition: 'width 0.5s ease' },
  cpRate: { width: '110px', fontSize: '0.82rem', color: '#64748b', textAlign: 'right', flexShrink: 0 },
  avgMarkBadge: { padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', flexShrink: 0 },
  legend: { display: 'flex', alignItems: 'center', marginTop: '1rem', fontSize: '0.85rem', color: '#64748b', flexWrap: 'wrap', gap: '0.25rem' },
  legendDot: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', marginRight: '4px' },
  hint: { color: '#64748b', fontSize: '0.88rem', margin: '0 0 1rem' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f8fafc' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: '600', color: '#64748b', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '0.75rem 1rem', fontSize: '0.88rem', color: '#334155', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  trEven: { background: '#fafafa' },
  rank: { fontSize: '1.1rem' },
  sessionTag: { background: '#eff6ff', color: '#2563eb', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600' },
  badgeGreen:  { background: '#f0fdf4', color: '#16a34a', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600' },
  badgeYellow: { background: '#fffbeb', color: '#b45309', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600' },
  badgeGray:   { background: '#f1f5f9', color: '#94a3b8', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.82rem' },
  totalBadge: { padding: '0.25rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '800' },
  downloadBar: { display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' },
  downloadBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.65rem 1.5rem', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' },
  muted: { color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' },
};

export default Analytics;
