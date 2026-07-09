import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const TYPES = [
  { value: 'multiple_choice', label: '🔵 Pilihan Berganda' },
  { value: 'true_false', label: '✅ Betul / Salah' },
  { value: 'multi_select', label: '☑️ Pelbagai Pilihan' },
  { value: 'match', label: '🔗 Padanan' },
];

const makeOptionList = (sourceLanguage = 'bm') => sourceLanguage === 'bi'
  ? ['', '', '', '']
  : ['', '', '', ''];

const makeTrueFalseOptions = (sourceLanguage = 'bm') => sourceLanguage === 'bi'
  ? ['False', 'True']
  : ['Tidak Betul', 'Betul'];

const emptyForm = {
  source_language: 'bm',
  manual_translation: false,
  question: '',
  question_translation: '',
  question_bi: '',
  question_type: 'multiple_choice',
  options: makeOptionList(),
  options_translation: makeOptionList(),
  correct_answer: [],
  match_pairs: [{ left: '', right: '' }, { left: '', right: '' }],
  match_pairs_translation: [{ left: '', right: '' }, { left: '', right: '' }],
  timer_seconds: 15
};

const parseMaybeJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const pickQuestionText = (question, language) => (
  language === 'bi' && question.question_bi ? question.question_bi : question.question
);

const pickQuestionOptions = (question, language) => {
  const bmOptions = parseMaybeJsonArray(question.options);
  const biOptions = parseMaybeJsonArray(question.options_bi);
  return language === 'bi' && biOptions.length ? biOptions : bmOptions;
};

