import { useState, useEffect } from 'react';
import api from '../services/api';

const ManageStudents = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSession, setSelectedSession] = useState('all');
  const [sortBy, setSortBy] = useState('joined_at');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get('/admin/players')
      .then(res => setPlayers(res.data.players))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadCSV = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${baseUrl}/admin/download-csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'player_data.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download CSV. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Unique sessions for filter dropdown
  const sessions = [...new Map(
    players.map(p => [p.session_id, { id: p.session_id, name: p.session_name }])
  ).values()].sort((a, b) => a.name.localeCompare(b.name));

  const filtered = players
    .filter(p => {
      const matchSearch =
        p.nickname?.toLowerCase().includes(search.toLowerCase()) ||
        p.session_name?.toLowerCase().includes(search.toLowerCase());
      const matchSession = selectedSession === 'all' || p.session_id === Number(selectedSession);
      return matchSearch && matchSession;
    })
    .sort((a, b) => {
      if (sortBy === 'nickname') return (a.nickname || '').localeCompare(b.nickname || '');
      if (sortBy === 'session') return (a.session_name || '').localeCompare(b.session_name || '');
      if (sortBy === 'cp1') return (b.cp1_completed ? 1 : 0) - (a.cp1_completed ? 1 : 0);
      return new Date(b.joined_at) - new Date(a.joined_at);
    });

  const cpBadge = (completed, attempts) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <span style={completed ? s.badgeGreen : s.badgeGray}>{completed ? '✅' : '—'}</span>
      {attempts != null && (
        <span style={s.attempts}>{attempts} attempt{attempts !== 1 ? 's' : ''}</span>
      )}
    </div>
  );

  const formatDateTime = (dt) => {
    if (!dt) return '—';
    const d = new Date(dt);
    return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
  };

  // Group by session for session breakdown
  const sessionGroups = sessions.map(sess => ({
    ...sess,
    count: players.filter(p => p.session_id === sess.id).length,
    cp1: players.filter(p => p.session_id === sess.id && p.cp1_completed).length,
    cp2: players.filter(p => p.session_id === sess.id && p.cp2_completed).length,
    cp3: players.filter(p => p.session_id === sess.id && p.cp3_completed).length,
  }));

  return (
    <div>
      {/* Session Summary Cards */}
      {sessionGroups.length > 0 && (
        <div style={s.summaryGrid}>
          {sessionGroups.map(sess => (
            <div key={sess.id} style={s.summaryCard} onClick={() => setSelectedSession(String(sess.id))}>
              <div style={s.summaryName}>{sess.name}</div>
              <div style={s.summaryCount}>{sess.count} players</div>
              <div style={s.summaryProgress}>
                <span style={s.summaryCP}>CP1: {sess.cp1}</span>
                <span style={s.summaryCP}>CP2: {sess.cp2}</span>
                <span style={s.summaryCP}>CP3: {sess.cp3}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={s.card}>
        <div style={s.topRow}>
          <h2 style={s.cardTitle}>👥 Players ({filtered.length}{filtered.length !== players.length ? ` of ${players.length}` : ''})</h2>
          <div style={s.controls}>
            <input
              style={s.search}
              placeholder="🔍 Search players..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select style={s.select} value={selectedSession} onChange={e => setSelectedSession(e.target.value)}>
              <option value="all">All Sessions</option>
              {sessions.map(sess => (
                <option key={sess.id} value={sess.id}>{sess.name}</option>
              ))}
            </select>
            <select style={s.select} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="joined_at">Sort: Joined</option>
              <option value="nickname">Sort: Name</option>
              <option value="session">Sort: Session</option>
              <option value="cp1">Sort: CP1</option>
            </select>
            <button style={s.csvBtn} onClick={handleDownloadCSV} disabled={downloading}>
              {downloading ? '⏳ Downloading...' : '📥 Export CSV'}
            </button>
          </div>
        </div>

        {loading ? <p style={s.muted}>Loading...</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>#</th>
                  <th style={s.th}>Nickname</th>
                  <th style={s.th}>Session</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>CP1 Quiz</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>CP2 Crossword</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>CP3 Food Game</th>
                  <th style={s.th}>Joined At</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} style={i % 2 === 0 ? s.trEven : {}}>
                    <td style={{ ...s.td, color: '#94a3b8', fontSize: '0.8rem' }}>{i + 1}</td>
                    <td style={s.td}>
                      <div style={{ fontWeight: '700', color: '#1e3a5f' }}>{p.nickname}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: {p.id}</div>
                    </td>
                    <td style={s.td}>
                      <span style={s.sessionBadge}>{p.session_name || '—'}</span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      {cpBadge(p.cp1_completed, p.cp1_attempts)}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      {cpBadge(p.cp2_completed, p.cp2_attempts)}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      {cpBadge(p.cp3_completed, p.cp3_attempts)}
                    </td>
                    <td style={s.td}>
                      <div style={{ fontSize: '0.82rem', color: '#475569' }}>{formatDateTime(p.joined_at)}</div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ ...s.td, textAlign: 'center', color: '#94a3b8' }}>
                      No players found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const s = {
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' },
  summaryCard: { background: '#fff', borderRadius: '12px', padding: '1rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer', border: '2px solid transparent', transition: 'border 0.15s', ':hover': { borderColor: '#2563eb' } },
  summaryName: { fontWeight: '700', color: '#1e3a5f', fontSize: '0.9rem', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  summaryCount: { fontSize: '1.4rem', fontWeight: '900', color: '#2563eb', margin: '0.15rem 0' },
  summaryProgress: { display: 'flex', gap: '0.5rem', marginTop: '0.4rem' },
  summaryCP: { background: '#eff6ff', color: '#2563eb', fontSize: '0.72rem', fontWeight: '600', padding: '0.15rem 0.4rem', borderRadius: '4px' },
  card: { background: '#fff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  topRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' },
  cardTitle: { fontSize: '1.1rem', fontWeight: '700', color: '#1e3a5f', margin: 0 },
  controls: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' },
  search: { padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.88rem', outline: 'none', width: '180px' },
  select: { padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', background: '#fff', cursor: 'pointer' },
  csvBtn: { background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '700px' },
  thead: { background: '#f8fafc' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' },
  td: { padding: '0.75rem 1rem', fontSize: '0.88rem', color: '#334155', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  trEven: { background: '#fafafa' },
  badgeGreen: { background: '#f0fdf4', color: '#16a34a', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' },
  badgeGray: { background: '#f1f5f9', color: '#94a3b8', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem' },
  attempts: { fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' },
  sessionBadge: { background: '#eff6ff', color: '#2563eb', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600' },
  muted: { color: '#94a3b8', fontSize: '0.9rem' },
};

export default ManageStudents;
