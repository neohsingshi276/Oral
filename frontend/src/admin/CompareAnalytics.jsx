import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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

const escapeCell = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const downloadHtmlExcel = (filename, html) => {
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ─── One-side selector ───────────────────────────────────────────────────────
const SideSelector = ({ color, label: sideLabel, filter, onChange, isAdmin, sessionOptions, schoolOptions, classOptions, monthOptions, otherFilter }) => {
  const set = (key, val) => onChange({ ...filter, [key]: val });
  const otherSession = otherFilter?.type === 'session' ? otherFilter.session : null;

  // Derive a light tint of the color for the panel background
  const panelBg = color === '#2563eb' ? '#eff6ff' : '#fff1f2';
  const panelBorder = color === '#2563eb' ? '#bfdbfe' : '#fecdd3';

  return (
    <div style={{
      background: panelBg,
      border: `1.5px solid ${panelBorder}`,
      borderRadius: '14px',
      overflow: 'hidden',
    }}>
      {/* Panel header */}
      <div style={{
        background: color,
        padding: '0.65rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff', opacity: 0.85 }} />
        <span style={{ color: '#fff', fontWeight: '800', fontSize: '0.88rem', letterSpacing: '0.01em' }}>
          {sideLabel}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>

        {/* Mode toggle — admin only */}
        {isAdmin && (
          <div style={{ display: 'flex', background: '#fff', borderRadius: '9px', padding: '3px', gap: '3px', border: `1px solid ${panelBorder}` }}>
            {[
              { key: 'filters', icon: '🔽', label: 'Penapis' },
              { key: 'session', icon: '🎮', label: 'Sesi' },
            ].map(({ key, icon, label }) => (
              <button
                key={key}
                type="button"
                style={{
                  flex: 1,
                  padding: '0.38rem 0',
                  border: 'none',
                  borderRadius: '7px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: filter.type === key ? color : 'transparent',
                  color: filter.type === key ? '#fff' : '#64748b',
                }}
                onClick={() => onChange({ ...emptyFilter(), type: key })}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        )}

        {/* Session picker */}
        {filter.type === 'session' && (
          <div>
            <div style={s.subLabel}>🎮 Pilih Sesi</div>
            <select style={{ ...s.select, borderColor: panelBorder, background: '#fff' }} value={filter.session} onChange={e => set('session', e.target.value)}>
              <option value="">-- Pilih Sesi --</option>
              {sessionOptions.filter(o => o.id !== otherSession).map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Filter pickers */}
        {filter.type === 'filters' && (
          <>
            {/* School — full width (admin only) */}
            {isAdmin && (
              <div>
                <div style={s.subLabel}>🏫 Sekolah <span style={{ color: '#94a3b8', fontWeight: 400 }}>(pilihan)</span></div>
                <select
                  style={{ ...s.select, borderColor: panelBorder, background: '#fff' }}
                  value={filter.school}
                  onChange={e => onChange({ ...filter, school: e.target.value, class: '' })}
                >
                  <option value="">— Semua Sekolah —</option>
                  {schoolOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            )}

            {/* Class + Month — side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <div style={s.subLabel}>📚 Kelas</div>
                <select
                  style={{ ...s.select, borderColor: panelBorder, background: '#fff' }}
                  value={filter.class}
                  onChange={e => set('class', e.target.value)}
                >
                  <option value="">— Semua —</option>
                  {(isAdmin && filter.school
                    ? classOptions.filter(c => c.school_id === filter.school)
                    : classOptions
                  ).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <div style={s.subLabel}>🗓️ Bulan</div>
                <select
                  style={{ ...s.select, borderColor: panelBorder, background: '#fff' }}
                  value={filter.month}
                  onChange={e => set('month', e.target.value)}
                >
                  <option value="">— Semua —</option>
                  {monthOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const CompareAnalytics = () => {
  const { admin } = useAuth();
  const { t } = useLanguage();
  const isTeacher = admin?.role === 'teacher';
  const isAdmin = !isTeacher;

  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterA, setFilterA] = useState(emptyFilter());
  const [filterB, setFilterB] = useState(emptyFilter());
  const loggedViewRef = useRef(false);

  useEffect(() => {
    if (!loggedViewRef.current) {
      loggedViewRef.current = true;
      api.post('/activity/log', {
        action: 'Viewed comparison analytics',
        details: 'Opened the comparison analytics page'
      }).catch(() => { });
    }
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
    { name: t('admin.cp1Quiz'), A: statsA?.cp1Pct ?? 0, B: statsB?.cp1Pct ?? 0 },
    { name: t('admin.cp2Crossword'), A: statsA?.cp2Pct ?? 0, B: statsB?.cp2Pct ?? 0 },
    { name: t('admin.cp3FoodGame'), A: statsA?.cp3Pct ?? 0, B: statsB?.cp3Pct ?? 0 },
    { name: t('admin.allCompleted'), A: statsA?.allPct ?? 0, B: statsB?.allPct ?? 0 },
  ];

  const radarData = [
    { subject: 'CP1 %', A: statsA?.cp1Pct ?? 0, B: statsB?.cp1Pct ?? 0 },
    { subject: 'CP2 %', A: statsA?.cp2Pct ?? 0, B: statsB?.cp2Pct ?? 0 },
    { subject: 'CP3 %', A: statsA?.cp3Pct ?? 0, B: statsB?.cp3Pct ?? 0 },
    { subject: t('admin.avgScore'), A: statsA?.avgScore ?? 0, B: statsB?.avgScore ?? 0 },
    { subject: t('admin.allCp'), A: statsA?.allPct ?? 0, B: statsB?.allPct ?? 0 },
  ];

  const mergedLeaderboard = useMemo(() => {
    if (!statsA && !statsB) return [];
    const aPlayers = (statsA?.leaderboard || []).map(p => ({ ...p, group: 'A', groupLabel: labelA }));
    const bPlayers = (statsB?.leaderboard || []).map(p => ({ ...p, group: 'B', groupLabel: labelB }));
    return [...aPlayers, ...bPlayers]
      .sort((x, y) => y.total_mark - x.total_mark || x.nickname.localeCompare(y.nickname))
      .slice(0, 10);
  }, [statsA, statsB, labelA, labelB]);

  const downloadComparisonExcel = () => {
    const markedA = computeMarks(playersA).sort((x, y) => y.total_mark - x.total_mark || x.nickname.localeCompare(y.nickname));
    const markedB = computeMarks(playersB).sort((x, y) => y.total_mark - x.total_mark || x.nickname.localeCompare(y.nickname));
    const maxRows = Math.max(markedA.length, markedB.length);
    const summaryRows = [
      ['Total Players', statsA?.total ?? 0, statsB?.total ?? 0],
      ['Average Score /100', statsA?.avgScore ?? 0, statsB?.avgScore ?? 0],
      ['Average CP1 /33', statsA?.avgCp1Mark ?? 0, statsB?.avgCp1Mark ?? 0],
      ['Average CP2 /33', statsA?.avgCp2Mark ?? 0, statsB?.avgCp2Mark ?? 0],
      ['Average CP3 /33', statsA?.avgCp3Mark ?? 0, statsB?.avgCp3Mark ?? 0],
      ['CP1 Completed %', statsA?.cp1Pct ?? 0, statsB?.cp1Pct ?? 0],
      ['CP2 Completed %', statsA?.cp2Pct ?? 0, statsB?.cp2Pct ?? 0],
      ['CP3 Completed %', statsA?.cp3Pct ?? 0, statsB?.cp3Pct ?? 0],
      ['All CP Completed %', statsA?.allPct ?? 0, statsB?.allPct ?? 0],
    ];
    const bar = (value, color) => {
      const width = Math.max(0, Math.min(100, Number(value) || 0));
      return `<div style="width:160px;background:#e5e7eb;height:12px;border-radius:6px;overflow:hidden"><div style="width:${width}%;background:${color};height:12px"></div></div>`;
    };
    const html = `
      <html><head><meta charset="utf-8" />
      <style>
        body{font-family:Arial,sans-serif;color:#1f2937} h1,h2{color:#1e3a5f}
        table{border-collapse:collapse;margin-bottom:24px;width:100%}
        th{background:#1e3a5f;color:#fff;font-weight:700}
        th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px;vertical-align:top}
        .a{background:#eff6ff}.b{background:#fff1f2}.section{background:#f8fafc;font-weight:700;color:#1e3a5f}
      </style></head><body>
      <h1>DentalQuest Comparison Report</h1>
      <table>
        <tr><th></th><th class="a">A</th><th class="b">B</th></tr>
        <tr><td class="section">Comparison</td><td>${escapeCell(labelA)}</td><td>${escapeCell(labelB)}</td></tr>
        ${summaryRows.map(([metric, a, b]) => `<tr><td>${escapeCell(metric)}</td><td>${escapeCell(a)}</td><td>${escapeCell(b)}</td></tr>`).join('')}
      </table>
      <h2>Visual Summary</h2>
      <table>
        <tr><th>Metric</th><th class="a">A Value</th><th class="a">A Bar</th><th class="b">B Value</th><th class="b">B Bar</th></tr>
        ${[
        ['Average Score', statsA?.avgScore ?? 0, statsB?.avgScore ?? 0],
        ['CP1 Completed', statsA?.cp1Pct ?? 0, statsB?.cp1Pct ?? 0],
        ['CP2 Completed', statsA?.cp2Pct ?? 0, statsB?.cp2Pct ?? 0],
        ['CP3 Completed', statsA?.cp3Pct ?? 0, statsB?.cp3Pct ?? 0],
        ['All CP Completed', statsA?.allPct ?? 0, statsB?.allPct ?? 0],
      ].map(([metric, a, b]) => `<tr><td>${escapeCell(metric)}</td><td>${escapeCell(a)}</td><td>${bar(a, COLOR_A)}</td><td>${escapeCell(b)}</td><td>${bar(b, COLOR_B)}</td></tr>`).join('')}
      </table>
      <h2>Players Side by Side</h2>
      <table>
        <tr><th colspan="9" class="a">A: ${escapeCell(labelA)}</th><th colspan="9" class="b">B: ${escapeCell(labelB)}</th></tr>
        <tr>
          <th class="a">Rank</th><th class="a">Full Name</th><th class="a">Session</th><th class="a">School</th><th class="a">Class</th><th class="a">CP1</th><th class="a">CP2</th><th class="a">CP3</th><th class="a">Total</th>
          <th class="b">Rank</th><th class="b">Full Name</th><th class="b">Session</th><th class="b">School</th><th class="b">Class</th><th class="b">CP1</th><th class="b">CP2</th><th class="b">CP3</th><th class="b">Total</th>
        </tr>
        ${Array.from({ length: maxRows }, (_, index) => {
        const a = markedA[index] || {};
        const b = markedB[index] || {};
        return `<tr>
            <td>${a.id ? index + 1 : ''}</td><td>${escapeCell(a.nickname)}</td><td>${escapeCell(a.session_name)}</td><td>${escapeCell(a.school_name)}</td><td>${escapeCell(a.class_name)}</td><td>${escapeCell(a.cp1_mark)}</td><td>${escapeCell(a.cp2_mark)}</td><td>${escapeCell(a.cp3_mark)}</td><td>${escapeCell(a.total_mark)}</td>
            <td>${b.id ? index + 1 : ''}</td><td>${escapeCell(b.nickname)}</td><td>${escapeCell(b.session_name)}</td><td>${escapeCell(b.school_name)}</td><td>${escapeCell(b.class_name)}</td><td>${escapeCell(b.cp1_mark)}</td><td>${escapeCell(b.cp2_mark)}</td><td>${escapeCell(b.cp3_mark)}</td><td>${escapeCell(b.total_mark)}</td>
          </tr>`;
      }).join('')}
      </table>
      </body></html>
    `;
    downloadHtmlExcel('comparison_report.xls', html);
    api.post('/activity/log', {
      action: 'Downloaded comparison data',
      details: `Downloaded comparison Excel for A: ${labelA || 'none'} and B: ${labelB || 'none'}`
    }).catch(() => { });
  };

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
        {ready && (
          <button style={s.downloadBtn} onClick={downloadComparisonExcel}>
            📥 {t('admin.downloadComparisonExcel')}
          </button>
        )}
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
              A: {labelA || '—'} {filterReady(filterA) && <span style={{ color: '#64748b', fontWeight: 400 }}>({playersA.length} {t('admin.players')})</span>}
            </div>
            <div style={{ fontSize: '0.78rem', color: COLOR_B, fontWeight: '600' }}>
              B: {labelB || '—'} {filterReady(filterB) && <span style={{ color: '#64748b', fontWeight: 400 }}>({playersB.length} {t('admin.players')})</span>}
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
            {t('compare.legend')}
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
  downloadBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.65rem 1rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' },
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
