import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const emptyForm = {
  title: '',
  content: '',
  title_translation: '',
  content_translation: '',
  title_bi: '',
  content_bi: '',
  source_language: 'bm',
  manual_translation: false
};

const ManageFacts = () => {
  const { tx } = useLanguage();
  const [facts, setFacts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  // I added this 2 line
  const [search, setSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('desc');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [translating, setTranslating] = useState(false);
  const fileRef = useRef();
  const formRef = useRef();

  const factLang = {
    bm: {
      inputLabel: 'Bahasa input',
      manualCheck: 'Saya mahu terjemah sendiri',
      hint: 'Masukkan fakta BM. BI akan auto jika manual tidak ditanda.',
      manualBadge: '🇬🇧 Bahasa Inggeris (BI) — kosongkan untuk terjemahan automatik',
      titleLabel: 'Title (English)',
      titlePlaceholder: 'Write English title',
      contentLabel: 'Content (English)',
      contentPlaceholder: 'Write English content',
    },
    bi: {
      inputLabel: 'Input language',
      manualCheck: 'I want to translate manually',
      hint: 'Enter English facts. BM will auto-generate if manual is not checked.',
      manualBadge: '🇲🇾 BM Translation — leave empty for automatic translation',
      titleLabel: 'Tajuk (BM)',
      titlePlaceholder: 'Tulis tajuk BM',
      contentLabel: 'Kandungan (BM)',
      contentPlaceholder: 'Tulis kandungan BM',
    }
  };

  const localText = factLang[form.source_language];

  // I replace this part...
  const fetchFacts = () => {
    api.get('/facts', {
      params: {
        search,
        order: orderFilter
      }
    }).then(res => setFacts(res.data.facts));
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchFacts();
    }, 300);

    return () => clearTimeout(delay);
  }, [search, orderFilter]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTranslating(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('content', form.content);
      formData.append('source_language', form.source_language);
      // Send BI overrides — backend uses these if provided, auto-translates if empty
      if (form.manual_translation && form.title_translation.trim()) formData.append('title_translation', form.title_translation.trim());
      if (form.manual_translation && form.content_translation.trim()) formData.append('content_translation', form.content_translation.trim());
      if (imageFile) {
        formData.append('image', imageFile);
      } else if (editing && !imagePreview) {
        formData.append('remove_image', 'true');
      }

      if (editing) {
        await api.put(`/facts/${editing}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setMsg('✅ Fakta berjaya dikemas kini!');
      } else {
        await api.post('/facts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setMsg('✅ Fakta berjaya ditambah! (Terjemahan BI dilakukan secara automatik)');
      }
      resetForm();
      fetchFacts();
    } catch (err) {
      setMsg('❌ Ralat: ' + (err.response?.data?.error || 'Gagal'));
    }
    setTranslating(false);
    setTimeout(() => setMsg(''), 4000);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setImageFile(null); setImagePreview(null); setEditing(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleEdit = (fact) => {
    setEditing(fact.id);
    setForm({
      title: fact.title || '',
      content: fact.content || '',
      source_language: 'bm',
      manual_translation: Boolean(fact.title_bi || fact.content_bi),
      title_translation: fact.title_bi || '',
      content_translation: fact.content_bi || '',
      title_bi: fact.title_bi || '',
      content_bi: fact.content_bi || '',
    });
    setImagePreview(fact.image_url || null);
    setImageFile(null);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleDelete = async (id) => {
    if (!confirm(tx('Padam fakta ini?'))) return;
    await api.delete(`/facts/${id}`);
    fetchFacts();
  };

  return (
    <div>
      <div ref={formRef} style={s.card}>
        <h2 style={s.cardTitle}>{editing ? '✏️ Edit Fakta' : '➕ Tambah Fakta Baru'}</h2>
        {msg && <div style={msg.includes('✅') ? s.success : s.error}>{msg}</div>}
        <form onSubmit={handleSubmit}>

          <div style={s.translationPanel}>
            <div style={s.translationHeader}>
              <div>
                <label style={s.label} data-no-translate="true">
                  {localText.inputLabel}
                </label>
                <div style={s.segmented}>
                  <button type="button" style={{ ...s.segmentBtn, ...(form.source_language === 'bm' ? s.segmentActive : {}) }} onClick={() => setForm({ ...form, source_language: 'bm', title: '', content: '', title_translation: '', content_translation: '' })}>BM</button>
                  <button type="button" style={{ ...s.segmentBtn, ...(form.source_language === 'bi' ? s.segmentActive : {}) }} onClick={() => setForm({ ...form, source_language: 'bi', title: '', content: '', title_translation: '', content_translation: '' })}>English</button>
                </div>
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

          {/* BM Section */}
          <div style={s.langSection}>
            <div style={s.langBadge} data-no-translate="true">
              {form.source_language === 'bm'
                ? '🇲🇾 Bahasa Melayu (BM)'
                : '🇬🇧 English (BI)'}
            </div>
            <div style={s.field}>
              <label style={s.label} data-no-translate="true">
                {form.source_language === 'bm' ? 'Tajuk' : 'Title'}
              </label>
              <input data-no-translate="true" style={s.input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                required maxLength={120} placeholder={form.source_language === 'bm' ? 'Contoh: Gigi anda unik!' : 'Example: Your teeth are unique!'} />
            </div>
            <div style={s.field}>
              <label style={s.label} data-no-translate="true">
                {form.source_language === 'bm' ? 'Kandungan' : 'Content'}
              </label>
              <textarea data-no-translate="true"
                style={{ ...s.input, height: '90px', resize: 'vertical' }} value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                required maxLength={1000} placeholder={form.source_language === 'bm' ? 'Tulis fakta penuh di sini...' : 'Write the full fact here...'} />
            </div>
          </div>

          {/* BI Section */}
          {form.manual_translation && (
            <div style={s.langSection}>
              <div style={{ ...s.langBadge, background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}>
                <span data-no-translate="true">{localText.manualBadge}</span>
              </div>
              <div style={s.field}>
                <label style={s.label} data-no-translate="true">{localText.titleLabel}</label>
                <input
                  data-no-translate="true"
                  style={{ ...s.input, borderColor: '#bfdbfe' }}
                  value={form.title_translation}
                  onChange={e => setForm({ ...form, title_translation: e.target.value })}
                  maxLength={120}
                  placeholder={localText.titlePlaceholder}
                />
              </div>
              <div style={s.field}>
                <label style={s.label} data-no-translate="true">{localText.contentLabel}</label>
                <textarea
                  data-no-translate="true"
                  style={{ ...s.input, height: '90px', resize: 'vertical', borderColor: '#bfdbfe' }}
                  value={form.content_translation}
                  onChange={e => setForm({ ...form, content_translation: e.target.value })}
                  maxLength={1000}
                  placeholder={localText.contentPlaceholder}
                />
              </div>
            </div>
          )}

          {/* Image upload */}
          <div style={s.field}>
            <label style={s.label}>Imej (pilihan)</label>
            <div style={s.uploadArea} onClick={() => fileRef.current.click()}>
              {imagePreview ? (
                <div style={s.previewWrap}>
                  <img src={imagePreview} alt="preview" style={s.previewImg} />
                </div>
              ) : (
                <div style={s.uploadPlaceholder}>
                  <div style={s.uploadIcon}>🖼️</div>
                  <p style={s.uploadText}>Klik untuk muat naik imej</p>
                  <p style={s.uploadHint}>{form.source_language === 'bi' ? 'JPG, PNG, GIF, WEBP — max 5MB' : 'JPG, PNG, GIF, WEBP — maks 5MB'}</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
            {imagePreview && (
              <button type="button" style={s.removeImgBtn}
                onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ''; }}>
                ✕ Buang imej
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button style={{ ...s.btnPrimary, opacity: translating ? 0.7 : 1 }} type="submit" disabled={translating}>
              {translating
                ? (form.source_language === 'bi' ? '⏳ Translating & saving...' : '⏳ Menerjemah & menyimpan...')
                : editing
                  ? (form.source_language === 'bi' ? 'Update Fact' : 'Kemas Kini Fakta')
                  : (form.source_language === 'bi' ? 'Add Fact' : 'Tambah Fakta')}
            </button>
            {editing && <button style={s.btnSecondary} type="button" onClick={resetForm}>Batal</button>}
          </div>
        </form>
      </div>

      <div style={s.card}>
        <h2 style={s.cardTitle}>💡 Semua Fakta ({facts.length})</h2>

        {/* I added this part */}
        <div style={s.filterBar}>
          <input
            style={s.input}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tx('Cari tajuk atau kandungan...')}
          />
          <select
            style={s.input}
            value={orderFilter}
            onChange={e => setOrderFilter(e.target.value)}
          >
            <option value="desc">{tx('Terbaharu Ditambah')}</option>
            <option value="asc">{tx('Terlama Ditambah')}</option>
          </select>
        </div>

        <div style={s.factsList}>
          {facts.map((fact) => (
            <div key={fact.id} style={s.factItem}>
              {fact.image_url && (
                <img src={fact.image_url} alt={fact.title} style={s.factImg} onError={e => e.target.style.display = 'none'} />
              )}
              <div style={s.factContent}>
                <h4 style={s.factTitle} data-no-translate="true">{fact.title}</h4>
                <p style={s.factText} data-no-translate="true">{fact.content?.slice(0, 80)}...</p>
                <div style={s.biStatus}>
                  {fact.title_bi
                    ? <span style={s.biBadgeOk}>🇬🇧 BI ✓</span>
                    : <span style={s.biBadgeMissing}>{tx('🇬🇧 BI belum ada')}</span>}
                </div>
              </div>
              <div style={s.factActions}>
                <button style={s.btnEdit} onClick={() => handleEdit(fact)}>✏️ {tx('Ubahsuai')}</button>
                <button style={s.btnDelete} onClick={() => handleDelete(fact.id)}>🗑️</button>
              </div>
            </div>
          ))}
          {facts.length === 0 && <p style={s.muted}>Tiada fakta lagi. Tambah di atas!</p>}
        </div>
      </div>
    </div>
  );
};

const s = {
  card: { background: '#fff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: '1.1rem', fontWeight: '700', color: '#1e3a5f', margin: '0 0 1.25rem' },
  langSection: { border: '1px solid #f1f5f9', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', background: '#fffbeb' },
  langBadge: { fontSize: '0.78rem', fontWeight: '700', color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.25rem 0.6rem', display: 'inline-block', marginBottom: '0.75rem' },
  translationPanel: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.9rem', marginBottom: '1rem' },
  translationHeader: { display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' },
  segmented: { display: 'inline-flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', background: '#fff' },
  segmentBtn: { padding: '0.5rem 0.9rem', border: 'none', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: '700' },
  segmentActive: { background: '#2563eb', color: '#fff' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#1e3a5f', fontSize: '0.86rem', fontWeight: '700', cursor: 'pointer' },
  translationHint: { margin: '0.55rem 0 0', color: '#64748b', fontSize: '0.78rem' },
  field: { marginBottom: '0.75rem' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' },
  input: { width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', color: '#1e293b' },
  uploadArea: { border: '2px dashed #cbd5e1', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' },
  uploadPlaceholder: { textAlign: 'center', padding: '1.5rem' },
  uploadIcon: { fontSize: '2rem', marginBottom: '0.5rem' },
  uploadText: { color: '#475569', fontWeight: '600', margin: '0 0 0.25rem', fontSize: '0.9rem' },
  uploadHint: { color: '#94a3b8', fontSize: '0.8rem', margin: 0 },
  previewWrap: { width: '100%' },
  previewImg: { width: '100%', height: '160px', objectFit: 'cover', display: 'block' },
  removeImgBtn: { background: '#fff1f2', color: '#e11d48', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600', marginTop: '0.5rem' },
  btnPrimary: { background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.65rem 1.5rem', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' },
  btnSecondary: { background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', padding: '0.65rem 1.5rem', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' },
  success: { background: '#f0fdf4', color: '#16a34a', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  error: { background: '#fff1f2', color: '#e11d48', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  factsList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  factItem: { display: 'flex', alignItems: 'center', gap: '1rem', background: '#fafafa', padding: '0.75rem', borderRadius: '12px', border: '1px solid #f1f5f9' },
  factImg: { width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 },
  factContent: { flex: 1, minWidth: 0 },
  factTitle: { fontSize: '0.95rem', fontWeight: '700', color: '#1e3a5f', margin: '0 0 0.25rem' },
  factText: { fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.35rem' },
  biStatus: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' },
  biBadgeOk: { fontSize: '0.72rem', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '4px', padding: '0.1rem 0.4rem', fontWeight: '600' },
  biBadgeMissing: { fontSize: '0.72rem', background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '4px', padding: '0.1rem 0.4rem', fontWeight: '600' },
  factActions: { display: 'flex', gap: '0.5rem', flexShrink: 0 },
  btnEdit: { background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' },
  btnDelete: { background: '#fff1f2', color: '#e11d48', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' },
  muted: { color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' },
  filterBar: { display: 'grid', gridTemplateColumns: '1fr 220px', gap: '0.75rem', marginBottom: '1rem' },
};

export default ManageFacts;