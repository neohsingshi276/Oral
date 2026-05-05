import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

// API_BASE removed — images now stored as Base64 in DB, no URL prefix needed
import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const ManageFacts = () => {
  const [facts, setFacts] = useState([]);
  const [form, setForm] = useState({ title: '', content: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const fileRef = useRef();

  const fetchFacts = () => api.get('/facts').then(res => setFacts(res.data.facts));
  useEffect(() => { fetchFacts(); }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('content', form.content);
      if (imageFile) formData.append('image', imageFile);

      if (editing) {
        await api.put(`/facts/${editing}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setMsg('✅ Fakta berjaya dikemas kini!');
      } else {
        await api.post('/facts', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setMsg('✅ Fakta berjaya ditambah!');
      }
      resetForm();
      fetchFacts();
    } catch (err) {
      setMsg('❌ Ralat: ' + (err.response?.data?.error || 'Gagal'));
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const resetForm = () => {
    setForm({ title: '', content: '' });
    setImageFile(null);
    setImagePreview(null);
    setEditing(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleEdit = (fact) => {
    setEditing(fact.id);
    setForm({ title: fact.title, content: fact.content });
    setImagePreview(fact.image_url || null);
    setImageFile(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Padam fakta ini?')) return;
    await api.delete(`/facts/${id}`);
    fetchFacts();
  };

  return (
    <div>
      <div style={s.card}>
        <h2 style={s.cardTitle}>{editing ? '✏️ Edit Fakta' : '➕ Tambah Fakta Baru'}</h2>
        {msg && <div style={msg.includes('✅') ? s.success : s.error}>{msg}</div>}
        <form onSubmit={handleSubmit}>
          <div style={s.field}>
            <label style={s.label}>Tajuk</label>
            <input
              style={s.input}
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              required
              maxLength={120}
              placeholder="Contoh: Gigi anda unik!"
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Kandungan</label>
            <textarea
              style={{ ...s.input, height: '100px', resize: 'vertical' }}
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              required
              maxLength={1000}
              placeholder="Tulis fakta penuh di sini..."
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Imej (pilihan)</label>
            <div style={s.uploadArea} onClick={() => fileRef.current.click()}>
              {imagePreview ? (
                <div style={s.previewWrap}>
                  <img src={imagePreview} alt="preview" style={s.previewImg} />
                  <div style={s.previewOverlay}>
                    <span>Klik untuk tukar imej</span>
                  </div>
                </div>
              ) : (
                <div style={s.uploadPlaceholder}>
                  <div style={s.uploadIcon}>🖼️</div>
                  <p style={s.uploadText}>Klik untuk muat naik imej</p>
                  <p style={s.uploadHint}>JPG, PNG, GIF, WEBP — maks 5MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
            {imagePreview && (
              <button
                type="button"
                style={s.removeImgBtn}
                onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ''; }}
              >
                ✕ Buang imej
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button style={s.btnPrimary} type="submit">
              {editing ? 'Kemas Kini Fakta' : 'Tambah Fakta'}
            </button>
            {editing && (
              <button style={s.btnSecondary} type="button" onClick={resetForm}>Batal</button>
            )}
          </div>
        </form>
      </div>

      <div style={s.card}>
        <h2 style={s.cardTitle}>💡 Semua Fakta ({facts.length})</h2>
        <div style={s.factsList}>
          {facts.map((fact) => (
            <div key={fact.id} style={s.factItem}>
              {fact.image_url && (
                <img
                  src={fact.image_url}
                  alt={fact.title}
                  style={s.factImg}
                  onError={e => e.target.style.display = 'none'}
                />
              )}
              <div style={s.factContent}>
                <h4 style={s.factTitle}>{fact.title}</h4>
                <p style={s.factText}>{fact.content?.slice(0, 100)}...</p>
                {!fact.image_url && <span style={s.noImgBadge}>Tiada imej</span>}
              </div>
              <div style={s.factActions}>
                <button style={s.btnEdit} onClick={() => handleEdit(fact)}>✏️ Edit</button>
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
  field: { marginBottom: '1rem' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' },
  input: { width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', color: '#1e293b' },
  uploadArea: { border: '2px dashed #cbd5e1', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', minHeight: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', transition: 'border-color 0.2s' },
  uploadPlaceholder: { textAlign: 'center', padding: '2rem' },
  uploadIcon: { fontSize: '2.5rem', marginBottom: '0.5rem' },
  uploadText: { color: '#475569', fontWeight: '600', margin: '0 0 0.25rem', fontSize: '0.95rem' },
  uploadHint: { color: '#94a3b8', fontSize: '0.82rem', margin: 0 },
  previewWrap: { position: 'relative', width: '100%' },
  previewImg: { width: '100%', height: '180px', objectFit: 'cover', display: 'block' },
  previewOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '600', fontSize: '0.9rem', opacity: 0, transition: 'opacity 0.2s' },
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
  factText: { fontSize: '0.85rem', color: '#64748b', margin: 0 },
  noImgBadge: { background: '#f1f5f9', color: '#94a3b8', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '6px', marginTop: '0.25rem', display: 'inline-block' },
  factActions: { display: 'flex', gap: '0.5rem', flexShrink: 0 },
  btnEdit: { background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' },
  btnDelete: { background: '#fff1f2', color: '#e11d48', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' },
  muted: { color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' },
};

export default ManageFacts;
