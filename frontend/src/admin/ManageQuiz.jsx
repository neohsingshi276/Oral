import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const TYPES = [
  { value: 'multiple_choice', label: '🔵 Pilihan Berganda' },
  { value: 'true_false', label: '✅ Betul / Salah' },
  { value: 'multi_select', label: '☑️ Pelbagai Pilihan' },
  { value: 'match', label: '🔗 Padanan' },
];

const emptyForm = { question: '', question_type: 'multiple_choice', options: ['', '', '', ''], correct_answer: [], match_pairs: [{ left: '', right: '' }, { left: '', right: '' }], timer_seconds: 15 };

const ManageQuiz = () => {
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [tab, setTab] = useState('questions');
  const [sessions, setSessions] = useState([]);
  const [selSession, setSelSession] = useState('');
  const [qSettings, setQSettings] = useState({ timer_seconds: 15, question_order: 'shuffle', question_count: 10 });
  const fileRef = useRef();

  const fetchQuestions = () => api.get('/quiz/admin/questions').then(res => setQuestions(res.data.questions));
  const fetchSessions = () => api.get('/sessions').then(res => setSessions(res.data.sessions));

  useEffect(() => { fetchQuestions(); fetchSessions(); }, []);

  useEffect(() => {
    if (selSession) {
      api.get(`/quiz/admin/settings/${selSession}`)
        .then(res => setQSettings(res.data.settings))
        .catch(() => { });
    }
  }, [selSession]);

  const handleImageChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImageFile(f);
    // Revoke the previous object URL to avoid memory leaks
    setImagePreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  };

  const handleOptionChange = (idx, val) => {
    const opts = [...form.options];
    opts[idx] = val;
    setForm({ ...form, options: opts });
  };

  const addOption = () => {
    if (form.options.length >= 6) return;
    setForm({ ...form, options: [...form.options, ''] });
  };

  const removeOption = (idx) => {
    if (form.options.length <= 2) return;
    const opts = form.options.filter((_, i) => i !== idx);
    const ca = form.correct_answer.filter(i => i !== idx).map(i => i > idx ? i - 1 : i);
    setForm({ ...form, options: opts, correct_answer: ca });
  };

  const toggleCorrect = (idx) => {
    const type = form.question_type;
    if (type === 'multiple_choice' || type === 'true_false') {
      setForm({ ...form, correct_answer: [idx] });
    } else {
      const ca = form.correct_answer.includes(idx)
        ? form.correct_answer.filter(i => i !== idx)
        : [...form.correct_answer, idx];
      setForm({ ...form, correct_answer: ca });
    }
  };

  const handleMatchChange = (idx, side, val) => {
    const pairs = [...form.match_pairs];
    pairs[idx] = { ...pairs[idx], [side]: val };
    setForm({ ...form, match_pairs: pairs });
  };

  const addMatchPair = () => setForm({ ...form, match_pairs: [...form.match_pairs, { left: '', right: '' }] });
  const removeMatchPair = (idx) => { if (form.match_pairs.length <= 2) return; setForm({ ...form, match_pairs: form.match_pairs.filter((_, i) => i !== idx) }); };

  const handleTypeChange = (type) => {
    if (type === 'true_false') setForm({ ...form, question_type: type, options: ['Tidak Betul', 'Betul'], correct_answer: [] });
    else if (type === 'match') setForm({ ...form, question_type: type, options: [], correct_answer: [], match_pairs: [{ left: '', right: '' }, { left: '', right: '' }] });
    else setForm({ ...form, question_type: type, options: ['', '', '', ''], correct_answer: [] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.correct_answer.length === 0 && form.question_type !== 'match') { setMsg('❌ Sila pilih jawapan yang betul!'); setTimeout(() => setMsg(''), 3000); return; }
    try {
      const fd = new FormData();
      fd.append('question', form.question);
      fd.append('question_type', form.question_type);
      fd.append('timer_seconds', form.timer_seconds);
      if (form.question_type === 'match') {
        fd.append('options', JSON.stringify(form.match_pairs));
        const ca = form.match_pairs.map((_, i) => [i, i]);
        fd.append('correct_answer', JSON.stringify(ca));
      } else {
        fd.append('options', JSON.stringify(form.options.filter(o => o.trim())));
        fd.append('correct_answer', JSON.stringify(form.correct_answer));
      }
      if (imageFile) fd.append('image', imageFile);

      if (editing) { await api.put(`/quiz/admin/questions/${editing}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); setMsg('✅ Soalan dikemaskini!'); }
      else { await api.post('/quiz/admin/questions', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); setMsg('✅ Soalan ditambah!'); }
      resetForm(); fetchQuestions();
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Gagal')); }
    setTimeout(() => setMsg(''), 3000);
  };

  const resetForm = () => { setForm(emptyForm); setEditing(null); setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ''; };

  const handleEdit = (q) => {
    setEditing(q.id);
    const opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');
    const ca = Array.isArray(q.correct_answer) ? q.correct_answer : JSON.parse(q.correct_answer || '[]');
    if (q.question_type === 'match') setForm({ question: q.question, question_type: q.question_type, options: [], correct_answer: [], match_pairs: opts.map(p => ({ left: p.left || p, right: p.right || p })), timer_seconds: q.timer_seconds || 15 });
    else setForm({ question: q.question, question_type: q.question_type, options: opts, correct_answer: ca, match_pairs: [{ left: '', right: '' }, { left: '', right: '' }], timer_seconds: q.timer_seconds || 15 });
    setImagePreview(q.image_url || null);
    setTab('questions');
  };

  const handleDelete = async (id) => { if (!confirm('Padam soalan ini?')) return; await api.delete(`/quiz/admin/questions/${id}`); fetchQuestions(); };

  const saveSettings = async () => {
    if (!selSession) { setMsg('❌ Sila pilih sesi!'); setTimeout(() => setMsg(''), 3000); return; }
    await api.post('/quiz/admin/settings', { session_id: selSession, ...qSettings });
    setMsg('✅ Tetapan disimpan!');
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div>
      {/* Tab navigasi */}
      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(tab === 'questions' ? s.tabActive : {}) }} onClick={() => setTab('questions')}>❓ Soalan ({questions.length})</button>
        <button style={{ ...s.tab, ...(tab === 'settings' ? s.tabActive : {}) }} onClick={() => setTab('settings')}>⚙️ Tetapan Kuiz</button>
      </div>

      {msg && <div style={msg.includes('✅') ? s.success : s.error}>{msg}</div>}

      {/* TAB SOALAN */}
      {tab === 'questions' && (
        <>
          {/* Borang */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>{editing ? '✏️ Kemaskini Soalan' : '➕ Tambah Soalan Baharu'}</h2>
            <form onSubmit={handleSubmit}>
              {/* Pemilih jenis soalan */}
              <div style={s.field}>
                <label style={s.label}>Jenis Soalan</label>
                <div style={s.typeBtns}>
                  {TYPES.map(t => (
                    <button key={t.value} type="button" style={{ ...s.typeBtn, ...(form.question_type === t.value ? s.typeBtnActive : {}) }} onClick={() => handleTypeChange(t.value)}>{t.label}</button>
                  ))}
                </div>
              </div>

              {/* Teks soalan */}
              <div style={s.field}>
                <label style={s.label}>Soalan</label>
                <textarea style={{ ...s.input, height: '80px', resize: 'vertical' }} value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} required placeholder="Tulis soalan di sini..." maxLength={500} />
                <p style={{ color: form.question.length > 450 ? '#e11d48' : '#94a3b8', fontSize: '0.75rem', margin: '0.2rem 0 0', textAlign: 'right' }}>{form.question.length}/500</p>
              </div>

              {/* Muat naik gambar */}
              <div style={s.field}>
                <label style={s.label}>Gambar (pilihan)</label>
                <div style={s.uploadArea} onClick={() => fileRef.current.click()}>
                  {imagePreview ? <img src={imagePreview} alt="pratonton" style={s.previewImg} /> : <div style={s.uploadPlaceholder}><div style={{ fontSize: '2rem' }}>🖼️</div><p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.85rem' }}>Klik untuk muat naik gambar</p></div>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                {imagePreview && <button type="button" style={s.removeBtn} onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ''; }}>✕ Buang gambar</button>}
              </div>

              {/* Pilihan jawapan — Pilihan Berganda / Betul Salah / Pelbagai Pilihan */}
              {form.question_type !== 'match' && (
                <div style={s.field}>
                  <label style={s.label}>
                    Pilihan Jawapan
                    <span style={s.labelHint}>{form.question_type === 'multi_select' ? '(klik beberapa untuk tetapkan jawapan betul)' : '(klik untuk tetapkan jawapan betul)'}</span>
                  </label>
                  <div style={s.optionsList}>
                    {form.options.map((opt, idx) => (
                      <div key={idx} style={s.optionRow}>
                        <button type="button" style={{ ...s.correctBtn, ...(form.correct_answer.includes(idx) ? s.correctBtnActive : {}) }} onClick={() => toggleCorrect(idx)}>
                          {form.correct_answer.includes(idx) ? '✓' : String.fromCharCode(65 + idx)}
                        </button>
                        <input style={{ ...s.input, flex: 1, marginBottom: 0 }} value={opt} onChange={e => handleOptionChange(idx, e.target.value)} placeholder={`Pilihan ${String.fromCharCode(65 + idx)}`} required={form.question_type !== 'true_false'} disabled={form.question_type === 'true_false'} maxLength={200} />
                        {form.question_type !== 'true_false' && (
                          <button type="button" style={s.removeOptBtn} onClick={() => removeOption(idx)}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {form.question_type !== 'true_false' && form.options.length < 6 && (
                    <button type="button" style={s.addOptBtn} onClick={addOption}>+ Tambah Pilihan</button>
                  )}
                </div>
              )}

              {/* Pasangan padanan */}
              {form.question_type === 'match' && (
                <div style={s.field}>
                  <label style={s.label}>Pasangan Padanan <span style={s.labelHint}>(kiri ↔ kanan)</span></label>
                  {form.match_pairs.map((pair, idx) => (
                    <div key={idx} style={s.matchPairRow}>
                      <input style={{ ...s.input, flex: 1, marginBottom: 0 }} value={pair.left} onChange={e => handleMatchChange(idx, 'left', e.target.value)} placeholder={`Kiri ${idx + 1}`} required maxLength={100} />
                      <span style={s.matchArrow}>↔</span>
                      <input style={{ ...s.input, flex: 1, marginBottom: 0 }} value={pair.right} onChange={e => handleMatchChange(idx, 'right', e.target.value)} placeholder={`Kanan ${idx + 1}`} required maxLength={100} />
                      <button type="button" style={s.removeOptBtn} onClick={() => removeMatchPair(idx)}>✕</button>
                    </div>
                  ))}
                  <button type="button" style={s.addOptBtn} onClick={addMatchPair}>+ Tambah Pasangan</button>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button style={s.btnPrimary} type="submit">{editing ? 'Kemaskini' : 'Tambah Soalan'}</button>
                {editing && <button style={s.btnSecondary} type="button" onClick={resetForm}>Batal</button>}
              </div>
            </form>
          </div>

          {/* Senarai soalan */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>❓ Semua Soalan ({questions.length})</h2>
            <div style={s.qList}>
              {questions.map((q, i) => {
                const opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');
                const ca = Array.isArray(q.correct_answer) ? q.correct_answer : JSON.parse(q.correct_answer || '[]');
                const typeInfo = TYPES.find(t => t.value === q.question_type);
                return (
                  <div key={q.id} style={s.qItem}>
                    <div style={s.qNum}>{i + 1}</div>
                    <div style={s.qContent}>
                      <div style={s.qTopRow}>
                        <span style={s.qTypeBadge}>{typeInfo?.label}</span>
                      </div>
                      {q.image_url && <img src={q.image_url} alt="" style={s.qImg} />}
                      <p style={s.qText}>{q.question}</p>
                      {q.question_type !== 'match' && (
                        <div style={s.qOpts}>
                          {opts.map((opt, idx) => (
                            <span key={idx} style={{ ...s.qOpt, ...(ca.includes(idx) ? s.qOptCorrect : {}) }}>
                              {String.fromCharCode(65 + idx)}: {opt}
                              {ca.includes(idx) && ' ✓'}
                            </span>
                          ))}
                        </div>
                      )}
                      {q.question_type === 'match' && (
                        <div style={s.qOpts}>
                          {opts.map((pair, idx) => (
                            <span key={idx} style={s.qOptCorrect}>{pair.left || pair} ↔ {pair.right || pair}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={s.qActions}>
                      <button style={s.btnEdit} onClick={() => handleEdit(q)}>✏️</button>
                      <button style={s.btnDelete} onClick={() => handleDelete(q.id)}>🗑️</button>
                    </div>
                  </div>
                );
              })}
              {questions.length === 0 && <p style={s.muted}>Tiada soalan lagi. Tambah soalan di atas!</p>}
            </div>
          </div>
        </>
      )}

      {/* TAB TETAPAN */}
      {tab === 'settings' && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>⚙️ Tetapan Kuiz Mengikut Sesi</h2>
          <div style={s.field}>
            <label style={s.label}>Pilih Sesi</label>
            <select style={s.input} value={selSession} onChange={e => setSelSession(e.target.value)}>
              <option value="">-- Pilih sesi --</option>
              {sessions.map(sess => <option key={sess.id} value={sess.id}>{sess.session_name}</option>)}
            </select>
          </div>
          <div style={s.settingsGrid}>
            <div style={s.field}>
              <label style={s.label}>Masa Setiap Soalan (saat)</label>
              <select style={s.input} value={qSettings.timer_seconds} onChange={e => setQSettings({ ...qSettings, timer_seconds: parseInt(e.target.value) })}>
                {[10, 15, 20, 30, 45, 60].map(t => <option key={t} value={t}>{t} saat</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Susunan Soalan</label>
              <select style={s.input} value={qSettings.question_order} onChange={e => setQSettings({ ...qSettings, question_order: e.target.value })}>
                <option value="shuffle">🔀 Rawak (acak)</option>
                <option value="fixed">📋 Tetap (mengikut urutan)</option>
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Bilangan Soalan</label>
              <input style={s.input} type="number" min="1" max={questions.length || 50} step="1" value={qSettings.question_count} onChange={e => setQSettings({ ...qSettings, question_count: parseInt(e.target.value) })} />
              <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '0.25rem 0 0' }}>Maks: {questions.length} soalan tersedia</p>
            </div>
          </div>
          <button style={s.btnPrimary} onClick={saveSettings}>💾 Simpan Tetapan</button>
        </div>
      )}
    </div>
  );
};

const s = {
  tabs: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' },
  tab: { padding: '0.5rem 1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: '500', fontSize: '0.9rem' },
  tabActive: { background: '#2563eb', color: '#fff', border: '1px solid #2563eb' },
  card: { background: '#fff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: '1.1rem', fontWeight: '700', color: '#1e3a5f', margin: '0 0 1.25rem' },
  field: { marginBottom: '1rem' },
  label: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' },
  labelHint: { color: '#94a3b8', fontSize: '0.75rem', fontWeight: '400' },
  input: { width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', marginBottom: '0' },
  typeBtns: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  typeBtn: { padding: '0.4rem 0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '500' },
  typeBtnActive: { background: '#2563eb', color: '#fff', border: '1px solid #2563eb' },
  uploadArea: { border: '2px dashed #cbd5e1', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' },
  uploadPlaceholder: { textAlign: 'center', padding: '1.5rem' },
  previewImg: { width: '100%', maxHeight: '140px', objectFit: 'contain' },
  removeBtn: { background: '#fff1f2', color: '#e11d48', border: 'none', borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.78rem', marginTop: '0.4rem' },
  optionsList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  optionRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  correctBtn: { width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer', flexShrink: 0, color: '#475569' },
  correctBtnActive: { background: '#16a34a', color: '#fff', border: '2px solid #16a34a' },
  removeOptBtn: { background: '#fff1f2', color: '#e11d48', border: 'none', borderRadius: '6px', padding: '0.3rem 0.5rem', cursor: 'pointer', fontSize: '0.78rem', flexShrink: 0 },
  addOptBtn: { background: '#eff6ff', color: '#2563eb', border: '1px dashed #93c5fd', borderRadius: '8px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600', marginTop: '0.4rem' },
  matchPairRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' },
  matchArrow: { color: '#94a3b8', fontWeight: '700', flexShrink: 0 },
  settingsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' },
  btnPrimary: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.65rem 1.5rem', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' },
  btnSecondary: { background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', padding: '0.65rem 1.5rem', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' },
  success: { background: '#f0fdf4', color: '#16a34a', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  error: { background: '#fff1f2', color: '#e11d48', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  qList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  qItem: { display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: '#fafafa', padding: '1rem', borderRadius: '12px', border: '1px solid #f1f5f9' },
  qNum: { width: '28px', height: '28px', background: '#1e3a5f', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.82rem', flexShrink: 0 },
  qContent: { flex: 1, minWidth: 0 },
  qTopRow: { marginBottom: '0.4rem' },
  qTypeBadge: { background: '#eff6ff', color: '#2563eb', fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: '600' },
  qImg: { width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', marginBottom: '0.4rem', display: 'block' },
  qText: { fontWeight: '600', color: '#1e3a5f', margin: '0 0 0.4rem', fontSize: '0.92rem' },
  qOpts: { display: 'flex', flexWrap: 'wrap', gap: '0.35rem' },
  qOpt: { background: '#f1f5f9', color: '#475569', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem' },
  qOptCorrect: { background: '#f0fdf4', color: '#16a34a', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem' },
  qActions: { display: 'flex', gap: '0.4rem', flexShrink: 0 },
  btnEdit: { background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', padding: '0.35rem 0.6rem', cursor: 'pointer', fontSize: '0.82rem' },
  btnDelete: { background: '#fff1f2', color: '#e11d48', border: 'none', borderRadius: '6px', padding: '0.35rem 0.6rem', cursor: 'pointer', fontSize: '0.82rem' },
  muted: { color: '#94a3b8', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' },
};

export default ManageQuiz;
