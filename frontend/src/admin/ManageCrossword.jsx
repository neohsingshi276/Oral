import { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const ManageCrossword = () => {
  const { t } = useLanguage();
  const [words, setWords] = useState([]);
  const emptyForm = { word: '', clue: '', clue_translation: '', clue_bi: '', source_language: 'bm', manual_translation: false };
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');

  const fetchWords = () => api.get('/crossword/admin').then(res => setWords(res.data.words));
  useEffect(() => { fetchWords(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.word.trim() || !form.clue.trim()) return;
    try {
      if (editing) {
        await api.put(`/crossword/admin/${editing}`, { word: form.word.toUpperCase(), clue: form.clue, source_language: form.source_language, ...(form.manual_translation && form.clue_translation.trim() && { clue_translation: form.clue_translation.trim() }) });
        setMsg('✅ Perkataan dikemaskini!');
      } else {
        await api.post('/crossword/admin', { word: form.word.toUpperCase(), clue: form.clue, source_language: form.source_language, ...(form.manual_translation && form.clue_translation.trim() && { clue_translation: form.clue_translation.trim() }) });
        setMsg('✅ Perkataan ditambah!');
      }
      setForm(emptyForm);
      setEditing(null);
      fetchWords();
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Gagal')); }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleEdit = (w) => {
    setEditing(w.id);
    setForm({ ...emptyForm, word: w.word, clue: w.clue, clue_translation: w.clue_bi || '', clue_bi: w.clue_bi || '', manual_translation: Boolean(w.clue_bi) });
  };

  const handleDelete = async (id) => {
    if (!confirm('Padam perkataan ini?')) return;
    await api.delete(`/crossword/admin/${id}`);
    fetchWords();
  };

  return (
    <div>
      {/* Info banner */}
      <div style={s.infoBanner}>
        <span style={{ fontSize: '1.2rem' }}>🧩</span>
        <div>
          <strong>Susun Atur Automatik</strong> — Grid teka silang kata dijana secara automatik! Hanya tambah perkataan dan pembayang.
          Sistem memilih 8 perkataan rawak setiap permainan dan menyusunnya dengan mencari huruf yang bersilang.
        </div>
      </div>

      <div style={s.twoCol}>
        {/* Add/Edit Form */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>{editing ? '✏️ Sunting Perkataan' : '➕ Tambah Perkataan'}</h2>
          {msg && <div style={msg.includes('✅') ? s.success : s.error}>{msg}</div>}
          <form onSubmit={handleSubmit}>
            <div style={s.field}>
              <label style={s.label}>Perkataan</label>
              <input
                style={s.input}
                value={form.word}
                onChange={e => setForm({ ...form, word: e.target.value.toUpperCase() })}
                required
                placeholder={t('admin.wordExample')}
                maxLength={15}
              />
              <p style={s.hint}>Maksimum 15 huruf. Sekarang: {form.word.length} huruf</p>
            </div>
            <div style={s.field}>
              <div style={s.translationPanel}>
                <div style={s.translationHeader}>
                  <div>
                    <label style={s.label}>Bahasa pembayang</label>
                    <div style={s.segmented}>
                      <button type="button" style={{ ...s.segmentBtn, ...(form.source_language === 'bm' ? s.segmentActive : {}) }} onClick={() => setForm({ ...form, source_language: 'bm', clue: '', clue_translation: '' })}>BM</button>
                      <button type="button" style={{ ...s.segmentBtn, ...(form.source_language === 'bi' ? s.segmentActive : {}) }} onClick={() => setForm({ ...form, source_language: 'bi', clue: '', clue_translation: '' })}>English</button>
                    </div>
                  </div>
                  <label style={s.checkLabel}>
                    <input type="checkbox" checked={form.manual_translation} onChange={e => setForm({ ...form, manual_translation: e.target.checked })} />
                    Saya mahu terjemah sendiri
                  </label>
                </div>
                <p style={s.translationHint}>{form.source_language === 'bm' ? 'Masukkan pembayang BM. English akan auto jika manual tidak ditanda.' : 'Enter the English clue. BM akan auto jika manual tidak ditanda.'}</p>
              </div>
              <label style={s.label}>{form.source_language === 'bm' ? 'Pembayang (BM)' : 'Clue (English)'}</label>
              <textarea
                style={{ ...s.input, height: '80px', resize: 'vertical' }}
                value={form.clue}
                onChange={e => setForm({ ...form, clue: e.target.value })}
                required
                placeholder={form.source_language === 'bm' ? t('admin.clueExample') : 'Example: Helps clean teeth'}
                maxLength={200}
              />
            </div>
            {form.manual_translation && (
              <div style={s.manualBox}>
                <label style={s.manualLabel}>{form.source_language === 'bm' ? 'English clue' : 'Pembayang BM'}</label>
                <textarea
                  style={{ ...s.input, height: '70px', resize: 'vertical', borderColor: '#93c5fd' }}
                  value={form.clue_translation}
                  onChange={e => setForm({ ...form, clue_translation: e.target.value })}
                  maxLength={200}
                  placeholder={form.source_language === 'bm' ? 'Write English clue here' : 'Tulis pembayang BM di sini'}
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button style={s.btnPrimary} type="submit">{editing ? 'Kemaskini' : 'Tambah'}</button>
              {false && editing && (
                <>
                  <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '0.75rem', border: '1px solid #bfdbfe', marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#2563eb', marginBottom: '0.4rem' }}>
                      🇬🇧 Clue (BI) — <span style={{ fontWeight: 400 }}>kosongkan untuk terjemahan automatik</span>
                    </label>
                    <textarea
                      style={{ ...s.input, height: '70px', resize: 'vertical', borderColor: '#bfdbfe' }}
                      value={form.clue_bi}
                      onChange={e => setForm({ ...form, clue_bi: e.target.value })}
                      maxLength={200}
                      placeholder="Auto-translated if left empty"
                    />
                  </div>
                  <button style={s.btnSecondary} type="button" onClick={() => { setEditing(null); setForm(emptyForm); }}>
                    Batal
                  </button>
                </>
              )}
              {editing && <button style={s.btnSecondary} type="button" onClick={() => { setEditing(null); setForm(emptyForm); }}>Batal</button>}
            </div>
          </form>
        </div>

        {/* Stats panel */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>📊 Statistik Bank Perkataan</h2>
          <div style={s.statsGrid}>
            <div style={s.statCard}>
              <div style={s.statValue}>{words.length}</div>
              <div style={s.statLabel}>Jumlah Perkataan</div>
            </div>
            <div style={s.statCard}>
              <div style={{ ...s.statValue, color: words.length >= 8 ? '#16a34a' : '#e11d48' }}>{words.length >= 8 ? '✅' : '❌'}</div>
              <div style={s.statLabel}>{words.length >= 8 ? 'Sedia untuk dimain!' : `Perlu ${8 - words.length} lagi`}</div>
            </div>
          </div>
          <div style={s.infoBox}>
            <p style={s.infoText}><strong>Cara ia berfungsi:</strong></p>
            <ul style={s.infoList}>
              <li>Setiap permainan memilih <strong>8 perkataan rawak</strong> daripada bank perkataan</li>
              <li>Sistem <strong>menyusun secara automatik</strong> ke dalam grid teka silang kata</li>
              <li>Pemain perlu <strong>80%</strong> betul untuk lulus</li>
              <li>Lebih banyak perkataan = lebih pelbagai untuk setiap permainan!</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Words table */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>📋 Bank Perkataan ({words.length} perkataan)</h2>
        <table style={s.table}>
          <thead><tr style={s.thead}>
            <th style={s.th}>#</th>
            <th style={s.th}>Perkataan</th>
            <th style={s.th}>Pembayang</th>
            <th style={s.th}>Huruf</th>
            <th style={s.th}>Tindakan</th>
          </tr></thead>
          <tbody>
            {words.map((w, i) => (
              <tr key={w.id} style={i % 2 === 0 ? s.trEven : {}}>
                <td style={s.td}><div style={{ ...s.wordDot, background: COLORS[i % COLORS.length] }}>{i + 1}</div></td>
                <td style={s.td} data-no-translate="true"><strong style={{ color: COLORS[i % COLORS.length], letterSpacing: '0.05em' }}>{w.word}</strong></td>
                <td style={s.td} data-no-translate="true">
                  {w.clue}
                  {w.clue_bi
                    ? <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '4px', padding: '0.1rem 0.35rem' }}>🇬🇧 ✓</span>
                    : <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '4px', padding: '0.1rem 0.35rem' }}>BI ✗</span>}
                </td>
                <td style={s.td}><span style={s.letterBadge}>{w.word.length}</span></td>
                <td style={s.td}>
                  <button style={s.btnEdit} onClick={() => handleEdit(w)}>✏️</button>
                  <button style={s.btnDelete} onClick={() => handleDelete(w.id)}>🗑️</button>
                </td>
              </tr>
            ))}
            {words.length === 0 && <tr><td colSpan="5" style={{ ...s.td, textAlign: 'center', color: '#94a3b8' }}>Belum ada perkataan. Tambah perkataan pertama anda di atas!</td></tr>}
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
  translationPanel: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' },
  translationHeader: { display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' },
  compactSelect: { minWidth: '180px', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', color: '#1e293b', fontSize: '0.9rem' },
  segmented: { display: 'inline-flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', background: '#fff' },
  segmentBtn: { padding: '0.5rem 0.9rem', border: 'none', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: '700' },
  segmentActive: { background: '#2563eb', color: '#fff' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#1e3a5f', fontSize: '0.86rem', fontWeight: '700', cursor: 'pointer' },
  translationHint: { margin: '0.55rem 0 0', color: '#64748b', fontSize: '0.78rem' },
  manualBox: { marginBottom: '1rem', background: '#eff6ff', borderRadius: '8px', padding: '0.75rem', border: '1px solid #bfdbfe' },
  manualLabel: { display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#2563eb', marginBottom: '0.4rem' },
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
