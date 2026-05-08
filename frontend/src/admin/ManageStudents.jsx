import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const MONTH_NAMES = ['','Januari','Februari','Mac','April','Mei','Jun','Julai','Ogos','September','Oktober','November','Disember'];

const ManageStudents = () => {
  const { admin } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  // Filter state
  const [schools, setSchools] = useState([]);
  const [sessionList, setSessionList] = useState([]);
  const [filterSchool, setFilterSchool] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const fetchPlayers = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterSchool) params.set('school', filterSchool);
    if (filterSession) params.set('session_id', filterSession);
    if (filterMonth) params.set('month', filterMonth);
    const qs = params.toString() ? `?${params.toString()}` : '';

    api.get(`/admin/players${qs}`)
      .then(res => {
        setPlayers(res.data.players);
        if (res.data.schools) setSchools(res.data.schools);
        if (res.data.sessions) setSessionList(res.data.sessions);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPlayers(); }, [filterSchool, filterSession, filterMonth]);

  const handleDelete = async (player) => {
    if (!window.confirm(
      `Padamkan Pemain "${player.nickname}"?\n\nTindakan ini akan memadamkan kemajuan, markah dan sejarah sembang mereka secara kekal. Tindakan ini tidak boleh dibatalkan.`
    )) return;

    setDeleting(player.id);
    try {
      await api.delete(`/admin/players/${player.id}`);
      setPlayers(prev => prev.filter(p => p.id !== player.id));
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal untuk memadamkan pemain');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = players.filter(p =>
    p.nickname?.toLowerCase().includes(search.toLowerCase()) ||
    p.session_name?.toLowerCase().includes(search.toLowerCase())
  );

  const isMainAdmin = admin?.role === 'main_admin';
  const isAdmin = admin?.role === 'admin';
  const canDelete = ['main_admin', 'admin', 'teacher'].includes(admin?.role);
  const showSchoolFilter = isMainAdmin || isAdmin;

  const clearFilters = () => {
    setFilterSchool('');
    setFilterSession('');
    setFilterMonth('');
  };

  const hasActiveFilters = filterSchool || filterSession || filterMonth;

  return (
    <div>
      {/* Filter Bar */}
      <div style={s.filterBar}>
        <span style={s.filterLabel}>🔍 Tapis:</span>

        {showSchoolFilter && (
          <select style={s.filterSelect} value={filterSchool} onChange={e => setFilterSchool(e.target.value)}>
            <option value="">Semua Sekolah</option>
            {schools.map(sch => (
              <option key={sch} value={sch}>{sch}</option>
            ))}
          </select>
        )}

        <select style={s.filterSelect} value={filterSession} onChange={e => setFilterSession(e.target.value)}>
          <option value="">Semua Sesi</option>
          {sessionList.map(sess => (
            <option key={sess.id} value={String(sess.id)}>{sess.session_name}</option>
          ))}
        </select>

        <select style={s.filterSelect} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          <option value="">Semua Bulan</option>
          {MONTH_NAMES.slice(1).map((m, i) => (
            <option key={i + 1} value={String(i + 1)}>{m}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button style={s.clearBtn} onClick={clearFilters}>✕ Kosongkan</button>
        )}
      </div>

      <div style={s.card}>
        <div style={s.topRow}>
          <h2 style={s.cardTitle}>👥 Semua Pemain ({players.length})</h2>
          <input
            style={s.search}
            placeholder="🔍 Cari dengan nama atau sesi..."
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
                  {showSchoolFilter && <th style={s.th}>Sekolah</th>}
                  <th style={s.th}>Sesi</th>
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
                    {showSchoolFilter && (
                      <td style={s.td}>
                        <span style={s.schoolBadge} data-no-translate="true">{p.teacher_school || '—'}</span>
                      </td>
                    )}
                    <td style={s.td}>
                      <span style={s.sessionBadge} data-no-translate="true">{p.session_name || '—'}</span>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={p.cp1_completed ? s.badgeGreen : s.badgeGray}>
                          {p.cp1_completed ? '✅ Selesai' : '❌ Belum Selesai'}
                        </span>
                        <span style={s.attemptBadge}>
                          🔄 {p.cp1_attempts || 0} Percubaan{(p.cp1_attempts || 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={p.cp2_completed ? s.badgeGreen : s.badgeGray}>
                          {p.cp2_completed ? '✅ Selesai' : '❌  Belum Selesai'}
                        </span>
                        <span style={s.attemptBadge}>
                          🔄 {p.cp2_attempts || 0} Percubaan{(p.cp2_attempts || 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={p.cp3_completed ? s.badgeGreen : s.badgeGray}>
                          {p.cp3_completed ? '✅ Selesai' : '❌ Belum Selesai'}
                        </span>
                        <span style={s.attemptBadge}>
                          🔄 {p.cp3_attempts || 0} Percubaan{(p.cp3_attempts || 0) !== 1 ? 's' : ''}
                        </span>
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
                          title={`Remove ${p.nickname}`}
                        >
                          {deleting === p.id ? '…' : '🗑️ Padam'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={canDelete ? (showSchoolFilter ? 9 : 8) : (showSchoolFilter ? 8 : 7)} style={{ ...s.td, textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
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
  filterBar: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', background: '#fff', borderRadius: '12px', padding: '0.85rem 1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flexWrap: 'wrap' },
  filterLabel: { fontSize: '0.88rem', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' },
  filterSelect: { minWidth: '160px', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', color: '#1e293b', background: '#f8fafc', cursor: 'pointer', outline: 'none' },
  clearBtn: { background: '#fff1f2', color: '#e11d48', border: 'none', borderRadius: '8px', padding: '0.4rem 0.85rem', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap' },
  card: { background: '#fff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  topRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' },
  cardTitle: { fontSize: '1.1rem', fontWeight: '700', color: '#1e3a5f', margin: 0 },
  search: { padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', width: '240px' },
  hint: { background: '#fef9ee', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.6rem 1rem', fontSize: '0.82rem', color: '#92400e', marginBottom: '1rem' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '600px' },
  thead: { background: '#f8fafc' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: '600', color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  td: { padding: '0.7rem 1rem', fontSize: '0.88rem', color: '#334155', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  trEven: { background: '#fafafa' },
  playerAvatar: { width: '30px', height: '30px', borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 },
  sessionBadge: { background: '#eff6ff', color: '#2563eb', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' },
  schoolBadge: { background: '#f0fdf4', color: '#16a34a', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' },
  badgeGreen: { background: '#f0fdf4', color: '#16a34a', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap' },
  badgeGray: { background: '#f1f5f9', color: '#94a3b8', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.8rem' },
  dateText: { color: '#64748b', fontSize: '0.82rem' },
  muted: { color: '#94a3b8', fontSize: '0.9rem' },
  btnDelete: { background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '7px', padding: '0.35rem 0.8rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', whiteSpace: 'nowrap', transition: 'opacity 0.2s' },
  attemptBadge: { background: '#f1f5f9', color: '#64748b', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600', whiteSpace: 'nowrap' },
};

export default ManageStudents;
