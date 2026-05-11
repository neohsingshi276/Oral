import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const MONTH_ORDER = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const pct = (n, total) => total ? Math.round(n / total * 100) : 0;

// ── StatBox ───────────────────────────────────────────────────────────────────
const StatBox = ({ label, value, color, sub }) => (
  <div style={{ background: '#fff', border: `2px solid ${color}18`, borderRadius: '12px', padding: '0.85rem 1rem', textAlign: 'center', flex: 1, minWidth: '90px' }}>
    <div style={{ fontSize: '1.4rem', fontWeight: '800', color }}>{value}</div>
    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', marginTop: '2px', lineHeight: 1.3 }}>{label}</div>
    {sub && <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>{sub}</div>}
  </div>
);

// ── PlayerDetailTable ─────────────────────────────────────────────────────────
const PlayerDetailTable = ({ players, onDelete, deletingId }) => {
  if (!players) return <p style={{ color: '#94a3b8', fontSize: '0.88rem', padding: '1rem 0' }}>Memuatkan pelajar…</p>;
  if (players.length === 0) return <p style={{ color: '#94a3b8', fontSize: '0.88rem', padding: '1rem 0' }}>Tiada pelajar dalam sesi ini.</p>;

  const cpBadge = (completed, attempts) => {
    const bg = completed ? '#f0fdf4' : '#f1f5f9';
    const col = completed ? '#16a34a' : '#94a3b8';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <span style={{ background: bg, color: col, padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' }}>
          {completed ? '✅' : '—'}
        </span>
        {attempts > 0 && (
          <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: '600' }}>{attempts} cuba</span>
        )}
      </div>
    );
  };

  return (
    <div style={{ overflowX: 'auto', marginTop: '0.75rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            {['Pelajar', 'CP1 Kuiz', 'Skor Kuiz', 'CP2 Silang', 'CP3 Makanan', 'Skor CP3', 'Disertai', ''].map((h, i) => (
              <th key={i} style={{ padding: '0.55rem 0.75rem', textAlign: i === 0 ? 'left' : 'center', color: '#64748b', fontWeight: '700', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={p.id} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff', borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '0.55rem 0.75rem', fontWeight: '700', color: '#1e3a5f', whiteSpace: 'nowrap' }}>{p.nickname}</td>
              <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>{cpBadge(p.cp1_completed, p.cp1_attempts)}</td>
              <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>
                {p.quiz_score != null
                  ? <span style={{ fontWeight: '700', color: '#2563eb' }}>{p.quiz_score}<span style={{ color: '#94a3b8', fontWeight: '400', fontSize: '0.7rem' }}>/{p.quiz_total || '?'}</span></span>
                  : <span style={{ color: '#94a3b8' }}>—</span>}
              </td>
              <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>{cpBadge(p.cp2_completed, p.cp2_attempts)}</td>
              <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>{cpBadge(p.cp3_completed, p.cp3_attempts)}</td>
              <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>
                {p.cp3_score != null
                  ? <span style={{ fontWeight: '700', color: '#f59e0b' }}>{p.cp3_score}</span>
                  : <span style={{ color: '#94a3b8' }}>—</span>}
              </td>
              <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                {new Date(p.joined_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              </td>
              <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>
                <button
                  disabled={deletingId === p.id}
                  style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', opacity: deletingId === p.id ? 0.5 : 1 }}
                  onClick={() => onDelete && onDelete(p)}
                >🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── SessionComparison ─────────────────────────────────────────────────────────
const SessionComparison = ({ sessions }) => {
  const [sessionA, setSessionA] = useState('');
  const [sessionB, setSessionB] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('charts'); // 'charts' | 'players_a' | 'players_b'

  const compare = async () => {
    if (!sessionA || !sessionB) return setError('Sila pilih 2 sesi yang berbeza.');
    if (sessionA === sessionB) return setError('Pilih dua sesi yang berbeza.');
    setError(''); setLoading(true); setResult(null);
    try {
      const res = await api.get('/admin/compare-sessions', { params: { session_a: sessionA, session_b: sessionB } });
      setResult(res.data);
      setActiveTab('charts');
    } catch (e) { setError(e.response?.data?.error || 'Gagal memuatkan perbandingan.'); }
    finally { setLoading(false); }
  };

  // Chart datasets
  const completionData = result ? [
    { name: 'CP1 Kuiz', A: result.session_a.stats.cp1_rate, B: result.session_b.stats.cp1_rate },
    { name: 'CP2 Kata Silang', A: result.session_a.stats.cp2_rate, B: result.session_b.stats.cp2_rate },
    { name: 'CP3 Makanan', A: result.session_a.stats.cp3_rate, B: result.session_b.stats.cp3_rate },
  ] : [];

  const attemptsData = result ? [
    { name: 'CP1 Kuiz', A: result.session_a.stats.avg_cp1_att || 0, B: result.session_b.stats.avg_cp1_att || 0 },
    { name: 'CP2 Kata Silang', A: result.session_a.stats.avg_cp2_att || 0, B: result.session_b.stats.avg_cp2_att || 0 },
    { name: 'CP3 Makanan', A: result.session_a.stats.avg_cp3_att || 0, B: result.session_b.stats.avg_cp3_att || 0 },
  ] : [];

  const radarData = result ? [
    { metric: 'CP1 %', A: result.session_a.stats.cp1_rate, B: result.session_b.stats.cp1_rate },
    { metric: 'CP2 %', A: result.session_a.stats.cp2_rate, B: result.session_b.stats.cp2_rate },
    { metric: 'CP3 %', A: result.session_a.stats.cp3_rate, B: result.session_b.stats.cp3_rate },
    { metric: 'Avg Kuiz %', A: result.session_a.stats.avg_quiz_pct, B: result.session_b.stats.avg_quiz_pct },
    { metric: 'CP3 Skor %', A: result.session_a.stats.avg_cp3_pct, B: result.session_b.stats.avg_cp3_pct },
  ] : [];

  const nameA = result?.session_a.session.session_name || 'Sesi A';
  const nameB = result?.session_b.session.session_name || 'Sesi B';

  const tabBtn = (key, label) => (
    <button
      onClick={() => setActiveTab(key)}
      style={{
        padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem',
        background: activeTab === key ? '#2563eb' : '#f1f5f9',
        color: activeTab === key ? '#fff' : '#64748b',
        transition: 'all 0.15s'
      }}
    >{label}</button>
  );

  return (
    <div style={cs.wrap}>
      <h3 style={cs.title}>⚖️ Bandingkan Sesi</h3>

      {/* Selectors */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <label style={cs.label}>Sesi A 🔵</label>
          <select style={cs.select} value={sessionA} onChange={e => { setSessionA(e.target.value); setResult(null); }}>
            <option value="">— Pilih Sesi A —</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.session_name}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <label style={cs.label}>Sesi B 🟣</label>
          <select style={cs.select} value={sessionB} onChange={e => { setSessionB(e.target.value); setResult(null); }}>
            <option value="">— Pilih Sesi B —</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.session_name}</option>)}
          </select>
        </div>
        <button style={cs.btn} onClick={compare} disabled={loading}>
          {loading ? '⏳ Memuatkan...' : '⚖️ Bandingkan'}
        </button>
      </div>

      {error && <div style={{ color: '#e11d48', fontSize: '0.85rem', marginBottom: '0.75rem' }}>❌ {error}</div>}

      {result && (
        <>
          {/* Summary stat boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            {[result.session_a, result.session_b].map((d, idx) => (
              <div key={idx} style={{ background: idx === 0 ? '#eff6ff' : '#fdf4ff', borderRadius: '12px', padding: '1rem', border: `2px solid ${idx === 0 ? '#bfdbfe' : '#e9d5ff'}` }}>
                <div style={{ fontWeight: '800', color: idx === 0 ? '#2563eb' : '#9333ea', marginBottom: '0.6rem', fontSize: '0.9rem' }}>
                  {idx === 0 ? '🔵' : '🟣'} {d.session.session_name}
                  <span style={{ background: idx === 0 ? '#dbeafe' : '#ede9fe', borderRadius: '8px', padding: '1px 8px', fontSize: '0.72rem', fontWeight: '600', marginLeft: '8px' }}>
                    {d.stats.total} pelajar
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <StatBox label="CP1 %" value={`${d.stats.cp1_rate}%`} color="#16a34a" />
                  <StatBox label="CP2 %" value={`${d.stats.cp2_rate}%`} color="#f59e0b" />
                  <StatBox label="CP3 %" value={`${d.stats.cp3_rate}%`} color="#e11d48" />
                  <StatBox label="Avg Kuiz" value={d.stats.avg_quiz || 0} color={idx === 0 ? '#2563eb' : '#9333ea'} />
                  <StatBox label="Avg CP3 Skor" value={d.stats.avg_cp3 || 0} color="#f59e0b" />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                  <StatBox label="CP1 Avg Cuba" value={d.stats.avg_cp1_att || '—'} color="#64748b" sub="percubaan" />
                  <StatBox label="CP2 Avg Cuba" value={d.stats.avg_cp2_att || '—'} color="#64748b" sub="percubaan" />
                  <StatBox label="CP3 Avg Cuba" value={d.stats.avg_cp3_att || '—'} color="#64748b" sub="percubaan" />
                </div>
              </div>
            ))}
          </div>

          {/* Tab nav */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {tabBtn('charts', '📊 Graf')}
            {tabBtn('players_a', `👥 Pelajar — ${nameA}`)}
            {tabBtn('players_b', `👥 Pelajar — ${nameB}`)}
          </div>

          {/* Charts tab */}
          {activeTab === 'charts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Chart 1: Completion rate */}
              <div>
                <div style={cs.chartTitle}>📈 Kadar Penyiapan per Checkpoint (%)</div>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={completionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v, n) => [`${v}%`, n]} />
                      <Legend />
                      <Bar dataKey="A" name={nameA} fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="B" name={nameB} fill="#9333ea" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Avg attempts */}
              <div>
                <div style={cs.chartTitle}>🔄 Purata Percubaan per Checkpoint (lebih rendah = lebih baik)</div>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attemptsData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v, n) => [`${v} cuba`, n]} />
                      <Legend />
                      <Bar dataKey="A" name={nameA} fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="B" name={nameB} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Radar overview */}
              <div>
                <div style={cs.chartTitle}>🕸️ Gambaran Keseluruhan Prestasi</div>
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar name={nameA} dataKey="A" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} />
                      <Radar name={nameB} dataKey="B" stroke="#9333ea" fill="#9333ea" fillOpacity={0.15} />
                      <Legend />
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Players A tab */}
          {activeTab === 'players_a' && (
            <div>
              <div style={cs.chartTitle}>👥 Senarai Pelajar — {nameA} ({result.session_a.stats.total} pelajar)</div>
              <PlayerDetailTable players={result.session_a.players} />
            </div>
          )}

          {/* Players B tab */}
          {activeTab === 'players_b' && (
            <div>
              <div style={cs.chartTitle}>👥 Senarai Pelajar — {nameB} ({result.session_b.stats.total} pelajar)</div>
              <PlayerDetailTable players={result.session_b.players} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

const cs = {
  wrap: { background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginTop: '1.5rem' },
  title: { fontSize: '1rem', fontWeight: '800', color: '#1e3a5f', marginBottom: '1rem' },
  label: { display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' },
  select: { padding: '0.45rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.88rem', outline: 'none', width: '100%', background: '#fff' },
  btn: { padding: '0.5rem 1.4rem', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', whiteSpace: 'nowrap', alignSelf: 'flex-end' },
  chartTitle: { fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' },
};

// ── Main TeacherSessionView ───────────────────────────────────────────────────
const TeacherSessionView = () => {
  const { admin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpanded] = useState(null);
  const [sessionPlayers, setSessionPlayers] = useState({});
  const [loadingPlayers, setLoadingPlayers] = useState({});
  const [deletingPlayer, setDeletingPlayer] = useState(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    api.get('/admin/teacher-sessions')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const handleExpandSession = async (session) => {
    if (expandedSession === session.id) { setExpanded(null); return; }
    setExpanded(session.id);
    if (sessionPlayers[session.id]) return;
    setLoadingPlayers(prev => ({ ...prev, [session.id]: true }));
    try {
      const res = await api.get(`/admin/session-players/${session.id}`);
      setSessionPlayers(prev => ({ ...prev, [session.id]: res.data.players }));
    } catch (e) { console.error(e); }
    finally { setLoadingPlayers(prev => ({ ...prev, [session.id]: false })); }
  };

  const handleDeletePlayer = async (player, sessionId) => {
    if (!window.confirm(`Padamkan Pemain "${player.nickname}"?`)) return;
    setDeletingPlayer(player.id);
    try {
      await api.delete(`/admin/players/${player.id}`);
      setSessionPlayers(prev => ({
        ...prev,
        [sessionId]: (prev[sessionId] || []).filter(p => p.id !== player.id)
      }));
    } catch (e) { alert(e.response?.data?.error || 'Gagal memadamkan pemain'); }
    finally { setDeletingPlayer(null); }
  };

  if (loading) return <div style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>Memuatkan sesi... ⏳</div>;
  if (!data) return <div style={{ color: '#e11d48', padding: '2rem' }}>Gagal memuatkan data.</div>;

  const { school, admin_name, by_month, sessions } = data;

  const sortedMonths = Object.keys(by_month || {}).sort((a, b) => {
    if (a === 'Belum Digunakan') return 1;
    if (b === 'Belum Digunakan') return -1;
    const parse = (lbl) => {
      const parts = lbl.split(' ');
      const year = parseInt(parts[parts.length - 1], 10) || 0;
      const mi = MONTH_ORDER.indexOf(parts.slice(0, -1).join(' '));
      return year * 100 + (mi === -1 ? 0 : mi);
    };
    return parse(a) - parse(b);
  });

  return (
    <div>
      {/* Header */}
      <div style={s.headerCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>🏫</div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>{school || 'Sekolah Anda'}</div>
            <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>👩‍🏫 {admin_name}</div>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
          {sessions?.length || 0} sesi
        </div>
      </div>

      {/* Month groups */}
      {sortedMonths.length === 0 ? (
        <div style={{ ...s.card, color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>
          Tiada sesi lagi. Buat sesi baru dari tab Urus Sesi.
        </div>
      ) : sortedMonths.map(month => {
        const monthSessions = by_month[month] || [];
        return (
          <div key={month} style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1e3a5f' }}>📅 {month}</span>
              <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' }}>
                {monthSessions.length} sesi
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {monthSessions.map(session => {
                const isOpen = expandedSession === session.id;
                const players = sessionPlayers[session.id];
                const isLoading = loadingPlayers[session.id];
                const totalP = players?.length ?? session.player_count;
                const cp1done = players ? players.filter(p => p.cp1_completed).length : null;
                const cp2done = players ? players.filter(p => p.cp2_completed).length : null;
                const cp3done = players ? players.filter(p => p.cp3_completed).length : null;

                return (
                  <div key={`${session.id}-${month}`} style={{ ...s.sessionCard, border: isOpen ? '2px solid #2563eb' : '2px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e3a5f' }}>{session.session_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          {totalP} pelajar · {session.is_active ? '🟢 Aktif' : '🔴 Tidak Aktif'}
                        </div>
                      </div>
                    </div>

                    {/* Code row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Kod</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {(session.unique_token || '----').split('').map((d, i) => (
                          <span key={i} style={{ width: '28px', height: '32px', background: '#1e3a5f', color: '#fff', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1rem' }}>{d}</span>
                        ))}
                      </div>
                      <button
                        style={{ background: copied === session.unique_token ? '#f0fdf4' : '#eff6ff', color: copied === session.unique_token ? '#16a34a' : '#2563eb', border: `1px solid ${copied === session.unique_token ? '#bbf7d0' : '#bfdbfe'}`, borderRadius: '7px', padding: '4px 10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.75rem' }}
                        onClick={() => copyCode(session.unique_token)}
                      >{copied === session.unique_token ? '✅ Disalin' : '📋 Salin'}</button>
                    </div>

                    <button style={s.btnExpand} onClick={() => handleExpandSession(session)}>
                      {isOpen ? '▲ Sembunyikan' : `▼ Lihat Pelajar & Skor (${totalP})`}
                    </button>

                    {isOpen && (
                      <div style={{ marginTop: '0.75rem' }}>
                        {/* Mini stats bar */}
                        {players && players.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                            <span style={s.miniStat}>CP1: {cp1done}/{players.length} ({pct(cp1done, players.length)}%)</span>
                            <span style={s.miniStat}>CP2: {cp2done}/{players.length} ({pct(cp2done, players.length)}%)</span>
                            <span style={s.miniStat}>CP3: {cp3done}/{players.length} ({pct(cp3done, players.length)}%)</span>
                          </div>
                        )}
                        {/* Mini completion chart */}
                        {players && players.length > 0 && (
                          <div style={{ height: 140, marginBottom: '0.5rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={[
                                  { name: 'CP1', selesai: cp1done, belum: players.length - cp1done },
                                  { name: 'CP2', selesai: cp2done, belum: players.length - cp2done },
                                  { name: 'CP3', selesai: cp3done, belum: players.length - cp3done },
                                ]}
                                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Bar dataKey="selesai" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="belum" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                        {isLoading
                          ? <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Memuatkan...</p>
                          : <PlayerDetailTable
                            players={players}
                            onDelete={p => handleDeletePlayer(p, session.id)}
                            deletingId={deletingPlayer}
                          />
                        }
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Comparison section */}
      {sessions && sessions.length >= 2 && (
        <SessionComparison sessions={sessions} />
      )}
    </div>
  );
};

const s = {
  card: { background: '#fff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  headerCard: { background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' },
  sessionCard: { background: '#fff', borderRadius: '14px', padding: '1.1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', transition: 'border-color 0.2s' },
  btnExpand: { width: '100%', marginTop: '0.75rem', padding: '0.45rem', background: '#f8fafc', color: '#2563eb', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' },
  miniStat: { background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '700' },
};

export default TeacherSessionView;