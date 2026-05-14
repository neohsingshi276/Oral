import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
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
      cp1_mark: Math.round(cp1Exact),
      cp2_mark: Math.round(cp2Exact),
      cp3_mark: Math.round(cp3Exact),
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
  const total = players.length;
  const cp1Done = players.filter(p => p.cp1_completed).length;
  const cp2Done = players.filter(p => p.cp2_completed).length;
  const cp3Done = players.filter(p => p.cp3_completed).length;
  const allDone = players.filter(p => p.cp1_completed && p.cp2_completed && p.cp3_completed).length;
  const avgScore = total > 0 ? Math.round(marked.reduce((s, p) => s + p.total_mark, 0) / total) : 0;
  const avgCp1Mark = total > 0 ? Math.round(marked.reduce((s, p) => s + p.cp1_mark, 0) / total) : 0;
  const avgCp2Mark = total > 0 ? Math.round(marked.reduce((s, p) => s + p.cp2_mark, 0) / total) : 0;
  const avgCp3Mark = total > 0 ? Math.round(marked.reduce((s, p) => s + p.cp3_mark, 0) / total) : 0;
  const avgAtt1 = parseFloat(avg(players, 'cp1_attempts'));
  const avgAtt2 = parseFloat(avg(players, 'cp2_attempts'));
  const avgAtt3 = parseFloat(avg(players, 'cp3_attempts'));
  const leaderboard = [...marked]
    .sort((a, b) => b.total_mark - a.total_mark || a.nickname.localeCompare(b.nickname))
    .slice(0, 8);
  return {
    total, cp1Done, cp2Done, cp3Done, allDone,
    cp1Pct: pct(cp1Done, total), cp2Pct: pct(cp2Done, total),
    cp3Pct: pct(cp3Done, total), allPct: pct(allDone, total),
    avgScore, avgCp1Mark, avgCp2Mark, avgCp3Mark,
    avgAtt1, avgAtt2, avgAtt3, leaderboard
  };
};

// ─── Colour palette ──────────────────────────────────────────────────────────
const COLOR_A = '#2563eb';
const COLOR_B = '#e11d48';
const MEDAL = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];

// ─── Month helpers ───────────────────────────────────────────────────────────
const toMonthKey = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (key) =>
  new Date(key + '-02').toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' });

// ─── Stat row ────────────────────────────────────────────────────────────────
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
  val: { padding: '0.6rem 0.75rem', fontSize: '0.88rem', fontWeight: '700', textAlign: 'center', borderRadius: '4px', transition: 'background 0.2s' },
};

// ─── Filter state shape ───────────────────────────────────────────────────────
// Each side has: { type, session, school, class, month }
// type: 'session' | 'filters'   (session = pick a session; filters = school/class/month combo)
const emptyFilter = () => ({ type: 'filters', session: '', school: '', class: '', month: '' });

// Apply a filter object to allPlayers
const applyFilter = (allPlayers, f) => {
  if (!f) return [];
  if (f.type === 'session') {
    if (!f.session) return [];
    return allPlayers.filter(p => String(p.session_id) === String(f.session));
  }
  // type === 'filters' — all fields optional, at least one must be set
  const anySet = f.school || f.class || f.month;
  if (!anySet) return [];
  return allPlayers.filter(p => {
    if (f.school && String(p.school_id) !== String(f.school)) return false;
    if (f.class && String(p.class_id) !== String(f.class)) return false;
    if (f.month && toMonthKey(p.joined_at) !== f.month) return false;
    return true;
  });
};

// Derive a human label from a filter
const buildLabel = (f, sessionOptions, schoolOptions, classOptions) => {
  if (!f) return '';
  if (f.type === 'session') {
    if (!f.session) return '';
    return sessionOptions.find(o => o.id === f.session)?.name || `Sesi ${f.session}`;
  }
  const parts = [];
  if (f.school) parts.push(schoolOptions.find(o => o.id === f.school)?.name || `Sekolah ${f.school}`);
  if (f.class) parts.push(classOptions.find(o => o.id === f.class)?.name || `Kelas ${f.class}`);
  if (f.month) parts.push(monthLabel(f.month));
  return parts.join(' — ') || '';
};

