import { useState, useEffect } from 'react';
import api from '../services/api';

const ManageVideos = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', youtube_url: '', order_num: '' });
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');

  const fetchVideos = () => {
    api.get('/videos').then(res => setVideos(res.data.videos)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchVideos(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/videos/${editing}`, form);
        setMsg('✅ Video updated!');
      } else {
        await api.post('/videos', form);
        setMsg('✅ Video added!');
      }
      setForm({ title: '', description: '', youtube_url: '', order_num: '' });
      setEditing(null);
      fetchVideos();
    } catch (err) {
      setMsg('❌ Error: ' + (err.response?.data?.error || 'Failed'));
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleEdit = (video) => {
    setEditing(video.id);
    setForm({ title: video.title, description: video.description, youtube_url: video.youtube_url, order_num: video.order_num });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this video?')) return;
    await api.delete(`/videos/${id}`);
    fetchVideos();
  };

  return (
    <div>
      <div style={s.card}>
        <h2 style={s.cardTitle}>{editing ? '✏️ Edit Video' : '➕ Add New Video'}</h2>
        {msg && <div style={msg.includes('✅') ? s.success : s.error}>{msg}</div>}
        <form onSubmit={handleSubmit}>
          <div style={s.formGrid}>
            <div style={s.field}>
              <label style={s.label}>Title</label>
              <input style={s.input} value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="Video title" maxLength={150} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Order Number</label>
              <input style={s.input} type="number" value={form.order_num} onChange={e => setForm({...form, order_num: e.target.value})} placeholder="1, 2, 3..." />
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>YouTube URL</label>
            <input style={s.input} value={form.youtube_url} onChange={e => setForm({...form, youtube_url: e.target.value})} required placeholder="https://youtu.be/..." maxLength={200} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Description</label>
            <textarea style={{...s.input, height:'80px', resize:'vertical'}} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Short description..." maxLength={500} />
          </div>
          <div style={{display:'flex', gap:'0.75rem'}}>
            <button style={s.btnPrimary} type="submit">{editing ? 'Update Video' : 'Add Video'}</button>
            {editing && <button style={s.btnSecondary} type="button" onClick={() => { setEditing(null); setForm({ title:'', description:'', youtube_url:'', order_num:'' }); }}>Cancel</button>}
          </div>
        </form>
      </div>

      <div style={s.card}>
        <h2 style={s.cardTitle}>📹 All Videos ({videos.length})</h2>
        {loading ? <p style={s.muted}>Loading...</p> : (
          <table style={s.table}>
            <thead><tr style={s.thead}>
              <th style={s.th}>#</th>
              <th style={s.th}>Title</th>
              <th style={s.th}>Description</th>
              <th style={s.th}>Actions</th>
            </tr></thead>
            <tbody>
              {videos.map((v, i) => (
                <tr key={v.id} style={i % 2 === 0 ? s.trEven : {}}>
                  <td style={s.td}>{v.order_num}</td>
                  <td style={s.td}><strong>{v.title}</strong></td>
                  <td style={s.td}>{v.description?.slice(0, 60)}...</td>
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
  card: { background:'#fff', borderRadius:'16px', padding:'1.5rem', marginBottom:'1.5rem', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize:'1.1rem', fontWeight:'700', color:'#1e3a5f', margin:'0 0 1.25rem' },
  formGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' },
  field: { marginBottom:'1rem' },
  label: { display:'block', fontSize:'0.85rem', fontWeight:'600', color:'#475569', marginBottom:'0.4rem' },
  input: { width:'100%', padding:'0.65rem 0.9rem', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'0.95rem', outline:'none', boxSizing:'border-box' },
  btnPrimary: { background:'#2563eb', color:'#fff', border:'none', borderRadius:'8px', padding:'0.65rem 1.5rem', fontWeight:'600', cursor:'pointer', fontSize:'0.9rem' },
  btnSecondary: { background:'#f1f5f9', color:'#475569', border:'none', borderRadius:'8px', padding:'0.65rem 1.5rem', fontWeight:'600', cursor:'pointer', fontSize:'0.9rem' },
  success: { background:'#f0fdf4', color:'#16a34a', padding:'0.75rem 1rem', borderRadius:'8px', marginBottom:'1rem', fontSize:'0.9rem' },
  error: { background:'#fff1f2', color:'#e11d48', padding:'0.75rem 1rem', borderRadius:'8px', marginBottom:'1rem', fontSize:'0.9rem' },
  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background:'#f8fafc' },
  th: { padding:'0.75rem 1rem', textAlign:'left', fontSize:'0.82rem', fontWeight:'600', color:'#64748b', borderBottom:'1px solid #e2e8f0' },
  td: { padding:'0.75rem 1rem', fontSize:'0.88rem', color:'#334155', borderBottom:'1px solid #f1f5f9', verticalAlign:'middle' },
  trEven: { background:'#fafafa' },
  btnEdit: { background:'#eff6ff', color:'#2563eb', border:'none', borderRadius:'6px', padding:'0.35rem 0.75rem', cursor:'pointer', marginRight:'0.5rem', fontSize:'0.82rem', fontWeight:'600' },
  btnDelete: { background:'#fff1f2', color:'#e11d48', border:'none', borderRadius:'6px', padding:'0.35rem 0.75rem', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600' },
  muted: { color:'#94a3b8', fontSize:'0.9rem' },
};

export default ManageVideos;
