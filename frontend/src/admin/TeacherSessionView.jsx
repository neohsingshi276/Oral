import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const MONTH_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── Stat box ─────────────────────────────────────────────────────────────────
const StatBox = ({ label, value, color }) => (
  <div style={{ background: '#fff', border: `2px solid ${color}20`, borderRadius: '12px', padding: '0.9rem 1.2rem', textAlign: 'center', minWidth: '100px', flex: 1 }}>
    <div style={{ fontSize: '1.5rem', fontWeight: '800', color }}>{value}</div>
    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>{label}</div>
  </div>
);

// ── Player mini-table ─────────────────────────────────────────────────────────
const PlayerTable = ({ players, sessionId, onDeletePlayer }) => {
  if (!players) return <p style={{ color: '#94a3b8', fontSize: '0.9rem', padding: '1rem' }}>Memuatkan pelajar…</p>;
  if (players.length === 0) return <p style={{ color: '#94a3b8', fontSize: '0.9rem', padding: '1rem' }}>Tiada pelajar dalam sesi ini.</p>;
  return (
    <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {['Nama Samaran','CP1 Kuiz','CP2 Kata Silang','CP3 Makanan','Disertai',''].map((h,i) => (
              <th key={i} style={{ padding: '0.6rem 0.9rem', textAlign: 'left', color: '#64748b', fontWeight: '600', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={p.id} style={{ background: i%2===0 ? '#fafafa' : '#fff' }}>
              <td style={{ padding: '0.55rem 0.9rem', fontWeight: '600', color: '#1e3a5f' }}>{p.nickname}</td>
              <td style={{ padding: '0.55rem 0.9rem' }}>
                <span style={{ background: p.cp1_completed ? '#f0fdf4' : '#f1f5f9', color: p.cp1_completed ? '#16a34a' : '#94a3b8', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600' }}>
                  {p.cp1_completed ? '✅ Selesai' : '—'}
                </span>
              </td>
              <td style={{ padding: '0.55rem 0.9rem' }}>
                <span style={{ background: p.cp2_completed ? '#f0fdf4' : '#f1f5f9', color: p.cp2_completed ? '#16a34a' : '#94a3b8', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600' }}>
                  {p.cp2_completed ? '✅ Selesai' : '—'}
                </span>
              </td>
              <td style={{ padding: '0.55rem 0.9rem' }}>
                <span style={{ background: p.cp3_completed ? '#f0fdf4' : '#f1f5f9', color: p.cp3_completed ? '#16a34a' : '#94a3b8', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600' }}>
                  {p.cp3_completed ? '✅ Selesai' : '—'}
                </span>
              </td>
              <td style={{ padding: '0.55rem 0.9rem', color: '#64748b', fontSize: '0.78rem' }}>
                {new Date(p.joined_at).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })}
              </td>
              <td style={{ padding: '0.55rem 0.9rem' }}>
                <button
                  style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600' }}
                  onClick={() => onDeletePlayer && onDeletePlayer(p)}
                >🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Session comparison ────────────────────────────────────────────────────────
const SessionComparison = ({ sessions }) => {
  const [sessionA, setSessionA] = useState('');
  const [sessionB, setSessionB] = useState('');
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const compare = async () => {
    if (!sessionA || !sessionB) return setError('Sila pilih 2 sesi yang berbeza.');
    if (sessionA === sessionB)  return setError('Pilih dua sesi yang berbeza.');
    setError(''); setLoading(true);
    try {
      const res = await api.get('/admin/compare-sessions', { params: { session_a: sessionA, session_b: sessionB } });
      setResult(res.data);
    } catch (e) { setError(e.response?.data?.error || 'Gagal memuatkan perbandingan.'); }
    finally { setLoading(false); }
  };

  const chartData = result ? [
    { name: 'CP1 Kuiz',         A: result.session_a.stats.cp1_rate, B: result.session_b.stats.cp1_rate },
    { name: 'CP2 Kata Silang',  A: result.session_a.stats.cp2_rate, B: result.session_b.stats.cp2_rate },
    { name: 'CP3 Makanan',      A: result.session_a.stats.cp3_rate, B: result.session_b.stats.cp3_rate },
  ] : [];

  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginTop: '1.5rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e3a5f', marginBottom: '1rem' }}>⚖️ Bandingkan 2 Sesi</h3>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <label style={s.filterLabel}>Sesi A</label>
          <select style={s.select} value={sessionA} onChange={e => { setSessionA(e.target.value); setResult(null); }}>
            <option value="">— Pilih Sesi A —</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.session_name}{s.session_month ? ` (${s.session_month})` : ''}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <label style={s.filterLabel}>Sesi B</label>
          <select style={s.select} value={sessionB} onChange={e => { setSessionB(e.target.value); setResult(null); }}>
            <option value="">— Pilih Sesi B —</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.session_name}{s.session_month ? ` (${s.session_month})` : ''}</option>)}
          </select>
        </div>
        <button style={s.btnCompare} onClick={compare} disabled={loading}>
          {loading ? 'Memuatkan...' : '⚖️ Bandingkan'}
        </button>
      </div>

      {error && <div style={{ color: '#e11d48', fontSize: '0.85rem', marginBottom: '0.75rem' }}>❌ {error}</div>}

      {result && (
        <>
          {/* Stats side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            {[result.session_a, result.session_b].map((d, idx) => (
              <div key={idx} style={{ background: idx === 0 ? '#eff6ff' : '#fdf4ff', borderRadius: '12px', padding: '1rem' }}>
                <div style={{ fontWeight: '700', color: idx === 0 ? '#2563eb' : '#9333ea', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                  {idx === 0 ? '🔵' : '🟣'} {d.session.session_name}
                  {d.session.session_month && <span style={{ fontSize: '0.75rem', fontWeight: '400', marginLeft: '6px', opacity: 0.8 }}>({d.session.session_month})</span>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <StatBox label="Pelajar" value={d.stats.total} color={idx === 0 ? '#2563eb' : '#9333ea'} />
                  <StatBox label="CP1 %" value={`${d.stats.cp1_rate}%`} color="#16a34a" />
                  <StatBox label="CP2 %" value={`${d.stats.cp2_rate}%`} color="#f59e0b" />
                  <StatBox label="CP3 %" value={`${d.stats.cp3_rate}%`} color="#e11d48" />
                </div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend />
                <Bar dataKey="A" name={result.session_a.session.session_name} fill="#2563eb" radius={[4,4,0,0]} />
                <Bar dataKey="B" name={result.session_b.session.session_name} fill="#9333ea" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

// ── Main TeacherSessionView ───────────────────────────────────────────────────
const TeacherSessionView = () => {
  const { admin } = useAuth();
  const [data, setData]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [expandedSession, setExpanded]    = useState(null); // session id
  const [sessionPlayers, setSessionPlayers] = useState({}); // { [sessionId]: [] }
  const [loadingPlayers, setLoadingPlayers] = useState({});
  const [copied, setCopied]               = useState('');
  const [deletingPlayer, setDeletingPlayer] = useState(null);

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
    if (sessionPlayers[session.id]) return; // already loaded
    setLoadingPlayers(prev => ({ ...prev, [session.id]: true }));
    try {
      const res = await api.get(`/admin/session-players/${session.id}`);
      setSessionPlayers(prev => ({ ...prev, [session.id]: res.data.players }));
    } catch (e) { console.error(e); }
    finally { setLoadingPlayers(prev => ({ ...prev, [session.id]: false })); }
  };

  const handleDeletePlayer = async (player, sessionId) => {
    if (!window.confirm(`Padamkan Pemain "${player.nickname}"? Tindakan ini tidak boleh dibatalkan.`)) return;
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
  if (!data)   return <div style={{ color: '#e11d48', padding: '2rem' }}>Gagal memuatkan data.</div>;

  const { school, admin_name, by_month, sessions } = data;

  // Sort months in calendar order
  const sortedMonths = Object.keys(by_month || {}).sort((a, b) => {
    // Labels are 'Month YYYY' e.g. 'January 2026', or 'Belum Digunakan'
    if (a === 'Belum Digunakan') return 1;
    if (b === 'Belum Digunakan') return -1;
    // Parse 'Month YYYY' → sortable value
    const parseLabel = (lbl) => {
      const parts = lbl.split(' ');
      const year = parseInt(parts[parts.length - 1], 10) || 0;
      const monthName = parts.slice(0, parts.length - 1).join(' ');
      const mi = MONTH_ORDER.indexOf(monthName);
      return year * 100 + (mi === -1 ? 0 : mi);
    };
    return parseLabel(a) - parseLabel(b);
  });

  return (
    <div>
      {/* ── Header: school + teacher name ── */}
      <div style={s.headerCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={s.schoolIcon}>🏫</div>
          <div>
            <div style={s.schoolName}>{school || 'Sekolah Anda'}</div>
            <div style={s.teacherName}>👩‍🏫 {admin_name}</div>
          </div>
        </div>
        <div style={s.totalBadge}>{sessions?.length || 0} sesi</div>
      </div>

      {/* ── Month groups ── */}
      {sortedMonths.length === 0 ? (
        <div style={{ ...s.card, color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>
          Tiada sesi lagi. Buat sesi baru dari tab Urus Sesi.
        </div>
      ) : (
        sortedMonths.map(month => {
          const monthSessions = by_month[month] || [];
          return (
            <div key={month} style={s.monthBlock}>
              <div style={s.monthHeader}>
                <span style={s.monthTitle}>📅 {month}</span>
                <span style={s.monthCount}>{monthSessions.length} sesi</span>
              </div>

              <div style={s.sessionGrid}>
                {monthSessions.map(session => {
                  const isOpen = expandedSession === session.id;
                  const players = sessionPlayers[session.id];
                  const isLoadingP = loadingPlayers[session.id];
                  const totalP = players?.length ?? session.player_count;
                  const cp1done = players ? players.filter(p => p.cp1_completed).length : null;
                  const cp2done = players ? players.filter(p => p.cp2_completed).length : null;
                  const cp3done = players ? players.filter(p => p.cp3_completed).length : null;

                  return (
                    <div key={session.id} style={{ ...s.sessionCard, border: isOpen ? '2px solid #2563eb' : '2px solid #e2e8f0' }}>
                      {/* Session header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={s.sessionName}>{session.session_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            {totalP} pelajar · {session.is_active ? '🟢 Aktif' : '🔴 Tidak Aktif'}
                          </div>
                        </div>
                      </div>

                      {/* Game code */}
                      <div style={s.codeRow}>
                        <span style={s.codeLabel}>Kod Permainan</span>
                        <div style={s.codeBox}>
                          {(session.unique_token || '----').split('').map((d, i) => (
                            <span key={i} style={s.codeDigit}>{d}</span>
                          ))}
                        </div>
                        <button
                          style={copied === session.unique_token ? s.btnCopied : s.btnCopy}
                          onClick={() => copyCode(session.unique_token)}
                        >
                          {copied === session.unique_token ? '✅ Disalin' : '📋 Salin'}
                        </button>
                      </div>

                      {/* Expand button */}
                      <button style={s.btnExpand} onClick={() => handleExpandSession(session)}>
                        {isOpen ? '▲ Sembunyikan Pelajar' : `▼ Lihat Pelajar (${totalP})`}
                      </button>

                      {/* Player list */}
                      {isOpen && (
                        <div style={{ marginTop: '0.75rem' }}>
                          {/* Quick stats */}
                          {players && players.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={s.miniStat}>CP1: {cp1done}/{players.length}</span>
                              <span style={s.miniStat}>CP2: {cp2done}/{players.length}</span>
                              <span style={s.miniStat}>CP3: {cp3done}/{players.length}</span>
                            </div>
                          )}
                          {isLoadingP
                            ? <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Memuatkan...</p>
                            : <PlayerTable
                                players={players}
                                sessionId={session.id}
                                onDeletePlayer={p => handleDeletePlayer(p, session.id)}
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
        })
      )}

      {/* ── Session Comparison ── */}
      {sessions && sessions.length >= 2 && (
        <SessionComparison sessions={sessions} />
      )}
    </div>
  );
};

const s = {
  card: { background: '#fff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  headerCard: { background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', color: '#fff' },
  schoolIcon: { fontSize: '2.5rem', lineHeight: 1 },
  schoolName: { fontSize: '1.2rem', fontWeight: '800', color: '#fff' },
  teacherName: { fontSize: '0.88rem', color: 'rgba(255,255,255,0.8)', marginTop: '2px' },
  totalBadge: { background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' },
  monthBlock: { marginBottom: '1.5rem' },
  monthHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' },
  monthTitle: { fontSize: '1rem', fontWeight: '700', color: '#1e3a5f' },
  monthCount: { background: '#eff6ff', color: '#2563eb', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' },
  sessionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' },
  sessionCard: { background: '#fff', borderRadius: '14px', padding: '1.1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', transition: 'border-color 0.2s' },
  sessionName: { fontSize: '0.95rem', fontWeight: '700', color: '#1e3a5f' },
  codeRow: { display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.75rem', flexWrap: 'wrap' },
  codeLabel: { fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' },
  codeBox: { display: 'flex', gap: '4px' },
  codeDigit: { width: '28px', height: '32px', background: '#1e3a5f', color: '#fff', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1rem', letterSpacing: 0 },
  btnCopy: { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '7px', padding: '4px 12px', cursor: 'pointer', fontWeight: '600', fontSize: '0.78rem', whiteSpace: 'nowrap' },
  btnCopied: { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '7px', padding: '4px 12px', cursor: 'pointer', fontWeight: '600', fontSize: '0.78rem', whiteSpace: 'nowrap' },
  btnExpand: { width: '100%', marginTop: '0.75rem', padding: '0.45rem', background: '#f8fafc', color: '#2563eb', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' },
  miniStat: { background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700' },
  filterLabel: { display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' },
  select: { padding: '0.45rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.88rem', outline: 'none', width: '100%', background: '#fff' },
  btnCompare: { padding: '0.5rem 1.3rem', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', whiteSpace: 'nowrap' },
};

export default TeacherSessionView;
