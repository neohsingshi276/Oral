import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

// ─── Score engine (mirrors Analytics.jsx) ────────────────────────────────────
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

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);
const avg = (arr, key) => arr.length > 0
  ? (arr.reduce((s, p) => s + (p[key] || 0), 0) / arr.length).toFixed(1)
  : '0.0';

const buildStats = (players) => {
  if (!players.length) return null;
  const marked = computeMarks(players);
  const total  = players.length;
  const cp1Done = players.filter(p => p.cp1_completed).length;
  const cp2Done = players.filter(p => p.cp2_completed).length;
  const cp3Done = players.filter(p => p.cp3_completed).length;
  const allDone = players.filter(p => p.cp1_completed && p.cp2_completed && p.cp3_completed).length;
  const avgScore   = total > 0 ? Math.round(marked.reduce((s, p) => s + p.total_mark, 0) / total) : 0;
  const avgAtt1    = parseFloat(avg(players, 'cp1_attempts'));
  const avgAtt2    = parseFloat(avg(players, 'cp2_attempts'));
  const avgAtt3    = parseFloat(avg(players, 'cp3_attempts'));
  const leaderboard = [...marked]
    .sort((a, b) => b.total_mark - a.total_mark || a.nickname.localeCompare(b.nickname))
    .slice(0, 8);
  return { total, cp1Done, cp2Done, cp3Done, allDone,
    cp1Pct: pct(cp1Done, total), cp2Pct: pct(cp2Done, total),
    cp3Pct: pct(cp3Done, total), allPct: pct(allDone, total),
    avgScore, avgAtt1, avgAtt2, avgAtt3, leaderboard };
};

// ─── Colour palette ──────────────────────────────────────────────────────────
const COLOR_A = '#2563eb';
const COLOR_B = '#e11d48';
const MEDAL   = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];

// ─── Month helpers ───────────────────────────────────────────────────────────
const toMonthKey = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (key) =>
  new Date(key + '-02').toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' });

// ─── Stat card ───────────────────────────────────────────────────────────────
const StatRow = ({ label, a, b, unit = '', higher = 'good' }) => {
  const numA = parseFloat(a);
  const numB = parseFloat(b);
  const aWins = higher === 'good' ? numA > numB : numA < numB;
  const bWins = higher === 'good' ? numB > numA : numB < numA;
  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={td.label}>{label}</td>
      <td style={{ ...td.val, color: aWins ? '#16a34a' : bWins ? '#e11d48' : '#1e3a5f', background: aWins ? '#f0fdf4' : 'transparent' }}>
        {a}{unit} {aWins && '▲'}
      </td>
      <td style={{ ...td.val, color: bWins ? '#16a34a' : aWins ? '#e11d48' : '#1e3a5f', background: bWins ? '#f0fdf4' : 'transparent' }}>
        {b}{unit} {bWins && '▲'}
      </td>
    </tr>
  );
};

