import { useState, useEffect } from 'react';
import api from '../services/api';

const ManageCrossword = () => {
  const [words, setWords] = useState([]);
  const [form, setForm] = useState({ word: '', clue: '' });
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');

  const fetchWords = () => api.get('/crossword/admin').then(res => setWords(res.data.words));
  useEffect(() => { fetchWords(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.word.trim() || !form.clue.trim()) return;
    try {
      if (editing) {
        await api.put(`/crossword/admin/${editing}`, { word: form.word.toUpperCase(), clue: form.clue });
        setMsg('✅ Word updated!');
      } else {
        await api.post('/crossword/admin', { word: form.word.toUpperCase(), clue: form.clue });
        setMsg('✅ Word added!');
      }
      setForm({ word: '', clue: '' });
      setEditing(null);
      fetchWords();
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Failed')); }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleEdit = (w) => {
    setEditing(w.id);
    setForm({ word: w.word, clue: w.clue });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this word?')) return;
    await api.delete(`/crossword/admin/${id}`);
    fetchWords();
  };

  return (
    <div>
      {/* Info banner */}
      <div style={s.infoBanner}>
        <span style={{ fontSize: '1.2rem' }}>🧩</span>
        <div>
          <strong>Auto Layout</strong> — The crossword grid is generated automatically! Just add words and clues.
          The system picks 8 random words per game and arranges them by finding intersecting letters.
        </div>
      </div>

      <div style={s.twoCol}>
        {/* Add/Edit Form */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>{editing ? '✏️ Edit Word' : '➕ Add Word'}</h2>
          {msg && <div style={msg.includes('✅') ? s.success : s.error}>{msg}</div>}
          <form onSubmit={handleSubmit}>
            <div style={s.field}>
              <label style={s.label}>Perkataan (Word)</label>
              <input
                style={s.input}
                value={form.word}
                onChange={e => setForm({ ...form, word: e.target.value.toUpperCase() })}
                required
                placeholder="e.g. GIGI"
                maxLength={15}
              />
              <p style={s.hint}>Max 15 letters. Current: {form.word.length} letters</p>
            </div>
            <div style={s.field}>
              <label style={s.label}>Pembayang (Clue)</label>
              <textarea
                style={{ ...s.input, height: '80px', resize: 'vertical' }}
                value={form.clue}
                onChange={e => setForm({ ...form, clue: e.target.value })}
                required
                placeholder="e.g. Organ keras dalam mulut untuk mengunyah"
                maxLength={200}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button style={s.btnPrimary} type="submit">{editing ? 'Update Word' : 'Add Word'}</button>
              {editing && (
                <button style={s.btnSecondary} type="button" onClick={() => { setEditing(null); setForm({ word: '', clue: '' }); }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Stats panel */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>📊 Word Bank Stats</h2>
          <div style={s.statsGrid}>
            <div style={s.statCard}>
              <div style={s.statValue}>{words.length}</div>
              <div style={s.statLabel}>Total Words</div>
            </div>
            <div style={s.statCard}>
              <div style={{ ...s.statValue, color: words.length >= 8 ? '#16a34a' : '#e11d48' }}>{words.length >= 8 ? '✅' : '❌'}</div>
              <div style={s.statLabel}>{words.length >= 8 ? 'Ready to play!' : `Need ${8 - words.length} more`}</div>
            </div>
          </div>
          <div style={s.infoBox}>
            <p style={s.infoText}><strong>How it works:</strong></p>
            <ul style={s.infoList}>
              <li>Each game picks <strong>8 random words</strong> from the word bank</li>
              <li>The system <strong>auto-arranges</strong> them into a crossword grid</li>
              <li>Players need <strong>80%</strong> correct to pass</li>
              <li>More words = more variety for each game!</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Words table */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>📋 Word Bank ({words.length} words)</h2>
        <table style={s.table}>
          <thead><tr style={s.thead}>
            <th style={s.th}>#</th>
            <th style={s.th}>Word</th>
            <th style={s.th}>Clue</th>
            <th style={s.th}>Letters</th>
            <th style={s.th}>Actions</th>
          </tr></thead>
          <tbody>
            {words.map((w, i) => (
              <tr key={w.id} style={i % 2 === 0 ? s.trEven : {}}>
                <td style={s.td}><div style={{ ...s.wordDot, background: COLORS[i % COLORS.length] }}>{i + 1}</div></td>
                <td style={s.td}><strong style={{ color: COLORS[i % COLORS.length], letterSpacing: '0.05em' }}>{w.word}</strong></td>
                <td style={s.td}>{w.clue}</td>
                <td style={s.td}><span style={s.letterBadge}>{w.word.length}</span></td>
                <td style={s.td}>
                  <button style={s.btnEdit} onClick={() => handleEdit(w)}>✏️</button>
                  <button style={s.btnDelete} onClick={() => handleDelete(w.id)}>🗑️</button>
                </td>
              </tr>
            ))}
            {words.length === 0 && <tr><td colSpan="5" style={{ ...s.td, textAlign: 'center', color: '#94a3b8' }}>No words yet. Add your first word above!</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const COLORS = ['#2563eb', '#16a34a', '#e11d48', '#f59e0b', '#9333ea', '#0d9488', '#ea580c', '#db2777', '#0284c7', '#65a30d'];

const s = {
  infoBanner: { display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.88rem', color: '#1e40af', lineHeight: 1.5 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' },
  card: { background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: '1.1rem', fontWeight: '700', color: '#1e3a5f', margin: '0 0 1.25rem' },
  field: { marginBottom: '1rem' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' },
  input: { width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', color: '#1e293b' },
  hint: { color: '#94a3b8', fontSize: '0.75rem', margin: '0.25rem 0 0' },
  btnPrimary: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.65rem 1.5rem', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' },
  btnSecondary: { background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', padding: '0.65rem 1.5rem', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' },
  success: { background: '#f0fdf4', color: '#16a34a', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  error: { background: '#fff1f2', color: '#e11d48', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' },
  statCard: { background: '#f8fafc', borderRadius: '12px', padding: '1.25rem', textAlign: 'center', border: '1px solid #e2e8f0' },
  statValue: { fontSize: '2rem', fontWeight: '800', color: '#2563eb' },
  statLabel: { color: '#64748b', fontSize: '0.82rem', marginTop: '0.25rem' },
  infoBox: { background: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0' },
  infoText: { color: '#475569', fontSize: '0.85rem', margin: '0 0 0.5rem' },
  infoList: { color: '#64748b', fontSize: '0.82rem', margin: 0, paddingLeft: '1.25rem', lineHeight: 1.8 },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f8fafc' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: '600', color: '#64748b', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '0.75rem 1rem', fontSize: '0.88rem', color: '#334155', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  trEven: { background: '#fafafa' },
  wordDot: { width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '0.75rem' },
  letterBadge: { background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600' },
  btnEdit: { background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', padding: '0.35rem 0.6rem', cursor: 'pointer', fontSize: '0.82rem', marginRight: '0.4rem' },
  btnDelete: { background: '#fff1f2', color: '#e11d48', border: 'none', borderRadius: '6px', padding: '0.35rem 0.6rem', cursor: 'pointer', fontSize: '0.82rem' },
};

export default ManageCrossword;
