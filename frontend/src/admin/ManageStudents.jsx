import { useState, useEffect } from 'react';
import api from '../services/api';

const ManageStudents = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/admin/players')
      .then(res => setPlayers(res.data.players))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = players.filter(p =>
    p.nickname?.toLowerCase().includes(search.toLowerCase()) ||
    p.session_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={s.card}>
        <div style={s.topRow}>
          <h2 style={s.cardTitle}>👥 All Players ({players.length})</h2>
          <input style={s.search} placeholder="🔍 Search players..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {loading ? <p style={s.muted}>Loading...</p> : (
          <table style={s.table}>
            <thead><tr style={s.thead}>
              <th style={s.th}>Nickname</th>
              <th style={s.th}>Session</th>
              <th style={s.th}>CP1</th>
              <th style={s.th}>CP2</th>
              <th style={s.th}>CP3</th>
              <th style={s.th}>Joined</th>
            </tr></thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} style={i % 2 === 0 ? s.trEven : {}}>
                  <td style={s.td}><strong>{p.nickname}</strong></td>
                  <td style={s.td}>{p.session_name || '—'}</td>
                  <td style={s.td}><span style={p.cp1_completed ? s.badgeGreen : s.badgeGray}>{p.cp1_completed ? '✅' : '—'}</span></td>
                  <td style={s.td}><span style={p.cp2_completed ? s.badgeGreen : s.badgeGray}>{p.cp2_completed ? '✅' : '—'}</span></td>
                  <td style={s.td}><span style={p.cp3_completed ? s.badgeGreen : s.badgeGray}>{p.cp3_completed ? '✅' : '—'}</span></td>
                  <td style={s.td}>{new Date(p.joined_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="6" style={{...s.td, textAlign:'center', color:'#94a3b8'}}>No players found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const s = {
  card: { background:'#fff', borderRadius:'16px', padding:'1.5rem', marginBottom:'1.5rem', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  topRow: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem', flexWrap:'wrap', gap:'1rem' },
  cardTitle: { fontSize:'1.1rem', fontWeight:'700', color:'#1e3a5f', margin:0 },
  search: { padding:'0.5rem 1rem', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'0.9rem', outline:'none', width:'220px' },
  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background:'#f8fafc' },
  th: { padding:'0.75rem 1rem', textAlign:'left', fontSize:'0.82rem', fontWeight:'600', color:'#64748b', borderBottom:'1px solid #e2e8f0' },
  td: { padding:'0.75rem 1rem', fontSize:'0.88rem', color:'#334155', borderBottom:'1px solid #f1f5f9', verticalAlign:'middle' },
  trEven: { background:'#fafafa' },
  badgeGreen: { background:'#f0fdf4', color:'#16a34a', padding:'0.2rem 0.5rem', borderRadius:'6px', fontSize:'0.8rem', fontWeight:'600' },
  badgeGray: { background:'#f1f5f9', color:'#94a3b8', padding:'0.2rem 0.5rem', borderRadius:'6px', fontSize:'0.8rem' },
  muted: { color:'#94a3b8', fontSize:'0.9rem' },
};

export default ManageStudents;
