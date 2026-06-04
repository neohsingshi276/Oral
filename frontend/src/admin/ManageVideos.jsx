import { useState, useEffect } from 'react';
import api from '../services/api';

const emptyForm = {
  title: '',
  description: '',
  youtube_url: '',
  order_num: '',
  title_translation: '',
  description_translation: '',
  title_bi: '',
  description_bi: '',
  source_language: 'bm',
  manual_translation: false
};

const ManageVideos = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  // I Add Here
  const [search, setSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('asc');
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [translating, setTranslating] = useState(false);

  // I replace this part...
  const fetchVideos = () => {
    if (videos.length === 0) setLoading(true);
    api.get('/videos', {
      params: {
        search,
        order: orderFilter
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
  }, [search, orderFilter]);

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
        source_language: form.source_language,
        ...(form.manual_translation && form.title_translation.trim() && { title_translation: form.title_translation.trim() }),
        ...(form.manual_translation && form.description_translation.trim() && { description_translation: form.description_translation.trim() }),
      };
      if (editing) {
        await api.put(`/videos/${editing}`, payload);
        setMsg('✅ Video Dikemaskini! (BI auto-diterjemah jika kosong)');
      } else {
        await api.post('/videos', payload);
        setMsg('✅ Video Ditambah! (BI auto-diterjemah jika kosong)');
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
      title: video.title, description: video.description,
      youtube_url: video.youtube_url, order_num: video.order_num,
      source_language: 'bm',
      manual_translation: Boolean(video.title_bi || video.description_bi),
      title_translation: video.title_bi || '',
      description_translation: video.description_bi || '',
      title_bi: video.title_bi || '', description_bi: video.description_bi || '',
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this video?')) return;
    await api.delete(`/videos/${id}`); fetchVideos();
  };

  return (
    <div>
      <div style={s.card}>
        <h2 style={s.cardTitle}>{editing ? '✏️ Kemaskini Video' : '➕ Tambah Video'}</h2>
        {msg && <div style={msg.includes('✅') ? s.success : s.error}>{msg}</div>}
        <form onSubmit={handleSubmit}>

          <div style={s.translationPanel}>
            <div style={s.translationHeader}>
              <div>
                <label style={s.label}>Bahasa input</label>
                <div style={s.segmented}>
                  <button type="button" style={{ ...s.segmentBtn, ...(form.source_language === 'bm' ? s.segmentActive : {}) }} onClick={() => setForm({ ...form, source_language: 'bm', title: '', description: '', title_translation: '', description_translation: '' })}>BM</button>
                  <button type="button" style={{ ...s.segmentBtn, ...(form.source_language === 'bi' ? s.segmentActive : {}) }} onClick={() => setForm({ ...form, source_language: 'bi', title: '', description: '', title_translation: '', description_translation: '' })}>English</button>
                </div>
              </div>
              <label style={s.checkLabel}>
                <input type="checkbox" checked={form.manual_translation} onChange={e => setForm({ ...form, manual_translation: e.target.checked })} />
                Saya mahu terjemah sendiri
              </label>
            </div>
            <p style={s.translationHint}>{form.source_language === 'bm' ? 'Masukkan kandungan BM. English akan auto jika manual tidak ditanda.' : 'Enter English content. BM akan auto jika manual tidak ditanda.'}</p>
          </div>

          {/* BM Section */}
          <div style={s.langSection}>
            <div style={s.langBadge}>🇲🇾 Bahasa Melayu (BM)</div>
            <div style={s.formGrid}>
              <div style={s.field}>
                <label style={s.label}>{form.source_language === 'bm' ? 'Tajuk' : 'Title'}</label>
                <input style={s.input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder={form.source_language === 'bm' ? 'Tajuk Video' : 'Video Title'} maxLength={150} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Nombor Susunan</label>
                <input style={s.input} type="number" min={1} step={1} value={form.order_num}
                  onChange={e => setForm({ ...form, order_num: e.target.value })}
                  placeholder={editing ? '1, 2, 3…' : 'Kosongkan untuk auto'} />
                <p style={s.hint}>{editing ? 'Nombor 1 = pertama.' : 'Kosong = hujung senarai.'}</p>
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>YouTube URL</label>
              <input style={s.input} value={form.youtube_url} onChange={e => setForm({ ...form, youtube_url: e.target.value })} required placeholder="https://youtu.be/..." maxLength={200} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{form.source_language === 'bm' ? 'Deskripsi' : 'Description'}</label>
              <textarea style={{ ...s.input, height: '70px', resize: 'vertical' }} value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} placeholder={form.source_language === 'bm' ? 'Deskripsi Pendek...' : 'Short description...'} maxLength={500} />
            </div>
          </div>

          {/* BI Section */}
          {form.manual_translation && (
          <div style={s.langSectionBi}>
            <div style={{ ...s.langBadge, background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}>
              🇬🇧 Bahasa Inggeris (BI) — <span style={{ fontWeight: 400 }}>kosongkan untuk terjemahan automatik</span>
            </div>
            <div style={s.field}>
              <label style={s.label}>{form.source_language === 'bm' ? 'Title (English)' : 'Tajuk (BM)'}</label>
              <input style={{ ...s.input, borderColor: '#bfdbfe' }} value={form.title_translation}
                onChange={e => setForm({ ...form, title_translation: e.target.value })} maxLength={150} placeholder={form.source_language === 'bm' ? 'Write English title' : 'Tulis tajuk BM'} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{form.source_language === 'bm' ? 'Description (English)' : 'Deskripsi (BM)'}</label>
              <textarea style={{ ...s.input, height: '70px', resize: 'vertical', borderColor: '#bfdbfe' }}
                value={form.description_translation} onChange={e => setForm({ ...form, description_translation: e.target.value })}
                maxLength={500} placeholder={form.source_language === 'bm' ? 'Write English description' : 'Tulis deskripsi BM'} />
            </div>
          </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button style={{ ...s.btnPrimary, opacity: translating ? 0.7 : 1 }} type="submit" disabled={translating}>
              {translating ? '⏳ Menerjemah...' : editing ? 'Update Video' : 'Tambah Video'}
            </button>
            {editing && <button style={s.btnSecondary} type="button" onClick={() => { setEditing(null); setForm(emptyForm); }}>Cancel</button>}
          </div>
        </form>
      </div>

      <div style={s.card}>
        <h2 style={s.cardTitle}>📹 List of Videos ({videos.length})</h2>
        {/* I added here */}
        <div style={s.filterBar}>
          <input
            style={s.input}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title or description..."
          />
          <select
            style={s.input}
            value={orderFilter}
            onChange={e => setOrderFilter(e.target.value)}
          >
            <option value="asc">Order: Ascending</option>
            <option value="desc">Order: Descending</option>
          </select>
        </div>

        {loading ? <p style={s.muted}>Loading...</p> : (
          <table style={s.table}>
            <thead><tr style={s.thead}>
              <th style={s.th}>#</th><th style={s.th}>Title</th><th style={s.th}>BI</th><th style={s.th}>Actions</th>
            </tr></thead>
            <tbody>
              {videos.map((v, i) => (
                <tr key={v.id} style={i % 2 === 0 ? s.trEven : {}}>
                  <td style={s.td}>{v.order_num}</td>
                  <td style={s.td} data-no-translate="true"><strong>{v.title}</strong><br /><span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{v.description?.slice(0, 50)}...</span></td>
                  <td style={s.td}>{v.title_bi ? <span style={s.biBadgeOk}>✓</span> : <span style={s.biBadgeMissing}>✗</span>}</td>
                  <td style={s.td}>
                    <button style={s.btnEdit} onClick={() => handleEdit(v)}>✏️ Edit</button>
                    <button style={s.btnDelete} onClick={() => handleDelete(v.id)}>🗑️ Delete</button>
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