const ManageQuiz = () => {
  const { tx, language } = useLanguage();
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState({ ...emptyForm, source_language: language });
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (editing) return; // don't clobber an in-progress edit
    if (form.question.trim()) return; // don't clobber content the admin already typed
    if (form.source_language === language) return;
    setForm(prev => ({
      ...prev,
      source_language: language,
      options: prev.question_type === 'true_false' ? makeTrueFalseOptions(language) : prev.options,
      options_translation: prev.question_type === 'true_false' ? makeTrueFalseOptions(language === 'bm' ? 'bi' : 'bm') : prev.options_translation,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);
  const [tab, setTab] = useState('questions');
  const [sessions, setSessions] = useState([]);
  const [selSession, setSelSession] = useState('');
  const [qSettings, setQSettings] = useState({ timer_seconds: 15, question_order: 'shuffle', question_count: 10 });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [orderFilter, setOrderFilter] = useState('desc');
  const fileRef = useRef();
  const formRef = useRef(null);

  const quizLang = {
    bm: {
      inputLabel: 'Bahasa input',
      manualCheck: 'Saya mahu terjemah sendiri',
      hint: 'Masukkan BM. Sistem akan isi BI secara automatik jika manual tidak ditanda.',
      translationLabel: 'Terjemahan Bahasa Inggeris',
      translationPlaceholder: 'Tulis terjemahan BI di sini',
    },
    bi: {
      inputLabel: 'Input language',
      manualCheck: 'I want to translate manually',
      hint: 'Enter English. The system will fill in BM automatically if manual is not checked.',
      translationLabel: 'BM Translation',
      translationPlaceholder: 'Write BM translation here',
    }
  };

  const localText = quizLang[form.source_language];

  const fetchQuestions = () => {
    console.log('QUIZ FILTER:', { search, typeFilter, orderFilter });
    api.get('/quiz/admin/questions', {
      params: {
        search,
        type: typeFilter,
        order: orderFilter
      }
    }).then(res => setQuestions(res.data.questions));
  };
  const fetchSessions = () => api.get('/sessions').then(res => setSessions(res.data.sessions));

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchQuestions();
    }, 300);

    return () => clearTimeout(delay);
  }, [search, typeFilter, orderFilter]);

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

  const handleOptionTranslationChange = (idx, val) => {
    const opts = [...form.options_translation];
    opts[idx] = val;
    setForm({ ...form, options_translation: opts });
  };

  const handleSourceLanguageChange = (source_language) => {
    setForm({
      ...form,
      source_language,
      question: form.question,
      question_translation: form.question_translation,
      question_bi: form.question_bi,
      options: form.question_type === 'true_false' ? makeTrueFalseOptions(source_language) : form.options,
      options_translation: form.question_type === 'true_false' ? makeTrueFalseOptions(source_language === 'bm' ? 'bi' : 'bm') : form.options_translation,
      match_pairs: form.match_pairs,
      match_pairs_translation: form.match_pairs_translation,
      correct_answer: form.correct_answer,
    });
  };

  const addOption = () => {
    if (form.options.length >= 6) return;
    setForm({ ...form, options: [...form.options, ''], options_translation: [...form.options_translation, ''] });
  };

  const removeOption = (idx) => {
    if (form.options.length <= 2) return;
    const opts = form.options.filter((_, i) => i !== idx);
    const optsTranslation = form.options_translation.filter((_, i) => i !== idx);
    const ca = form.correct_answer.filter(i => i !== idx).map(i => i > idx ? i - 1 : i);
    setForm({ ...form, options: opts, options_translation: optsTranslation, correct_answer: ca });
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

  const handleMatchTranslationChange = (idx, side, val) => {
    const pairs = [...form.match_pairs_translation];
    pairs[idx] = { ...pairs[idx], [side]: val };
    setForm({ ...form, match_pairs_translation: pairs });
  };

  const addMatchPair = () => setForm({
    ...form,
    match_pairs: [...form.match_pairs, { left: '', right: '' }],
    match_pairs_translation: [...form.match_pairs_translation, { left: '', right: '' }]
  });
  const removeMatchPair = (idx) => {
    if (form.match_pairs.length <= 2) return;
    setForm({
      ...form,
      match_pairs: form.match_pairs.filter((_, i) => i !== idx),
      match_pairs_translation: form.match_pairs_translation.filter((_, i) => i !== idx)
    });
  };

  const handleTypeChange = (type) => {
    if (type === 'true_false') setForm({
      ...form,
      question_type: type,
      options: makeTrueFalseOptions(form.source_language),
      options_translation: makeTrueFalseOptions(form.source_language === 'bm' ? 'bi' : 'bm'),
      correct_answer: []
    });
    else if (type === 'match') setForm({
      ...form,
      question_type: type,
      options: [],
      options_translation: [],
      correct_answer: [],
      match_pairs: [{ left: '', right: '' }, { left: '', right: '' }],
      match_pairs_translation: [{ left: '', right: '' }, { left: '', right: '' }]
    });
    else setForm({
      ...form,
      question_type: type,
      options: ['', '', '', ''],
      options_translation: ['', '', '', ''],
      correct_answer: []
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.correct_answer.length === 0 && form.question_type !== 'match') { setMsg('❌ Sila pilih jawapan yang betul!'); setTimeout(() => setMsg(''), 3000); return; }
    try {
      const fd = new FormData();
      fd.append('question', form.question);
      fd.append('source_language', editing ? 'bm' : form.source_language);
      if (form.manual_translation && form.question_translation?.trim()) {
        fd.append('question_translation', form.question_translation.trim());
      } else if (form.question_bi?.trim()) {
        fd.append('question_bi', form.question_bi.trim());
      }
      fd.append('question_type', form.question_type);
      fd.append('timer_seconds', form.timer_seconds);
      if (form.question_type === 'match') {
        fd.append('options', JSON.stringify(form.match_pairs));
        if (form.manual_translation && form.match_pairs_translation.some(pair => pair.left.trim() || pair.right.trim())) {
          fd.append('options_translation', JSON.stringify(form.match_pairs_translation));
        }
        const ca = form.match_pairs.map((_, i) => [i, i]);
        fd.append('correct_answer', JSON.stringify(ca));
      } else {
        fd.append('options', JSON.stringify(form.options.filter(o => o.trim())));
        if (form.manual_translation) {
          const translatedOptions = form.options_translation.slice(0, form.options.filter(o => o.trim()).length);
          if (translatedOptions.some(opt => opt.trim())) fd.append('options_translation', JSON.stringify(translatedOptions));
        }
        fd.append('correct_answer', JSON.stringify(form.correct_answer));
      }
      if (imageFile) fd.append('image', imageFile);

      if (editing) { await api.put(`/quiz/admin/questions/${editing}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); setMsg('✅ Soalan dikemaskini!'); }
      else { await api.post('/quiz/admin/questions', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); setMsg('✅ Soalan ditambah!'); }
      resetForm(); fetchQuestions();
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Gagal')); }
    setTimeout(() => setMsg(''), 3000);
  };

  const resetForm = () => { setForm({ ...emptyForm, source_language: language }); setEditing(null); setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ''; };

  const handleEdit = (q) => {
    setEditing(q.id);
    const opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');
    const optsBi = Array.isArray(q.options_bi) ? q.options_bi : JSON.parse(q.options_bi || '[]');
    const ca = Array.isArray(q.correct_answer) ? q.correct_answer : JSON.parse(q.correct_answer || '[]');
    if (q.question_type === 'match') setForm({
      ...emptyForm,
      source_language: 'bm',
      manual_translation: false,
      question: q.question,
      question_translation: q.question_bi || '',
      question_bi: q.question_bi || '',
      question_type: q.question_type,
      options: [],
      options_translation: [],
      correct_answer: [],
      match_pairs: opts.map(p => ({ left: p.left || p, right: p.right || p })),
      match_pairs_translation: optsBi.map(p => ({ left: p.left || p, right: p.right || p })),
      timer_seconds: q.timer_seconds || 15
    });
    else setForm({
      ...emptyForm,
      source_language: 'bm',
      manual_translation: Boolean(q.question_bi),
      question: q.question,
      question_translation: q.question_bi || '',
      question_bi: q.question_bi || '',
      question_type: q.question_type,
      options: opts,
      options_translation: optsBi.length ? optsBi : opts.map(() => ''),
      correct_answer: ca,
      match_pairs: [{ left: '', right: '' }, { left: '', right: '' }],
      match_pairs_translation: [{ left: '', right: '' }, { left: '', right: '' }],
      timer_seconds: q.timer_seconds || 15
    });
    setImagePreview(q.image_url || null);
    setTab('questions');

    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  const handleDelete = async (id) => { if (!confirm(tx('Padam soalan ini?'))) return; await api.delete(`/quiz/admin/questions/${id}`); fetchQuestions(); };

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
        <button style={{ ...s.tab, ...(tab === 'questions' ? s.tabActive : {}) }} onClick={() => setTab('questions')}><span>❓ Soalan</span> ({questions.length})</button>
        <button style={{ ...s.tab, ...(tab === 'settings' ? s.tabActive : {}) }} onClick={() => setTab('settings')}>⚙️ Tetapan Kuiz</button>
      </div>

      {msg && <div style={msg.includes('✅') ? s.success : s.error}>{msg}</div>}

      {/* TAB SOALAN */}
      {tab === 'questions' && (
        <>
          {/* Borang */}
          <div style={s.card} ref={formRef}>
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

              <div style={s.translationPanel}>
                <div style={s.translationHeader}>
                  <div>
                    <label style={s.label} data-no-translate="true">
                      {localText.inputLabel}
                    </label>
                    <select style={s.compactSelect} value={form.source_language} onChange={e => handleSourceLanguageChange(e.target.value)} disabled={Boolean(editing)}>
                      <option value="bm">Bahasa Melayu</option>
                      <option value="bi">English</option>
                    </select>
                    {editing && <p style={s.translationHint}>Bahasa input dikunci semasa edit untuk elak data tertukar.</p>}
                  </div>
                  <label style={s.checkLabel}>
                    <input type="checkbox" checked={form.manual_translation} onChange={e => setForm({ ...form, manual_translation: e.target.checked })} />
                    <span data-no-translate="true">{localText.manualCheck}</span>
                  </label>
                </div>
                <p style={s.translationHint} data-no-translate="true">
                  {localText.hint}
                </p>
              </div>

              {/* Teks soalan */}
              <div style={s.field}>
                <label style={s.label} data-no-translate="true">
                  {form.source_language === 'bm' ? 'Soalan (BM)' : 'Question (English)'}
                </label>
                <textarea style={{ ...s.input, height: '80px', resize: 'vertical' }} value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} required data-no-translate="true" placeholder={form.source_language === 'bm' ? 'Tulis soalan di sini...' : 'Write the question here...'} maxLength={500} />
                <p style={{ color: form.question.length > 450 ? '#e11d48' : '#94a3b8', fontSize: '0.75rem', margin: '0.2rem 0 0', textAlign: 'right' }}>{form.question.length}/500</p>
              </div>
              {form.manual_translation && (
                <>
                  {/* Translation Question */}
                  <div style={{ marginBottom: '1rem', background: '#eff6ff', borderRadius: '10px', padding: '0.75rem', border: '1px solid #bfdbfe' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#2563eb', marginBottom: '0.4rem' }}>
                      <span data-no-translate="true">{localText.translationLabel}</span>
                    </label>
                    <textarea
                      style={{ ...s.input, height: '70px', resize: 'vertical', borderColor: '#bfdbfe' }}
                      value={form.question_translation}
                      onChange={e => setForm({ ...form, question_translation: e.target.value })}
                      maxLength={500}
                      data-no-translate="true"
                      placeholder={localText.translationPlaceholder}
                    />
                  </div>
                  <div style={{ display: 'none' }}>
                  </div>
                </>
              )}

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
                    <span style={s.labelHint}>
                      {form.question_type === 'multi_select'
                        ? tx('(klik satu atau lebih jawapan betul)')
                        : tx('(klik bulatan A/B/C/D untuk pilih jawapan betul)')}
                    </span>
                  </label>

                  {form.correct_answer.length === 0 && (
                    <div style={s.correctWarning}>
                      {tx('⚠️ Sila pilih jawapan yang betul sebelum tekan Tambah Soalan.')}
                    </div>
                  )}
                  <div style={s.optionsList}>
                    {form.options.map((opt, idx) => (
                      <div key={idx} style={s.optionRow}>
                        <button type="button" style={{ ...s.correctBtn, ...(form.correct_answer.includes(idx) ? s.correctBtnActive : {}) }} onClick={() => toggleCorrect(idx)}>
                          {form.correct_answer.includes(idx) ? '✓' : String.fromCharCode(65 + idx)}
                        </button>
                        <input style={{ ...s.input, flex: 1, marginBottom: 0 }} value={opt} onChange={e => handleOptionChange(idx, e.target.value)} data-no-translate="true"
                          placeholder={form.source_language === 'bm' ? `Pilihan ${String.fromCharCode(65 + idx)}` : `Option ${String.fromCharCode(65 + idx)}`} required={form.question_type !== 'true_false'} disabled={form.question_type === 'true_false'} maxLength={200} />
                        {form.manual_translation && (
                          <input style={{ ...s.input, flex: 1, marginBottom: 0, borderColor: '#bfdbfe' }} value={form.options_translation[idx] || ''} onChange={e => handleOptionTranslationChange(idx, e.target.value)} data-no-translate="true" placeholder={form.source_language === 'bm' ? `Option ${String.fromCharCode(65 + idx)}` : `Pilihan ${String.fromCharCode(65 + idx)}`} disabled={form.question_type === 'true_false'} maxLength={200} />
                        )}
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
                  <label style={s.label} data-no-translate="true">
                    {form.source_language === 'bm' ? 'Pasangan Padanan' : 'Matching Pairs'}
                    <span style={s.labelHint}>
                      ({form.source_language === 'bm' ? 'kiri' : 'left'} ↔ {form.source_language === 'bm' ? 'kanan' : 'right'})
                    </span>
                  </label>
                  {form.match_pairs.map((pair, idx) => (
                    <div key={idx} style={s.matchPairRow}>
                      <input style={{ ...s.input, flex: 1, marginBottom: 0 }} value={pair.left} onChange={e => handleMatchChange(idx, 'left', e.target.value)} data-no-translate="true"
                        placeholder={form.source_language === 'bm' ? `Kiri ${idx + 1}` : `Left ${idx + 1}`} required maxLength={100} />
                      <span style={s.matchArrow}>↔</span>
                      <input style={{ ...s.input, flex: 1, marginBottom: 0 }} value={pair.right} onChange={e => handleMatchChange(idx, 'right', e.target.value)} data-no-translate="true" placeholder={form.source_language === 'bm' ? `Kanan ${idx + 1}` : `Right ${idx + 1}`} required maxLength={100} />
                      <button type="button" style={s.removeOptBtn} onClick={() => removeMatchPair(idx)}>✕</button>
                    </div>
                  ))}
                  <button type="button" style={s.addOptBtn} data-no-translate="true" onClick={addMatchPair}>
                    {form.source_language === 'bm' ? '+ Tambah Pasangan' : '+ Add Pair'}
                  </button>
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
            <h2 style={s.cardTitle}><span>❓ Semua Soalan</span> ({questions.length})</h2>
            <div style={s.filterBar}>
              <input
                style={s.input}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={tx('Cari soalan...')}
              />

              <select
                style={s.input}
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
              >
                <option value="all">{tx('Semua Jenis Soalan')}</option>
                <option value="multiple_choice">{tx('Pilihan Berganda')}</option>
                <option value="true_false">{tx('Betul / Salah')}</option>
                <option value="multi_select">{tx('Pelbagai Pilihan')}</option>
                <option value="match">{tx('Padanan')}</option>
              </select>

              <select
                style={s.input}
                value={orderFilter}
                onChange={e => setOrderFilter(e.target.value)}
              >
                <option value="desc">{tx('Terbaharu Ditambah')}</option>
                <option value="asc">{tx('Terlama Ditambah')}</option>
              </select>
            </div>
            <div style={s.qList}>
              {questions.map((q, i) => {
                const opts = pickQuestionOptions(q, language);
                const ca = parseMaybeJsonArray(q.correct_answer);
                const typeInfo = TYPES.find(t => t.value === q.question_type);
                return (
                  <div key={q.id} style={s.qItem}>
                    <div style={s.qNum}>{i + 1}</div>
                    <div style={s.qContent}>
                      <div style={s.qTopRow}>
                        <span style={s.qTypeBadge}>{typeInfo?.label}</span>
                      </div>
                      {q.image_url && <img src={q.image_url} alt="" style={s.qImg} />}
                      <p style={s.qText} data-no-translate="true">
                        <strong>BM:</strong> {q.question}
                      </p>

                      {q.question_bi && (
                        <p style={s.qTextBi} data-no-translate="true">
                          <strong>BI:</strong> {q.question_bi}
                        </p>
                      )}
                      {q.question_type !== 'match' && (
                        <div style={s.qOpts}>
                          {parseMaybeJsonArray(q.options).map((opt, idx) => {
                            const biOpts = parseMaybeJsonArray(q.options_bi);
                            const biOpt = biOpts[idx];

                            return (
                              <span
                                key={idx}
                                style={{ ...s.qOpt, ...(ca.includes(idx) ? s.qOptCorrect : {}) }}
                                data-no-translate="true"
                              >
                                {String.fromCharCode(65 + idx)}:
                                <br />
                                <strong>BM:</strong> {opt}
                                {biOpt && (
                                  <>
                                    <br />
                                    <strong>BI:</strong> {biOpt}
                                  </>
                                )}
                                {ca.includes(idx) && ' ✓'}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {q.question_type === 'match' && (
                        <div style={s.qOpts}>
                          {parseMaybeJsonArray(q.options).map((pair, idx) => {
                            const biPairs = parseMaybeJsonArray(q.options_bi);
                            const biPair = biPairs[idx];

                            return (
                              <span key={idx} style={s.qOptCorrect} data-no-translate="true">
                                <strong>BM:</strong> {pair.left || pair} ↔ {pair.right || pair}
                                {biPair && (
                                  <>
                                    <br />
                                    <strong>BI:</strong> {biPair.left || biPair} ↔ {biPair.right || biPair}
                                  </>
                                )}
                              </span>
                            );
                          })}
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
              <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '0.25rem 0 0' }}>
                <span>{tx('Maks')}:</span> {questions.length} <span>{tx('soalan tersedia')}</span>
              </p>
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
  translationPanel: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' },
  translationHeader: { display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' },
  compactSelect: { minWidth: '180px', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', color: '#1e293b', fontSize: '0.9rem' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#1e3a5f', fontSize: '0.86rem', fontWeight: '700', cursor: 'pointer' },
  translationHint: { margin: '0.55rem 0 0', color: '#64748b', fontSize: '0.78rem' },
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
  filterBar: { display: 'grid', gridTemplateColumns: '1fr 220px 180px', gap: '0.75rem', marginBottom: '1rem' },
  qTextBi: { fontWeight: '500', color: '#64748b', margin: '0 0 0.4rem', fontSize: '0.86rem' },
  correctWarning: { background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.82rem', fontWeight: '600', marginBottom: '0.6rem' },
};

export default ManageQuiz;