// Is a filter "ready" (has enough info to produce results)?
const filterReady = (f) => {
  if (!f) return false;
  if (f.type === 'session') return !!f.session;
  return !!(f.school || f.class || f.month);
};

// ─── One-side selector ───────────────────────────────────────────────────────
const SideSelector = ({ color, label: sideLabel, filter, onChange, isAdmin, sessionOptions, schoolOptions, classOptions, monthOptions, otherFilter }) => {
  const set = (key, val) => onChange({ ...filter, [key]: val });

  // For session mode, exclude what the other side already picked
  const otherSession = otherFilter?.type === 'session' ? otherFilter.session : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <label style={{ fontSize: '0.82rem', fontWeight: '700', color }}>{sideLabel}</label>

      {/* Type toggle */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button
            type="button"
            style={{ ...s.typeBtn, ...(filter.type === 'filters' ? { background: color, color: '#fff', borderColor: color } : {}) }}
            onClick={() => onChange({ ...emptyFilter(), type: 'filters' })}
          >
            🔽 Penapis
          </button>
          <button
            type="button"
            style={{ ...s.typeBtn, ...(filter.type === 'session' ? { background: color, color: '#fff', borderColor: color } : {}) }}
            onClick={() => onChange({ ...emptyFilter(), type: 'session' })}
          >
            🎮 Sesi
          </button>
        </div>
      )}

      {/* Session picker */}
      {filter.type === 'session' && (
        <select style={{ ...s.select, borderColor: color }} value={filter.session} onChange={e => set('session', e.target.value)}>
          <option value="">-- Pilih Sesi --</option>
          {sessionOptions.filter(o => o.id !== otherSession).map(o => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      )}

      {/* Filter pickers */}
      {filter.type === 'filters' && (
        <>
          {isAdmin && (
            <div>
              <div style={s.subLabel}>🏫 Sekolah <span style={{ color: '#94a3b8', fontWeight: 400 }}>(pilihan)</span></div>
              <select style={{ ...s.select, borderColor: color }} value={filter.school}
                onChange={e => onChange({ ...filter, school: e.target.value, class: '' })}>
                <option value="">-- Semua Sekolah --</option>
                {schoolOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <div style={s.subLabel}>📚 Kelas <span style={{ color: '#94a3b8', fontWeight: 400 }}>(pilihan)</span></div>
            <select style={{ ...s.select, borderColor: color }} value={filter.class} onChange={e => set('class', e.target.value)}>
              <option value="">-- Semua Kelas --</option>
              {(isAdmin && filter.school
                ? classOptions.filter(c => c.school_id === filter.school)
                : classOptions
              ).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>

          <div>
            <div style={s.subLabel}>🗓️ Bulan <span style={{ color: '#94a3b8', fontWeight: 400 }}>(pilihan)</span></div>
            <select style={{ ...s.select, borderColor: color }} value={filter.month} onChange={e => set('month', e.target.value)}>
              <option value="">-- Semua Bulan --</option>
              {monthOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const CompareAnalytics = () => {
  const { admin } = useAuth();
  const isTeacher = admin?.role === 'teacher';
  const isAdmin = !isTeacher;

  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterA, setFilterA] = useState(emptyFilter());
  const [filterB, setFilterB] = useState(emptyFilter());

  useEffect(() => {
    api.get('/admin/analytics')
      .then(res => setAllPlayers(res.data.players || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Derived option lists ─────────────────────────────────────────────────────
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

  const schoolOptions = useMemo(() => {
    const map = {};
    allPlayers.forEach(p => {
      if (p.school_id && !map[p.school_id]) map[p.school_id] = p.school_name || `Sekolah ${p.school_id}`;
    });
    return Object.entries(map).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allPlayers]);

  const classOptions = useMemo(() => {
    const map = {};
    allPlayers.forEach(p => {
      if (p.class_id && !map[p.class_id]) {
        map[p.class_id] = { name: p.class_name || `Kelas ${p.class_id}`, school_id: String(p.school_id) };
      }
    });
    return Object.entries(map)
      .map(([id, v]) => ({ id, name: v.name, school_id: v.school_id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allPlayers]);

  // ── Filtered players & stats ──────────────────────────────────────────────────
  const playersA = useMemo(() => applyFilter(allPlayers, filterA), [allPlayers, filterA]);
  const playersB = useMemo(() => applyFilter(allPlayers, filterB), [allPlayers, filterB]);
  const statsA = useMemo(() => buildStats(playersA), [playersA]);
  const statsB = useMemo(() => buildStats(playersB), [playersB]);

  const labelA = useMemo(() => buildLabel(filterA, sessionOptions, schoolOptions, classOptions), [filterA, sessionOptions, schoolOptions, classOptions]);
  const labelB = useMemo(() => buildLabel(filterB, sessionOptions, schoolOptions, classOptions), [filterB, sessionOptions, schoolOptions, classOptions]);

  const ready = filterReady(filterA) && filterReady(filterB);

  // ── Chart data ───────────────────────────────────────────────────────────────
  const barData = [
    { name: 'CP1 Kuiz', A: statsA?.cp1Pct ?? 0, B: statsB?.cp1Pct ?? 0 },
    { name: 'CP2 Silang Kata', A: statsA?.cp2Pct ?? 0, B: statsB?.cp2Pct ?? 0 },
    { name: 'CP3 Permainan', A: statsA?.cp3Pct ?? 0, B: statsB?.cp3Pct ?? 0 },
    { name: 'Semua Selesai', A: statsA?.allPct ?? 0, B: statsB?.allPct ?? 0 },
  ];

  const radarData = [
    { subject: 'CP1 %', A: statsA?.cp1Pct ?? 0, B: statsB?.cp1Pct ?? 0 },
    { subject: 'CP2 %', A: statsA?.cp2Pct ?? 0, B: statsB?.cp2Pct ?? 0 },
    { subject: 'CP3 %', A: statsA?.cp3Pct ?? 0, B: statsB?.cp3Pct ?? 0 },
    { subject: 'Avg Markah', A: statsA?.avgScore ?? 0, B: statsB?.avgScore ?? 0 },
    { subject: 'Semua CP', A: statsA?.allPct ?? 0, B: statsB?.allPct ?? 0 },
  ];

  const mergedLeaderboard = useMemo(() => {
    if (!statsA && !statsB) return [];
    const aPlayers = (statsA?.leaderboard || []).map(p => ({ ...p, group: 'A', groupLabel: labelA }));
    const bPlayers = (statsB?.leaderboard || []).map(p => ({ ...p, group: 'B', groupLabel: labelB }));
    return [...aPlayers, ...bPlayers]
      .sort((x, y) => y.total_mark - x.total_mark || x.nickname.localeCompare(y.nickname))
      .slice(0, 10);
  }, [statsA, statsB, labelA, labelB]);

  if (loading) return <div style={s.loading}>Memuatkan data perbandingan… 📊</div>;

  return (
    <div style={s.wrap}>

      {/* ── Header ── */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}>🔀 Perbandingan Analitik</h2>
          <p style={s.subtitle}>
            {isTeacher
              ? 'Pilih kelas dan/atau bulan untuk setiap sisi bagi membandingkan prestasi.'
              : 'Pilih kombinasi sekolah, kelas, bulan atau sesi untuk setiap sisi.'}
          </p>
        </div>
      </div>

      {/* ── Selectors ── */}
      <div style={s.card}>
        <div style={s.selectorRow}>
          <SideSelector
            color={COLOR_A}
            sideLabel="● Pilihan A"
            filter={filterA}
            onChange={setFilterA}
            isAdmin={isAdmin}
            sessionOptions={sessionOptions}
            schoolOptions={schoolOptions}
            classOptions={classOptions}
            monthOptions={monthOptions}
            otherFilter={filterB}
          />

          <div style={s.vsCircle}>VS</div>

          <SideSelector
            color={COLOR_B}
            sideLabel="● Pilihan B"
            filter={filterB}
            onChange={setFilterB}
            isAdmin={isAdmin}
            sessionOptions={sessionOptions}
            schoolOptions={schoolOptions}
            classOptions={classOptions}
            monthOptions={monthOptions}
            otherFilter={filterA}
          />
        </div>

        {/* Live preview of what each side resolves to */}
        {(filterReady(filterA) || filterReady(filterB)) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.78rem', color: COLOR_A, fontWeight: '600' }}>
              A: {labelA || '—'} {filterReady(filterA) && <span style={{ color: '#64748b', fontWeight: 400 }}>({playersA.length} pemain)</span>}
            </div>
            <div style={{ fontSize: '0.78rem', color: COLOR_B, fontWeight: '600' }}>
              B: {labelB || '—'} {filterReady(filterB) && <span style={{ color: '#64748b', fontWeight: 400 }}>({playersB.length} pemain)</span>}
            </div>
          </div>
        )}
      </div>

      {/* ── Placeholder when not ready ── */}
      {!ready && (
        <div style={s.placeholder}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
          <p style={{ color: '#475569', fontWeight: '700', fontSize: '1rem' }}>
            Tetapkan sekurang-kurangnya satu penapis untuk setiap sisi bagi mula membandingkan
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
                  <StatRow label="Jumlah Pemain" a={statsA?.total ?? 0} b={statsB?.total ?? 0} />
                  <StatRow label="Purata Markah (/100)" a={statsA?.avgScore ?? 0} b={statsB?.avgScore ?? 0} />
                  <StatRow label="Purata Markah CP1 (/33)" a={statsA?.avgCp1Mark ?? 0} b={statsB?.avgCp1Mark ?? 0} />
                  <StatRow label="Purata Markah CP2 (/33)" a={statsA?.avgCp2Mark ?? 0} b={statsB?.avgCp2Mark ?? 0} />
                  <StatRow label="Purata Markah CP3 (/33)" a={statsA?.avgCp3Mark ?? 0} b={statsB?.avgCp3Mark ?? 0} />
                  <StatRow label="CP1 Selesai (%)" a={statsA?.cp1Pct ?? 0} b={statsB?.cp1Pct ?? 0} unit="%" />
                  <StatRow label="CP2 Selesai (%)" a={statsA?.cp2Pct ?? 0} b={statsB?.cp2Pct ?? 0} unit="%" />
                  <StatRow label="CP3 Selesai (%)" a={statsA?.cp3Pct ?? 0} b={statsB?.cp3Pct ?? 0} unit="%" />
                  <StatRow label="Semua CP Selesai (%)" a={statsA?.allPct ?? 0} b={statsB?.allPct ?? 0} unit="%" />
                  <StatRow label="Purata Percubaan CP1" a={statsA?.avgAtt1 ?? 0} b={statsB?.avgAtt1 ?? 0} higher="low" />
                  <StatRow label="Purata Percubaan CP2" a={statsA?.avgAtt2 ?? 0} b={statsB?.avgAtt2 ?? 0} higher="low" />
                  <StatRow label="Purata Percubaan CP3" a={statsA?.avgAtt3 ?? 0} b={statsB?.avgAtt3 ?? 0} higher="low" />
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
    <h3 style={{ ...s.sectionTitle, color }}>🏅 {side} — {label}</h3>
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
  wrap: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  loading: { color: '#94a3b8', padding: '2rem', textAlign: 'center' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' },
  title: { fontSize: '1.2rem', fontWeight: '800', color: '#1e3a5f', margin: 0 },
  subtitle: { color: '#64748b', fontSize: '0.88rem', marginTop: '0.25rem' },
  card: { background: '#fff', borderRadius: '14px', padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  sectionTitle: { fontSize: '0.95rem', fontWeight: '800', color: '#1e3a5f', margin: '0 0 1rem' },

  selectorRow: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'flex-start' },
  subLabel: { fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.2rem' },
  select: { padding: '0.55rem 0.9rem', border: '2px solid', borderRadius: '9px', fontSize: '0.9rem', outline: 'none', background: '#fff', cursor: 'pointer', width: '100%' },
  vsCircle: { width: '44px', height: '44px', borderRadius: '50%', background: '#1e3a5f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.85rem', flexShrink: 0, margin: '0 auto', marginTop: '1.6rem' },

  typeBtn: { padding: '0.35rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', color: '#64748b', fontWeight: '600', cursor: 'pointer', fontSize: '0.78rem' },

  panels: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  panel: { background: '#fff', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },

  placeholder: { background: '#fff', borderRadius: '14px', padding: '3rem 2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  empty: { color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.75rem', textAlign: 'center' },
  avatar: { width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#fff', fontSize: '0.9rem', flexShrink: 0 },
};

export default CompareAnalytics;