const td = {
  label: { padding: '0.6rem 0.75rem', fontSize: '0.82rem', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' },
  val:   { padding: '0.6rem 0.75rem', fontSize: '0.88rem', fontWeight: '700', textAlign: 'center', borderRadius: '4px', transition: 'background 0.2s' },
};

// ─── Main component ───────────────────────────────────────────────────────────
const CompareAnalytics = () => {
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [mode, setMode]             = useState('session'); // 'session' | 'month'
  const [selA, setSelA]             = useState('');
  const [selB, setSelB]             = useState('');

  useEffect(() => {
    api.get('/admin/analytics')
      .then(res => setAllPlayers(res.data.players || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Option lists ────────────────────────────────────────────────────────────
  const sessionOptions = useMemo(() => {
    const map = {};
    allPlayers.forEach(p => {
      if (!map[p.session_id]) map[p.session_id] = p.session_name || `Sesi ${p.session_id}`;
    });
    return Object.entries(map).map(([id, name]) => ({ id, name }));
  }, [allPlayers]);

  const monthOptions = useMemo(() => {
    const keys = [...new Set(allPlayers.map(p => toMonthKey(p.joined_at)))].sort();
    return keys.map(k => ({ id: k, name: monthLabel(k) }));
  }, [allPlayers]);

  const options = mode === 'session' ? sessionOptions : monthOptions;

  // ── Filter players for each side ────────────────────────────────────────────
  const filterPlayers = (sel) => {
    if (!sel) return [];
    if (mode === 'session') return allPlayers.filter(p => String(p.session_id) === String(sel));
    return allPlayers.filter(p => toMonthKey(p.joined_at) === sel);
  };

  const playersA = useMemo(() => filterPlayers(selA), [selA, allPlayers, mode]);
  const playersB = useMemo(() => filterPlayers(selB), [selB, allPlayers, mode]);
  const statsA   = useMemo(() => buildStats(playersA), [playersA]);
  const statsB   = useMemo(() => buildStats(playersB), [playersB]);

  const labelA = options.find(o => o.id === selA)?.name || 'A';
  const labelB = options.find(o => o.id === selB)?.name || 'B';

  // ── Chart data ──────────────────────────────────────────────────────────────
  const barData = [
    { name: 'CP1 Kuiz',          A: statsA?.cp1Pct ?? 0, B: statsB?.cp1Pct ?? 0 },
    { name: 'CP2 Silang Kata',   A: statsA?.cp2Pct ?? 0, B: statsB?.cp2Pct ?? 0 },
    { name: 'CP3 Permainan',     A: statsA?.cp3Pct ?? 0, B: statsB?.cp3Pct ?? 0 },
    { name: 'Semua Selesai',     A: statsA?.allPct ?? 0, B: statsB?.allPct ?? 0 },
  ];

  const radarData = [
    { subject: 'CP1 %',       A: statsA?.cp1Pct ?? 0,  B: statsB?.cp1Pct ?? 0 },
    { subject: 'CP2 %',       A: statsA?.cp2Pct ?? 0,  B: statsB?.cp2Pct ?? 0 },
    { subject: 'CP3 %',       A: statsA?.cp3Pct ?? 0,  B: statsB?.cp3Pct ?? 0 },
    { subject: 'Avg Markah',  A: statsA?.avgScore ?? 0, B: statsB?.avgScore ?? 0 },
    { subject: 'Semua CP',    A: statsA?.allPct ?? 0,   B: statsB?.allPct ?? 0 },
  ];

  // ── All-players leaderboard (merged, ranked) ─────────────────────────────────
  const mergedLeaderboard = useMemo(() => {
    if (!statsA && !statsB) return [];
    const aPlayers = (statsA?.leaderboard || []).map(p => ({ ...p, group: 'A', groupLabel: labelA }));
    const bPlayers = (statsB?.leaderboard || []).map(p => ({ ...p, group: 'B', groupLabel: labelB }));
    return [...aPlayers, ...bPlayers]
      .sort((x, y) => y.total_mark - x.total_mark || x.nickname.localeCompare(y.nickname))
      .slice(0, 10);
  }, [statsA, statsB, labelA, labelB]);

  if (loading) return <div style={s.loading}>Memuatkan data perbandingan… 📊</div>;

  const ready = selA && selB && selA !== selB;

  return (
    <div style={s.wrap}>

      {/* ── Header ── */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}>🔀 Perbandingan Analitik</h2>
          <p style={s.subtitle}>Bandingkan prestasi antara dua sesi atau dua bulan secara terus.</p>
        </div>
      </div>

      {/* ── Mode toggle ── */}
      <div style={s.card}>
        <div style={s.modeRow}>
          <span style={s.modeLabel}>Mod Perbandingan:</span>
          <div style={s.modeToggle}>
            <button
              style={{ ...s.modeBtn, ...(mode === 'session' ? s.modeBtnActive : {}) }}
              onClick={() => { setMode('session'); setSelA(''); setSelB(''); }}
            >🎮 Sesi vs Sesi</button>
            <button
              style={{ ...s.modeBtn, ...(mode === 'month' ? s.modeBtnActive : {}) }}
              onClick={() => { setMode('month'); setSelA(''); setSelB(''); }}
            >🗓️ Bulan vs Bulan</button>
          </div>
        </div>

        {/* ── Selectors ── */}
        <div style={s.selectorRow}>
          <div style={s.selectorGroup}>
            <label style={{ ...s.selectorLabel, color: COLOR_A }}>● Pilihan A</label>
            <select style={{ ...s.select, borderColor: COLOR_A }} value={selA} onChange={e => setSelA(e.target.value)}>
              <option value="">-- Pilih {mode === 'session' ? 'Sesi' : 'Bulan'} --</option>
              {options.filter(o => o.id !== selB).map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div style={s.vsCircle}>VS</div>

          <div style={s.selectorGroup}>
            <label style={{ ...s.selectorLabel, color: COLOR_B }}>● Pilihan B</label>
            <select style={{ ...s.select, borderColor: COLOR_B }} value={selB} onChange={e => setSelB(e.target.value)}>
              <option value="">-- Pilih {mode === 'session' ? 'Sesi' : 'Bulan'} --</option>
              {options.filter(o => o.id !== selA).map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        </div>

        {options.length === 0 && (
          <p style={s.empty}>Tiada {mode === 'session' ? 'sesi' : 'bulan'} dengan data pemain ditemui.</p>
        )}
        {options.length === 1 && (
          <p style={s.empty}>Hanya satu {mode === 'session' ? 'sesi' : 'bulan'} ada — perlukan sekurang-kurangnya dua untuk membandingkan.</p>
        )}
      </div>

      {/* ── Placeholder when not ready ── */}
      {!ready && (
        <div style={s.placeholder}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
          <p style={{ color: '#475569', fontWeight: '700', fontSize: '1rem' }}>
            Pilih dua {mode === 'session' ? 'sesi' : 'bulan'} yang berbeza untuk mula membandingkan
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.35rem' }}>
            Carta, papan pendahulu dan analisis mendalam akan dipaparkan di sini
          </p>
        </div>
      )}

      {ready && (
        <>
          {/* ── Side-by-side header panels ── */}
          <div style={s.panels}>
            <PanelHeader label={labelA} stats={statsA} color={COLOR_A} side="A" />
            <PanelHeader label={labelB} stats={statsB} color={COLOR_B} side="B" />
          </div>

          {/* ── Stats comparison table ── */}
          <div style={s.card}>
            <h3 style={s.sectionTitle}>📋 Perbandingan Statistik</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ ...td.label, color: '#1e3a5f' }}>Statistik</th>
                    <th style={{ ...td.val, color: COLOR_A, background: '#eff6ff', borderRadius: 0 }}>{labelA}</th>
                    <th style={{ ...td.val, color: COLOR_B, background: '#fff1f2', borderRadius: 0 }}>{labelB}</th>
                  </tr>
                </thead>
                <tbody>
                  <StatRow label="Jumlah Pemain"           a={statsA?.total ?? 0}    b={statsB?.total ?? 0}    />
                  <StatRow label="Purata Markah (/100)"    a={statsA?.avgScore ?? 0} b={statsB?.avgScore ?? 0} unit="" />
                  <StatRow label="CP1 Selesai (%)"         a={statsA?.cp1Pct ?? 0}   b={statsB?.cp1Pct ?? 0}   unit="%" />
                  <StatRow label="CP2 Selesai (%)"         a={statsA?.cp2Pct ?? 0}   b={statsB?.cp2Pct ?? 0}   unit="%" />
                  <StatRow label="CP3 Selesai (%)"         a={statsA?.cp3Pct ?? 0}   b={statsB?.cp3Pct ?? 0}   unit="%" />
                  <StatRow label="Semua CP Selesai (%)"    a={statsA?.allPct ?? 0}   b={statsB?.allPct ?? 0}   unit="%" />
                  <StatRow label="Purata Percubaan CP1"    a={statsA?.avgAtt1 ?? 0}  b={statsB?.avgAtt1 ?? 0}  higher="low" />
                  <StatRow label="Purata Percubaan CP2"    a={statsA?.avgAtt2 ?? 0}  b={statsB?.avgAtt2 ?? 0}  higher="low" />
                  <StatRow label="Purata Percubaan CP3"    a={statsA?.avgAtt3 ?? 0}  b={statsB?.avgAtt3 ?? 0}  higher="low" />
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.5rem' }}>
              🟢 Hijau = lebih baik &nbsp;·&nbsp; ▲ = menang dalam kategori ini &nbsp;·&nbsp; Percubaan: kurang = lebih baik
            </p>
          </div>

          {/* ── Bar Chart ── */}
          <div style={s.card}>
            <h3 style={s.sectionTitle}>📊 Kadar Penyiapan Checkpoint (%)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} unit="%" />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend formatter={(val) => val === 'A' ? labelA : labelB} />
                <Bar dataKey="A" fill={COLOR_A} radius={[4, 4, 0, 0]} name="A" />
                <Bar dataKey="B" fill={COLOR_B} radius={[4, 4, 0, 0]} name="B" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Radar chart ── */}
          <div style={s.card}>
            <h3 style={s.sectionTitle}>🕸️ Profil Keseluruhan</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#475569' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Radar name={labelA} dataKey="A" stroke={COLOR_A} fill={COLOR_A} fillOpacity={0.2} />
                <Radar name={labelB} dataKey="B" stroke={COLOR_B} fill={COLOR_B} fillOpacity={0.2} />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Combined Leaderboard ── */}
          <div style={s.card}>
            <h3 style={s.sectionTitle}>🏆 Papan Pendahulu Gabungan (Top 10)</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={lbTh}>Kedudukan</th>
                    <th style={lbTh}>Nama Pemain</th>
                    <th style={lbTh}>Kumpulan</th>
                    <th style={lbTh}>CP1</th>
                    <th style={lbTh}>CP2</th>
                    <th style={lbTh}>CP3</th>
                    <th style={lbTh}>Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedLeaderboard.map((p, i) => (
                    <tr key={`${p.id}-${i}`} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff', borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...lbTd, fontWeight: '800', fontSize: '1rem' }}>{MEDAL[i] || i + 1}</td>
                      <td style={{ ...lbTd, fontWeight: '700', color: '#1e3a5f' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ ...s.avatar, background: p.group === 'A' ? COLOR_A : COLOR_B }}>
                            {p.nickname?.[0]?.toUpperCase()}
                          </div>
                          {p.nickname}
                        </div>
                      </td>
                      <td style={lbTd}>
                        <span style={{
                          background: p.group === 'A' ? '#eff6ff' : '#fff1f2',
                          color: p.group === 'A' ? COLOR_A : COLOR_B,
                          padding: '0.2rem 0.6rem', borderRadius: '6px',
                          fontSize: '0.75rem', fontWeight: '700'
                        }}>
                          {p.group === 'A' ? '● A' : '● B'} {p.groupLabel}
                        </span>
                      </td>
                      <td style={lbTd}>{p.cp1_mark ?? 0}/33</td>
                      <td style={lbTd}>{p.cp2_mark ?? 0}/33</td>
                      <td style={lbTd}>{p.cp3_mark ?? 0}/33</td>
                      <td style={{ ...lbTd, fontWeight: '800', color: '#1e3a5f', fontSize: '1rem' }}>{p.total_mark ?? 0}</td>
                    </tr>
                  ))}
                  {mergedLeaderboard.length === 0 && (
                    <tr><td colSpan={7} style={{ ...lbTd, color: '#94a3b8', textAlign: 'center' }}>Tiada data pemain</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Side-by-side individual leaderboards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <SideLeaderboard label={labelA} stats={statsA} color={COLOR_A} side="A" />
            <SideLeaderboard label={labelB} stats={statsB} color={COLOR_B} side="B" />
          </div>
        </>
      )}
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const PanelHeader = ({ label, stats, color, side }) => (
  <div style={{ ...s.panel, borderTop: `4px solid ${color}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#1e3a5f' }}>
        {side} — {label}
      </h3>
    </div>
    {!stats ? (
      <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Tiada data</p>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        <MiniStat label="Pemain" value={stats.total} color={color} />
        <MiniStat label="Purata Markah" value={`${stats.avgScore}/100`} color={color} />
        <MiniStat label="CP1 ✅" value={`${stats.cp1Pct}%`} color={color} />
        <MiniStat label="CP2 ✅" value={`${stats.cp2Pct}%`} color={color} />
        <MiniStat label="CP3 ✅" value={`${stats.cp3Pct}%`} color={color} />
        <MiniStat label="Semua CP ✅" value={`${stats.allPct}%`} color={color} />
      </div>
    )}
  </div>
);

const MiniStat = ({ label, value, color }) => (
  <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.55rem 0.7rem' }}>
    <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: '600', marginBottom: '0.15rem' }}>{label}</div>
    <div style={{ fontSize: '1rem', fontWeight: '800', color }}>{value}</div>
  </div>
);

const SideLeaderboard = ({ label, stats, color, side }) => (
  <div style={{ ...s.card, margin: 0 }}>
    <h3 style={{ ...s.sectionTitle, color }}>
      🏅 {side} — {label}
    </h3>
    {!stats || stats.leaderboard.length === 0 ? (
      <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Tiada data pemain</p>
    ) : (
      <div>
        {stats.leaderboard.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '1rem', width: '1.5rem', textAlign: 'center' }}>{MEDAL[i] || i + 1}</span>
            <div style={{ ...s.avatar, background: color, width: 28, height: 28, fontSize: '0.8rem' }}>
              {p.nickname?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '700', color: '#1e3a5f', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.nickname}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                CP1:{p.cp1_mark} · CP2:{p.cp2_mark} · CP3:{p.cp3_mark}
              </div>
            </div>
            <div style={{ fontWeight: '800', color, fontSize: '1rem', flexShrink: 0 }}>
              {p.total_mark}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const lbTh = { padding: '0.65rem 0.75rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' };
const lbTd = { padding: '0.65rem 0.75rem', fontSize: '0.85rem', color: '#334155', verticalAlign: 'middle' };

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = {
  wrap:    { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  loading: { color: '#94a3b8', padding: '2rem', textAlign: 'center' },
  header:  { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' },
  title:   { fontSize: '1.2rem', fontWeight: '800', color: '#1e3a5f', margin: 0 },
  subtitle:{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.25rem' },
  card:    { background: '#fff', borderRadius: '14px', padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  sectionTitle: { fontSize: '0.95rem', fontWeight: '800', color: '#1e3a5f', margin: '0 0 1rem' },

  modeRow:    { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' },
  modeLabel:  { fontWeight: '700', color: '#1e3a5f', fontSize: '0.9rem' },
  modeToggle: { display: 'flex', gap: '0.5rem' },
  modeBtn:    { padding: '0.45rem 1rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', color: '#64748b', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.15s' },
  modeBtnActive: { background: '#1e3a5f', color: '#fff', borderColor: '#1e3a5f' },

  selectorRow:  { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center' },
  selectorGroup:{ display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  selectorLabel:{ fontSize: '0.82rem', fontWeight: '700' },
  select:       { padding: '0.55rem 0.9rem', border: '2px solid', borderRadius: '9px', fontSize: '0.9rem', outline: 'none', background: '#fff', cursor: 'pointer' },
  vsCircle:     { width: '44px', height: '44px', borderRadius: '50%', background: '#1e3a5f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.85rem', flexShrink: 0, margin: '0 auto', marginTop: '1.2rem' },

  panels:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  panel:      { background: '#fff', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },

  placeholder:{ background: '#fff', borderRadius: '14px', padding: '3rem 2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  empty:      { color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.75rem', textAlign: 'center' },
  avatar:     { width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#fff', fontSize: '0.9rem', flexShrink: 0 },
};

export default CompareAnalytics;
