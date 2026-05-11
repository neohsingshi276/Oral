import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const ManageStudents = () => {
  const { admin } = useAuth();
  const [players, setPlayers]     = useState([]);
  const [schools, setSchools]     = useState([]);
  const [sessions, setSessions]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterSchool, setFilterSchool]   = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [filterMonth, setFilterMonth]     = useState('');
  const [deleting, setDeleting]   = useState(null);

  const isTeacher = admin?.role === 'teacher';
  const canDelete = ['main_admin','admin','teacher'].includes(admin?.role);

  const fetchPlayers = (school = filterSchool, session = filterSession, month = filterMonth) => {
    setLoading(true);
    const params = {};
    if (school)  params.school     = school;
    if (session) params.session_id = session;
    if (month)   params.month      = month;
    api.get('/admin/players', { params })
      .then(res => {
        setPlayers(res.data.players || []);
        if (res.data.schools)  setSchools(res.data.schools);
        if (res.data.sessions) setSessions(res.data.sessions);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPlayers(); }, []);

  const applyFilters = () => fetchPlayers(filterSchool, filterSession, filterMonth);
  const clearFilters = () => {
    setFilterSchool(''); setFilterSession(''); setFilterMonth('');
    fetchPlayers('', '', '');
  };

  const handleDelete = async (player) => {
    if (!window.confirm(
      `Padamkan Pemain "${player.nickname}"?\n\nTindakan ini akan memadamkan kemajuan, markah dan sejarah sembang mereka secara kekal.`
    )) return;
    setDeleting(player.id);
    try {
      await api.delete(`/admin/players/${player.id}`);
      setPlayers(prev => prev.filter(p => p.id !== player.id));
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal untuk memadamkan pemain');
    } finally { setDeleting(null); }
  };

  const filtered = players.filter(p =>
    p.nickname?.toLowerCase().includes(search.toLowerCase()) ||
    p.session_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.school?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* ── Filter Bar ── */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={s.cardTitle}>🔍 Tapis Pemain</h2>
          {(filterSchool || filterSession || filterMonth) && (
            <button style={s.btnClear} onClick={clearFilters}>✕ Padam Tapisan</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* School filter — hidden for teachers (auto-locked to their school) */}
          {!isTeacher && (
            <div style={{ minWidth: '180px' }}>
              <label style={s.filterLabel}>🏫 Sekolah</label>
              <select style={s.filterSelect} value={filterSchool} onChange={e => setFilterSchool(e.target.value)}>
                <option value="">Semua Sekolah</option>
                {schools.map(sc => <option key={sc} value={sc}>{sc}</option>)}
              </select>
            </div>
          )}
          <div style={{ minWidth: '180px' }}>
            <label style={s.filterLabel}>📋 Sesi</label>
            <select style={s.filterSelect} value={filterSession} onChange={e => setFilterSession(e.target.value)}>
              <option value="">Semua Sesi</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.session_name}{s.session_month ? ` (${s.session_month})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: '150px' }}>
            <label style={s.filterLabel}>📅 Bulan</label>
            <select style={s.filterSelect} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              <option value="">Semua Bulan</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button style={s.btnApply} onClick={applyFilters}>🔍 Guna Tapisan</button>
        </div>
        {isTeacher && admin?.school && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#0d9488' }}>
            🏫 Hanya pemain dari <strong>{admin.school}</strong> ditunjukkan
          </div>
        )}
      </div>

      {/* ── Players Table ── */}
      <div style={s.card}>
        <div style={s.topRow}>
          <h2 style={s.cardTitle}>👥 Pemain ({filtered.length} / {players.length})</h2>
          <input
            style={s.search}
            placeholder="🔍 Cari nama, sesi, sekolah..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {canDelete && (
          <div style={s.hint}>
            🗑️ Anda boleh memadam pemain. Tindakan ini memadamkan semua data mereka secara kekal.
          </div>
        )}

        {loading ? (
          <p style={s.muted}>Memuatkan data pemain…</p>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Nama Samaran</th>
                  <th style={s.th}>Sesi</th>
                  {!isTeacher && <th style={s.th}>Sekolah</th>}
                  <th style={s.th}>CP1 Kuiz</th>
                  <th style={s.th}>CP2 Teka Silang Kata</th>
                  <th style={s.th}>CP3 Permainan Makanan</th>
                  <th style={s.th}>Disertai Pada</th>
                  {canDelete && <th style={s.th}>Tindakan</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} style={i % 2 === 0 ? s.trEven : {}}>
                    <td style={s.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={s.playerAvatar}>{p.nickname?.[0]?.toUpperCase()}</div>
                        <strong data-no-translate="true">{p.nickname}</strong>
                      </div>
                    </td>
                    <td style={s.td}>
                      <div>
                        <span style={s.sessionBadge} data-no-translate="true">{p.session_name || '—'}</span>
                        {p.session_month && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>📅 {p.session_month}</div>}
                      </div>
                    </td>
                    {!isTeacher && (
                      <td style={s.td}>
                        <span style={{ fontSize: '0.82rem', color: '#0d9488' }}>{p.school || '—'}</span>
                      </td>
                    )}
                    <td style={s.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={p.cp1_completed ? s.badgeGreen : s.badgeGray}>
                          {p.cp1_completed ? '✅ Selesai' : '❌ Belum Selesai'}
                        </span>
                        <span style={s.attemptBadge}>🔄 {p.cp1_attempts || 0} Percubaan</span>
                      </div>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={p.cp2_completed ? s.badgeGreen : s.badgeGray}>
                          {p.cp2_completed ? '✅ Selesai' : '❌ Belum Selesai'}
                        </span>
                        <span style={s.attemptBadge}>🔄 {p.cp2_attempts || 0} Percubaan</span>
                      </div>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={p.cp3_completed ? s.badgeGreen : s.badgeGray}>
                          {p.cp3_completed ? '✅ Selesai' : '❌ Belum Selesai'}
                        </span>
                        <span style={s.attemptBadge}>🔄 {p.cp3_attempts || 0} Percubaan</span>
                      </div>
                    </td>
                    <td style={s.td}>
                      <span style={s.dateText}>
                        {new Date(p.joined_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    {canDelete && (
                      <td style={s.td}>
                        <button
                          style={{ ...s.btnDelete, opacity: deleting === p.id ? 0.5 : 1 }}
                          onClick={() => handleDelete(p)}
                          disabled={deleting === p.id}
                        >
                          {deleting === p.id ? '…' : '🗑️ Padam'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={isTeacher ? (canDelete ? 7 : 6) : (canDelete ? 8 : 7)} style={{ ...s.td, textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                      Tiada Pemain Ditemui
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
  card: { background: '#fff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  topRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' },
  cardTitle: { fontSize: '1.1rem', fontWeight: '700', color: '#1e3a5f', margin: 0 },
  search: { padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', width: '260px' },
  hint: { background: '#fef9ee', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.6rem 1rem', fontSize: '0.82rem', color: '#92400e', marginBottom: '1rem' },
  filterLabel: { display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' },
  filterSelect: { padding: '0.45rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.88rem', outline: 'none', width: '100%', background: '#fff' },
  btnApply: { padding: '0.5rem 1.2rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem', whiteSpace: 'nowrap' },
  btnClear: { padding: '0.35rem 0.9rem', background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '600px' },
  thead: { background: '#f8fafc' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: '600', color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  td: { padding: '0.7rem 1rem', fontSize: '0.88rem', color: '#334155', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  trEven: { background: '#fafafa' },
  playerAvatar: { width: '30px', height: '30px', borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 },
  sessionBadge: { background: '#eff6ff', color: '#2563eb', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' },
  badgeGreen: { background: '#f0fdf4', color: '#16a34a', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap' },
  badgeGray:  { background: '#f1f5f9', color: '#94a3b8', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.8rem' },
  dateText: { color: '#64748b', fontSize: '0.82rem' },
  muted: { color: '#94a3b8', fontSize: '0.9rem' },
  btnDelete: { background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '7px', padding: '0.35rem 0.8rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', whiteSpace: 'nowrap' },
  attemptBadge: { background: '#f1f5f9', color: '#64748b', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600', whiteSpace: 'nowrap' },
};

export default ManageStudents;
