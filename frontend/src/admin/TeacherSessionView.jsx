import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const MONTH_ORDER = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pct = (n, total) => total ? Math.round((n / total) * 100) : 0;

const monthSort = (a, b) => {
  if (!a?.ym) return 1;
  if (!b?.ym) return -1;
  return a.ym.localeCompare(b.ym);
};

const playerStats = (players = []) => {
  const total = players.length;
  const avg = (values) => values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : 0;
  const cp1 = players.filter(p => p.cp1_completed).length;
  const cp2 = players.filter(p => p.cp2_completed).length;
  const cp3 = players.filter(p => p.cp3_completed).length;

  return {
    total,
    cp1,
    cp2,
    cp3,
    cp1Rate: pct(cp1, total),
    cp2Rate: pct(cp2, total),
    cp3Rate: pct(cp3, total),
    avgQuiz: avg(players.filter(p => p.quiz_score != null).map(p => Number(p.quiz_score) || 0)),
    avgCp3: avg(players.filter(p => p.cp3_score != null).map(p => Number(p.cp3_score) || 0)),
    avgCp1Attempts: avg(players.filter(p => p.cp1_attempts > 0).map(p => Number(p.cp1_attempts) || 0)),
    avgCp2Attempts: avg(players.filter(p => p.cp2_attempts > 0).map(p => Number(p.cp2_attempts) || 0)),
    avgCp3Attempts: avg(players.filter(p => p.cp3_attempts > 0).map(p => Number(p.cp3_attempts) || 0)),
  };
};

const formatDate = (date) => new Date(date).toLocaleDateString(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});

const StatBox = ({ label, value, color = '#2563eb', sub }) => (
  <div style={s.statBox}>
    <div style={{ ...s.statValue, color }}>{value}</div>
    <div style={s.statLabel}>{label}</div>
    {sub && <div style={s.statSub}>{sub}</div>}
  </div>
);

