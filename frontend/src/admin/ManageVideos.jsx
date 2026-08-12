import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const emptyForm = {
  title: '',
  description: '',
  youtube_url: '',
  order_num: '',
  language: 'bm',
};

const ManageVideos = () => {
  const { tx } = useLanguage();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  // I Add Here
  const [search, setSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('asc');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [translating, setTranslating] = useState(false);
  const formRef = useRef(null);

  // I replace this part...
  const fetchVideos = () => {
    if (videos.length === 0) setLoading(true);
    api.get('/videos', {
      params: {
        search,
        order: orderFilter,
        ...(languageFilter !== 'all' && {
          language: languageFilter
        })
      }
    })
      .then(res => setVideos(res.data.videos))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchVideos();
    }, 300);

    return () => clearTimeout(delay);
  }, [search, orderFilter, languageFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.order_num !== '') {
      const orderNum = Number(form.order_num);
      if (!Number.isInteger(orderNum) || orderNum < 1) {
        setMsg('❌ Nombor susunan mesti nombor bulat 1 atau lebih besar');
        setTimeout(() => setMsg(''), 3000); return;
      }
    } else if (editing) {
      setMsg('❌ Sila masukkan nombor susunan (1, 2, 3…)');
      setTimeout(() => setMsg(''), 3000); return;
    }
    setTranslating(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        youtube_url: form.youtube_url,
        order_num: form.order_num,
        language: form.language,
      };
      if (editing) {
        await api.put(`/videos/${editing}`, payload);
        setMsg(`✅ ${tx('Video Dikemaskini!')}`);
      } else {
        await api.post('/videos', payload);
        setMsg(`✅ ${tx('Video Ditambah!')}`);
      }
      setForm(emptyForm);
      setEditing(null);
      fetchVideos();
    } catch (err) {
      setMsg('❌ Error: ' + (err.response?.data?.error || 'Failed'));
    }
    setTranslating(false);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleEdit = (video) => {
    setEditing(video.id);

    setForm({
      title: video.title || '',
      description: video.description || '',
      youtube_url: video.youtube_url || '',
      order_num: video.order_num || '',
      language: video.language || 'bm',
    });

    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  const handleDelete = async (id) => {
    if (!confirm(tx('Padam video ini?'))) return;
    await api.delete(`/videos/${id}`); fetchVideos();
  };

  return (
    <div>
      <div ref={formRef} style={s.card}>
        <h2 style={s.cardTitle}>
          {editing
            ? `✏️ ${tx('Kemaskini Video')}`
            : `➕ ${tx('Tambah Video')}`}
        </h2>
        {msg && <div style={msg.includes('✅') ? s.success : s.error}>{msg}</div>}
        <form onSubmit={handleSubmit}>

          {/* Language Selector */}
          <div style={s.translationPanel}>
            <label style={s.label}>{tx('Bahasa Video')}</label>

            <div style={s.segmented}>
              <button
                type="button"
                style={{
                  ...s.segmentBtn,
                  ...(form.language === 'bm' ? s.segmentActive : {})
                }}
                onClick={() =>
                  setForm({
                    ...form,
                    language: 'bm'
                  })
                }
              >
                BM
              </button>

              <button
                type="button"
                style={{
                  ...s.segmentBtn,
                  ...(form.language === 'bi' ? s.segmentActive : {})
                }}
                onClick={() =>
                  setForm({
                    ...form,
                    language: 'bi'
                  })
                }
              >
                EN
              </button>
            </div>

            <p style={s.translationHint}>
              {form.language === 'bm'
                ? 'Video ini hanya akan dipaparkan kepada pelajar apabila BM dipilih.'
                : 'This video will only appear when the student selects English.'}
            </p>
          </div>


          {/* Video Details */}
          <div style={s.langSection}>

            <div style={s.formGrid}>

              {/* Title */}
              <div style={s.field}>
                <label style={s.label}>
                  {form.language === 'bm' ? 'Tajuk' : 'Title'}
                </label>

                <input
                  style={s.input}
                  value={form.title}
                  onChange={e =>
                    setForm({
                      ...form,
                      title: e.target.value
                    })
                  }
                  required
                  maxLength={150}
                  placeholder={
                    form.language === 'bm'
                      ? 'Tajuk Video'
                      : 'Video Title'
                  }
                />
              </div>


              {/* Order Number */}
              <div style={s.field}>
                <label style={s.label}>
                  {form.language === 'bm'
                    ? 'Nombor Susunan'
                    : 'Order Number'}
                </label>

                <input
                  style={s.input}
                  type="number"
                  min={1}
                  step={1}
                  value={form.order_num}
                  onChange={e =>
                    setForm({
                      ...form,
                      order_num: e.target.value
                    })
                  }
                  placeholder={
                    editing
                      ? '1, 2, 3...'
                      : form.language === 'bm'
                        ? 'Kosongkan untuk auto'
                        : 'Leave blank for auto'
                  }
                />
              </div>

            </div>


            {/* YouTube URL */}
            <div style={s.field}>
              <label style={s.label}>
                YouTube URL
              </label>

              <input
                style={s.input}
                value={form.youtube_url}
                onChange={e =>
                  setForm({
                    ...form,
                    youtube_url: e.target.value
                  })
                }
                required
                maxLength={200}
                placeholder="https://youtu.be/..."
              />
            </div>


            {/* Description */}
            <div style={s.field}>
              <label style={s.label}>
                {form.language === 'bm'
                  ? 'Deskripsi'
                  : 'Description'}
              </label>

              <textarea
                style={{
                  ...s.input,
                  height: '70px',
                  resize: 'vertical'
                }}
                value={form.description}
                onChange={e =>
                  setForm({
                    ...form,
                    description: e.target.value
                  })
                }
                maxLength={500}
                placeholder={
                  form.language === 'bm'
                    ? 'Deskripsi Pendek...'
                    : 'Short description...'
                }
              />
            </div>

          </div>


          {/* Add / Update Button */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem'
            }}
          >
            <button
              style={{
                ...s.btnPrimary,
                opacity: translating ? 0.7 : 1
              }}
              type="submit"
              disabled={translating}
            >
              {translating
                ? '⏳ Saving...'
                : editing
                  ? tx('Kemaskini Video')
                  : tx('Tambah Video')}
            </button>

            {editing && (
              <button
                style={s.btnSecondary}
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm(emptyForm);
                }}
              >
                {tx('Batal')}
              </button>
            )}
          </div>

        </form>

      </div>

      <div style={s.card}>
        <h2 style={s.cardTitle}>📹 {tx('Senarai Video')} ({videos.length})</h2>
        {/* I added here */}
        <div style={s.filterBar}>
          <input
            style={s.input}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tx('Cari tajuk atau deskripsi...')}
          />
          <select
            style={s.input}
            value={languageFilter}
            onChange={e => setLanguageFilter(e.target.value)}
          >
            <option value="all">{tx('Semua Bahasa')}</option>
            <option value="bm">BM</option>
            <option value="bi">EN</option>
          </select>
        </div>

        {loading ? <p style={s.muted}>{tx('Memuatkan...')}</p> : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>#</th>
                <th style={s.th}>Title</th>
                <th style={s.th}>Language</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v, i) => (
                <tr key={v.id} style={i % 2 === 0 ? s.trEven : {}}>
                  <td style={s.td}>{v.order_num}</td>
                  <td style={s.td} data-no-translate="true"><strong>{v.title}</strong><br /><span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{v.description?.slice(0, 50)}...</span></td>
                  <td style={s.td}>{v.language === 'bm' ? 'BM' : 'EN'}</td>
                  <td style={s.td}>
                    <button style={s.btnEdit} onClick={() => handleEdit(v)}>✏️ {tx('Ubahsuai')}</button>
                    <button style={s.btnDelete} onClick={() => handleDelete(v.id)}>🗑️ {tx('Padam')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const s = {
  card: { background: '#fff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: '1.1rem', fontWeight: '700', color: '#1e3a5f', margin: '0 0 1.25rem' },
  langSection: { border: '1px solid #fde68a', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', background: '#fffbeb' },
  langSectionBi: { border: '1px solid #bfdbfe', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', background: '#eff6ff' },
  langBadge: { fontSize: '0.78rem', fontWeight: '700', color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.25rem 0.6rem', display: 'inline-block', marginBottom: '0.75rem' },
  translationPanel: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.9rem', marginBottom: '1rem' },
  translationHeader: { display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' },
  segmented: { display: 'inline-flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', background: '#fff' },
  segmentBtn: { padding: '0.5rem 0.9rem', border: 'none', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: '700' },
  segmentActive: { background: '#2563eb', color: '#fff' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#1e3a5f', fontSize: '0.86rem', fontWeight: '700', cursor: 'pointer' },
  translationHint: { margin: '0.55rem 0 0', color: '#64748b', fontSize: '0.78rem' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  field: { marginBottom: '0.75rem' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' },
  hint: { margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#94a3b8' },
  input: { width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' },
  btnPrimary: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.65rem 1.5rem', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' },
  btnSecondary: { background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', padding: '0.65rem 1.5rem', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' },
  success: { background: '#f0fdf4', color: '#16a34a', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  error: { background: '#fff1f2', color: '#e11d48', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f8fafc' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: '600', color: '#64748b', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '0.75rem 1rem', fontSize: '0.88rem', color: '#334155', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  trEven: { background: '#fafafa' },
  btnEdit: { background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer', marginRight: '0.5rem', fontSize: '0.82rem', fontWeight: '600' },
  btnDelete: { background: '#fff1f2', color: '#e11d48', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' },
  biBadgeOk: { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '4px', padding: '0.15rem 0.5rem', fontSize: '0.78rem', fontWeight: '700' },
  biBadgeMissing: { background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '4px', padding: '0.15rem 0.5rem', fontSize: '0.78rem', fontWeight: '700' },
  muted: { color: '#94a3b8', fontSize: '0.9rem' },
  // I add here
  filterBar: { display: 'grid', gridTemplateColumns: '1fr 220px', gap: '0.75rem', marginBottom: '1rem' },
};

export default ManageVideos;