const PlayerProgressTable = ({ players, loading, onDelete, deletingId, search, onSearch }) => {
  const filtered = players.filter(p => p.nickname?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div style={s.empty}>Memuatkan pelajar...</div>;

  return (
    <div style={s.card}>
      <div style={s.tableHeader}>
        <div>
          <h3 style={s.cardTitle}>Senarai Pelajar</h3>
          <p style={s.subtle}>{filtered.length} daripada {players.length} pelajar ditunjukkan</p>
        </div>
        <input
          style={s.search}
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Cari nama pelajar..."
        />
      </div>

      <div style={s.warning}>
        Anda boleh memadam pemain. Tindakan ini memadamkan semua data mereka secara kekal.
      </div>

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              <th style={s.th}>Nama Samaran</th>
              <th style={s.th}>CP1 Kuiz</th>
              <th style={s.th}>Skor Kuiz</th>
              <th style={s.th}>CP2 Teka Silang</th>
              <th style={s.th}>CP3 Makanan</th>
              <th style={s.th}>Skor CP3</th>
              <th style={s.th}>Disertai</th>
              <th style={s.th}>Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, index) => (
              <tr key={p.id} style={index % 2 === 0 ? s.trEven : undefined}>
                <td style={s.td}>
                  <div style={s.playerName}>
                    <span style={s.avatar}>{p.nickname?.[0]?.toUpperCase() || '?'}</span>
                    <strong>{p.nickname}</strong>
                  </div>
                </td>
                <td style={s.td}>{checkpointCell(p.cp1_completed, p.cp1_attempts)}</td>
                <td style={s.td}>{scoreCell(p.quiz_score, p.quiz_total)}</td>
                <td style={s.td}>{checkpointCell(p.cp2_completed, p.cp2_attempts)}</td>
                <td style={s.td}>{checkpointCell(p.cp3_completed, p.cp3_attempts)}</td>
                <td style={s.td}>{p.cp3_score != null ? <strong style={{ color: '#d97706' }}>{p.cp3_score}</strong> : <span style={s.muted}>-</span>}</td>
                <td style={s.td}><span style={s.dateText}>{formatDate(p.joined_at)}</span></td>
                <td style={s.td}>
                  <button
                    style={{ ...s.deleteBtn, opacity: deletingId === p.id ? 0.5 : 1 }}
                    disabled={deletingId === p.id}
                    onClick={() => onDelete(p)}
                  >
                    {deletingId === p.id ? '...' : 'Padam'}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ ...s.td, textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                  Tiada pelajar untuk bulan ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const checkpointCell = (completed, attempts = 0) => (
  <div style={s.checkCell}>
    <span style={completed ? s.badgeGreen : s.badgeGray}>
      {completed ? 'Selesai' : 'Belum'}
    </span>
    <span style={s.attemptBadge}>{attempts || 0} percubaan</span>
  </div>
);

const scoreCell = (score, total) => (
  score != null
    ? <strong style={{ color: '#2563eb' }}>{score}<span style={s.scoreTotal}>/{total || '?'}</span></strong>
    : <span style={s.muted}>-</span>
);

const MonthComparison = ({ monthData }) => {
  const chartData = monthData.map(item => {
    const stats = playerStats(item.players || []);
    return {
      month: item.shortLabel,
      pelajar: stats.total,
      CP1: stats.cp1Rate,
      CP2: stats.cp2Rate,
      CP3: stats.cp3Rate,
      Kuiz: stats.avgQuiz,
      Makanan: stats.avgCp3,
    };
  });

  if (monthData.length < 2) {
    return (
      <div style={s.card}>
        <h3 style={s.cardTitle}>Perbandingan Bulanan</h3>
        <p style={s.subtle}>Perbandingan akan muncul apabila sesi ini mempunyai pelajar dalam sekurang-kurangnya dua bulan.</p>
      </div>
    );
  }

  return (
    <div style={s.card}>
      <h3 style={s.cardTitle}>Perbandingan Bulanan</h3>
      <div style={{ height: 260, marginTop: '1rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="CP1" name="CP1 %" fill="#16a34a" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="CP2" name="CP2 %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="CP3" name="CP3 %" fill="#e11d48" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="pelajar" name="Pelajar" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={s.monthSummaryGrid}>
        {monthData.map(item => {
          const stats = playerStats(item.players || []);
          return (
            <div key={item.ym} style={s.monthSummary}>
              <div style={s.monthSummaryTitle}>{item.label}</div>
              <div style={s.monthSummaryLine}>{stats.total} pelajar</div>
              <div style={s.monthSummaryLine}>CP1 {stats.cp1Rate}% · CP2 {stats.cp2Rate}% · CP3 {stats.cp3Rate}%</div>
              <div style={s.monthSummaryLine}>Purata percubaan: {stats.avgCp1Attempts}/{stats.avgCp2Attempts}/{stats.avgCp3Attempts}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TeacherSessionView = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [playersByMonth, setPlayersByMonth] = useState({});
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [deletingPlayer, setDeletingPlayer] = useState(null);
  const [copied, setCopied] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/admin/teacher-sessions')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const sessions = data?.sessions || [];

  const availableMonths = useMemo(() => {
    if (!selectedSession) return [];
    return (selectedSession.usage_months || [])
      .slice()
      .sort(monthSort)
      .map(month => ({
        ...month,
        shortLabel: month.label.replace(/\s+\d{4}$/, ''),
      }));
  }, [selectedSession]);

  const monthKey = (sessionId, ym) => `${sessionId}-${ym}`;
  const currentPlayers = selectedSession && selectedMonth
    ? playersByMonth[monthKey(selectedSession.id, selectedMonth)] || []
    : [];
  const currentStats = playerStats(currentPlayers);

  const loadMonthPlayers = async (sessionId, ym) => {
    const key = monthKey(sessionId, ym);
    if (playersByMonth[key]) return playersByMonth[key];
    const res = await api.get(`/admin/session-players/${sessionId}`, { params: { month: ym } });
    setPlayersByMonth(prev => ({ ...prev, [key]: res.data.players || [] }));
    return res.data.players || [];
  };

  const openSession = async (session) => {
    setSelectedSession(session);
    setSearch('');
    const months = (session.usage_months || []).slice().sort(monthSort);
    const firstMonth = months[months.length - 1]?.ym || '';
    setSelectedMonth(firstMonth);

    if (!firstMonth) return;
    setLoadingPlayers(true);
    try {
      await loadMonthPlayers(session.id, firstMonth);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlayers(false);
    }

    if (months.length > 1) {
      setLoadingComparison(true);
      try {
        await Promise.all(months.map(month => loadMonthPlayers(session.id, month.ym)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingComparison(false);
      }
    }
  };

  const selectMonth = async (ym) => {
    setSelectedMonth(ym);
    setSearch('');
    if (!selectedSession) return;
    setLoadingPlayers(true);
    try {
      await loadMonthPlayers(selectedSession.id, ym);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const handleDeletePlayer = async (player) => {
    if (!window.confirm(`Padamkan Pemain "${player.nickname}"?\n\nTindakan ini akan memadamkan kemajuan, markah dan sejarah sembang mereka secara kekal.`)) return;
    setDeletingPlayer(player.id);
    try {
      await api.delete(`/admin/players/${player.id}`);
      const key = monthKey(selectedSession.id, selectedMonth);
      setPlayersByMonth(prev => ({
        ...prev,
        [key]: (prev[key] || []).filter(p => p.id !== player.id),
      }));
      setData(prev => ({
        ...prev,
        sessions: (prev.sessions || []).map(ses => (
          ses.id === selectedSession.id
            ? { ...ses, player_count: Math.max(0, (ses.player_count || 0) - 1) }
            : ses
        )),
      }));
      setSelectedSession(prev => prev
        ? { ...prev, player_count: Math.max(0, (prev.player_count || 0) - 1) }
        : prev);
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal memadamkan pemain');
    } finally {
      setDeletingPlayer(null);
    }
  };

  const monthData = selectedSession ? availableMonths.map(month => ({
    ...month,
    players: playersByMonth[monthKey(selectedSession.id, month.ym)] || [],
  })) : [];

  if (loading) return <div style={s.empty}>Memuatkan sesi...</div>;
  if (!data) return <div style={s.error}>Gagal memuatkan data.</div>;

  if (selectedSession) {
    return (
      <div>
        <button style={s.backBtn} onClick={() => setSelectedSession(null)}>Kembali ke semua sesi</button>

        <div style={s.detailHeader}>
          <div>
            <div style={s.schoolText}>{data.school || 'Sekolah Anda'}</div>
            <h2 style={s.detailTitle}>{selectedSession.session_name}</h2>
            <div style={s.detailMeta}>
              Kod sesi: <strong>{selectedSession.unique_token}</strong> · {selectedSession.is_active ? 'Aktif' : 'Tidak Aktif'} · {selectedSession.player_count || 0} pelajar
            </div>
          </div>
          <button
            style={{ ...s.copyBtn, background: copied === selectedSession.unique_token ? '#f0fdf4' : '#fff' }}
            onClick={() => copyCode(selectedSession.unique_token)}
          >
            {copied === selectedSession.unique_token ? 'Disalin' : 'Salin Kod'}
          </button>
        </div>

        {availableMonths.length === 0 ? (
          <div style={s.card}>
            <h3 style={s.cardTitle}>Belum ada pelajar</h3>
            <p style={s.subtle}>Apabila pelajar menyertai sesi ini, bulan dan senarai markah mereka akan muncul di sini.</p>
          </div>
        ) : (
          <>
            <div style={s.card}>
              <h3 style={s.cardTitle}>Pilih Bulan</h3>
              <div style={s.monthTabs}>
                {availableMonths.map(month => (
                  <button
                    key={month.ym}
                    style={selectedMonth === month.ym ? s.monthTabActive : s.monthTab}
                    onClick={() => selectMonth(month.ym)}
                  >
                    {month.shortLabel}
                  </button>
                ))}
              </div>
            </div>

            <div style={s.statGrid}>
              <StatBox label="Pelajar" value={currentStats.total} color="#2563eb" />
              <StatBox label="CP1 Selesai" value={`${currentStats.cp1Rate}%`} color="#16a34a" sub={`${currentStats.cp1}/${currentStats.total}`} />
              <StatBox label="CP2 Selesai" value={`${currentStats.cp2Rate}%`} color="#f59e0b" sub={`${currentStats.cp2}/${currentStats.total}`} />
              <StatBox label="CP3 Selesai" value={`${currentStats.cp3Rate}%`} color="#e11d48" sub={`${currentStats.cp3}/${currentStats.total}`} />
              <StatBox label="Purata Kuiz" value={currentStats.avgQuiz || '-'} color="#2563eb" />
              <StatBox label="Purata CP3" value={currentStats.avgCp3 || '-'} color="#d97706" />
            </div>

            <PlayerProgressTable
              players={currentPlayers}
              loading={loadingPlayers}
              onDelete={handleDeletePlayer}
              deletingId={deletingPlayer}
              search={search}
              onSearch={setSearch}
            />

            {loadingComparison ? (
              <div style={s.empty}>Memuatkan perbandingan bulan...</div>
            ) : (
              <MonthComparison monthData={monthData} />
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={s.headerCard}>
        <div>
          <div style={s.schoolText}>{data.school || 'Sekolah Anda'}</div>
          <h2 style={s.headerTitle}>Sesi Guru</h2>
          <p style={s.headerSub}>Pilih satu sesi untuk melihat bulan, pelajar, markah, percubaan dan perbandingan bulanan.</p>
        </div>
        <div style={s.sessionCount}>{sessions.length} sesi</div>
      </div>

      {sessions.length === 0 ? (
        <div style={s.card}>
          <p style={s.subtle}>Tiada sesi lagi. Sesi yang ditugaskan kepada guru akan muncul di sini.</p>
        </div>
      ) : (
        <div style={s.sessionGrid}>
          {sessions.map(session => (
            <div key={session.id} style={s.sessionCard}>
              <div style={s.sessionTop}>
                <div>
                  <h3 style={s.sessionTitle}>{session.session_name}</h3>
                  <p style={s.subtle}>{session.player_count || 0} pelajar · {session.is_active ? 'Aktif' : 'Tidak Aktif'}</p>
                </div>
                <span style={session.is_active ? s.statusActive : s.statusInactive}>{session.is_active ? 'ON' : 'OFF'}</span>
              </div>

              <div style={s.codeRow}>
                {(session.unique_token || '----').split('').map((char, index) => (
                  <span key={index} style={s.codeDigit}>{char}</span>
                ))}
              </div>

              <div style={s.sessionFooter}>
                <span style={s.monthPill}>{session.usage_months?.length || 0} bulan</span>
                <button style={s.primaryBtn} onClick={() => openSession(session)}>Buka Sesi</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const s = {
  headerCard: { background: '#fff', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' },
  headerTitle: { fontSize: '1.5rem', color: '#01306B', margin: '0.15rem 0', fontWeight: 800 },
  headerSub: { color: '#64748b', margin: 0, fontSize: '0.92rem', lineHeight: 1.5 },
  schoolText: { color: '#0d9488', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' },
  sessionCount: { background: '#eff6ff', color: '#2563eb', padding: '0.45rem 1rem', borderRadius: '999px', fontWeight: 800, fontSize: '0.9rem' },
  sessionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' },
  sessionCard: { background: '#fff', borderRadius: '12px', padding: '1.2rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  sessionTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' },
  sessionTitle: { color: '#1e3a5f', margin: '0 0 0.25rem', fontSize: '1.05rem', fontWeight: 800 },
  statusActive: { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '999px', padding: '0.2rem 0.55rem', fontSize: '0.72rem', fontWeight: 800 },
  statusInactive: { background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '999px', padding: '0.2rem 0.55rem', fontSize: '0.72rem', fontWeight: 800 },
  codeRow: { display: 'flex', gap: '0.35rem', marginTop: '1rem' },
  codeDigit: { width: '30px', height: '34px', background: '#1e3a5f', color: '#fff', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 },
  sessionFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' },
  monthPill: { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '999px', padding: '0.25rem 0.7rem', fontSize: '0.78rem', fontWeight: 700 },
  primaryBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.55rem 1rem', cursor: 'pointer', fontWeight: 800, fontSize: '0.86rem' },
  backBtn: { background: '#fff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.5rem 0.9rem', cursor: 'pointer', fontWeight: 800, marginBottom: '1rem' },
  detailHeader: { background: 'linear-gradient(135deg, #01306B 0%, #2563eb 100%)', color: '#fff', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
  detailTitle: { margin: '0.15rem 0', fontSize: '1.5rem', fontWeight: 900 },
  detailMeta: { color: 'rgba(255,255,255,0.82)', fontSize: '0.9rem' },
  copyBtn: { color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.55rem 1rem', cursor: 'pointer', fontWeight: 800 },
  card: { background: '#fff', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardTitle: { color: '#1e3a5f', margin: 0, fontSize: '1.05rem', fontWeight: 800 },
  subtle: { color: '#64748b', margin: 0, fontSize: '0.86rem', lineHeight: 1.45 },
  monthTabs: { display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '1rem' },
  monthTab: { background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.55rem 0.9rem', cursor: 'pointer', fontWeight: 800 },
  monthTabActive: { background: '#2563eb', color: '#fff', border: '1px solid #2563eb', borderRadius: '8px', padding: '0.55rem 0.9rem', cursor: 'pointer', fontWeight: 800 },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' },
  statBox: { background: '#fff', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  statValue: { fontSize: '1.45rem', fontWeight: 900 },
  statLabel: { color: '#64748b', fontSize: '0.78rem', fontWeight: 800, marginTop: '0.2rem' },
  statSub: { color: '#94a3b8', fontSize: '0.72rem', marginTop: '0.15rem' },
  tableHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' },
  search: { width: '260px', maxWidth: '100%', padding: '0.55rem 0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' },
  warning: { background: '#fef9ee', border: '1px solid #fde68a', color: '#92400e', borderRadius: '8px', padding: '0.65rem 0.9rem', fontSize: '0.82rem', marginBottom: '1rem' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', minWidth: '820px', borderCollapse: 'collapse' },
  thead: { background: '#f8fafc' },
  th: { textAlign: 'left', padding: '0.75rem 0.9rem', color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', fontSize: '0.78rem', fontWeight: 800 },
  td: { padding: '0.72rem 0.9rem', borderBottom: '1px solid #f1f5f9', color: '#334155', fontSize: '0.86rem', verticalAlign: 'middle' },
  trEven: { background: '#fafafa' },
  playerName: { display: 'flex', alignItems: 'center', gap: '0.55rem', whiteSpace: 'nowrap' },
  avatar: { width: '30px', height: '30px', borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 },
  checkCell: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' },
  badgeGreen: { background: '#f0fdf4', color: '#16a34a', borderRadius: '6px', padding: '0.2rem 0.55rem', fontWeight: 800, fontSize: '0.78rem', whiteSpace: 'nowrap' },
  badgeGray: { background: '#f1f5f9', color: '#94a3b8', borderRadius: '6px', padding: '0.2rem 0.55rem', fontWeight: 800, fontSize: '0.78rem', whiteSpace: 'nowrap' },
  attemptBadge: { background: '#f8fafc', color: '#64748b', borderRadius: '5px', padding: '0.16rem 0.45rem', fontWeight: 700, fontSize: '0.72rem', whiteSpace: 'nowrap' },
  scoreTotal: { color: '#94a3b8', fontWeight: 500, fontSize: '0.72rem' },
  dateText: { color: '#64748b', whiteSpace: 'nowrap' },
  muted: { color: '#94a3b8' },
  deleteBtn: { background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '7px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontWeight: 800, fontSize: '0.78rem' },
  monthSummaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem', marginTop: '1rem' },
  monthSummary: { border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem', background: '#fafafa' },
  monthSummaryTitle: { color: '#1e3a5f', fontWeight: 900, marginBottom: '0.35rem' },
  monthSummaryLine: { color: '#64748b', fontSize: '0.8rem', marginTop: '0.2rem' },
  empty: { background: '#fff', color: '#94a3b8', borderRadius: '12px', padding: '2rem', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  error: { background: '#fff1f2', color: '#e11d48', borderRadius: '12px', padding: '1rem' },
};

export default TeacherSessionView;
