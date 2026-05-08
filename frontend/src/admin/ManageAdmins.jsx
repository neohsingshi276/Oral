import { useState, useEffect } from 'react';
import api from '../services/api';

const ManageAdmins = ({ currentAdmin }) => {
  const [admins, setAdmins] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('admin');
  const [inviteSchool, setInviteSchool] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAdmins = () => api.get('/admin/admins').then(res => {
    setAdmins(res.data.admins);
    setPendingInvites(res.data.pending_invites || []);
  });

  useEffect(() => { fetchAdmins(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/admin/invite', { email, role: inviteRole, school: inviteRole === 'teacher' ? inviteSchool : undefined });
      setMsg('✅ ' + res.data.message);
      setEmail('');
      setInviteRole('admin');
      setInviteSchool('');
      fetchAdmins();
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Gagal menghantar jemputan')); }
    finally { setLoading(false); setTimeout(() => setMsg(''), 4000); }
  };

  const handleResend = async (id) => {
    try {
      const res = await api.post(`/admin/invitations/${id}/resend`);
      setMsg('✅ ' + res.data.message);
      fetchAdmins();
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Gagal menghantar semula')); }
    finally { setTimeout(() => setMsg(''), 4000); }
  };

  const handleCancel = async (id) => {
    if (!confirm('Batalkan jemputan ini?')) return;
    try {
      await api.delete(`/admin/invitations/${id}`);
      fetchAdmins();
    } catch (err) { alert(err.response?.data?.error || 'Gagal'); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Keluarkan pentadbir "${name}"? Tindakan ini tidak boleh dibatalkan!`)) return;
    try {
      await api.delete(`/admin/admins/${id}`);
      fetchAdmins();
    } catch (err) { alert(err.response?.data?.error || 'Gagal'); }
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      const res = await api.put(`/admin/admins/${id}/role`, { role: newRole });
      setMsg('✅ ' + res.data.message);
      fetchAdmins();
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Gagal menukar peranan')); }
    finally { setTimeout(() => setMsg(''), 4000); }
  };

  return (
    <div>
      <div style={s.card}>
        <h2 style={s.cardTitle}>✉️ Jemput Pentadbir / Guru Baru</h2>
        <p style={s.hint}>Masukkan alamat e-mel orang yang ingin anda jemput. Mereka akan menerima e-mel dengan pautan untuk menyediakan akaun mereka.</p>
        {msg && <div style={msg.includes('✅') ? s.success : s.error}>{msg}</div>}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={s.label}>Alamat E-mel</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="guru@sekolah.com" maxLength={120} />
          </div>
          <div style={{ minWidth: '140px' }}>
            <label style={s.label}>Peranan</label>
            <select style={s.input} value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
              <option value="admin">Pentadbir</option>
              <option value="teacher">Guru</option>
            </select>
          </div>
          {inviteRole === 'teacher' && (
            <div style={{ minWidth: '180px' }}>
              <label style={s.label}>Sekolah</label>
              <input style={s.input} value={inviteSchool} onChange={e => setInviteSchool(e.target.value)} placeholder="Nama Sekolah" maxLength={255} />
            </div>
          )}
          <button style={s.btnPrimary} onClick={handleInvite} disabled={loading}>
            {loading ? 'Menghantar...' : '📧 Hantar Jemputan'}
          </button>
        </div>
      </div>

      {pendingInvites.length > 0 && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>⏳ Jemputan Tertangguh ({pendingInvites.length})</h2>
          <div style={s.inviteList}>
            {pendingInvites.map(invite => (
              <div key={invite.id} style={s.inviteItem}>
                <div style={s.inviteIcon}>✉️</div>
                <div style={s.inviteInfo}>
                  <div style={s.inviteEmail}>{invite.email}</div>
                  <div style={s.inviteMeta}>
                    Dihantar {new Date(invite.created_at).toLocaleDateString()} ·
                    Tamat tempoh {new Date(invite.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <span style={s.pendingBadge}>⏳ Tertangguh</span>
                <button style={s.btnResend} onClick={() => handleResend(invite.id)}>📧 Hantar Semula</button>
                {currentAdmin?.role === 'main_admin' && (
                  <button style={s.btnCancel} onClick={() => handleCancel(invite.id)}>✕ Batal</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={s.card}>
        <h2 style={s.cardTitle}>👨‍💼 Semua Pentadbir ({admins.length})</h2>
        <div style={s.adminList}>
          {admins.map(admin => (
            <div key={admin.id} style={s.adminItem}>
              <div style={s.adminAvatar}>{admin.name?.[0]?.toUpperCase()}</div>
              <div style={s.adminInfo}>
                <div style={s.adminName}>
                  {admin.name}
                  {admin.id === currentAdmin?.id && <span style={s.youBadge}>Anda</span>}
                  <span style={{ ...s.roleBadge, background: admin.role === 'main_admin' ? '#7c3aed' : admin.role === 'teacher' ? '#D4A843' : '#2563eb' }}>
                    {admin.role === 'main_admin' ? '⭐ Pentadbir Utama' : admin.role === 'teacher' ? '👩‍🏫 Guru' : 'Pentadbir'}
                  </span>
                </div>
                <div style={s.adminEmail}>{admin.email}</div>
                <div style={s.adminDate}>Sertai {new Date(admin.created_at).toLocaleDateString()}</div>
                {admin.school && <div style={{ color: '#16a34a', fontSize: '0.78rem', fontWeight: '600' }}>🏫 {admin.school}</div>}
              </div>
              {/* Role change dropdown — only main_admin can see, and only for non-main_admin users */}
              {currentAdmin?.role === 'main_admin' && admin.id !== currentAdmin?.id && admin.role !== 'main_admin' && (
                <div style={s.roleChangeWrap}>
                  <select
                    style={s.roleSelect}
                    value={admin.role}
                    onChange={e => handleRoleChange(admin.id, e.target.value)}
                  >
                    <option value="admin">Pentadbir</option>
                    <option value="teacher">Guru</option>
                  </select>
                </div>
              )}
              {currentAdmin?.role === 'main_admin' && admin.id !== currentAdmin?.id && admin.role !== 'main_admin' && (
                <button style={s.btnDelete} onClick={() => handleDelete(admin.id, admin.name)}>🗑️ Keluarkan</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const s = {
  card: { background: '#fff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: '1.1rem', fontWeight: '700', color: '#1e3a5f', margin: '0 0 0.5rem' },
  hint: { color: '#64748b', fontSize: '0.88rem', margin: '0 0 1.25rem' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' },
  input: { width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' },
  btnPrimary: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.65rem 1.5rem', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap' },
  btnResend: { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', whiteSpace: 'nowrap' },
  btnCancel: { background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '8px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', whiteSpace: 'nowrap' },
  success: { background: '#f0fdf4', color: '#16a34a', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  error: { background: '#fff1f2', color: '#e11d48', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  inviteList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  inviteItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: '#fff9ee', borderRadius: '10px', border: '1px solid #fde68a', flexWrap: 'wrap' },
  inviteIcon: { fontSize: '1.5rem' },
  inviteInfo: { flex: 1, minWidth: '150px' },
  inviteEmail: { fontWeight: '600', color: '#1e3a5f', fontSize: '0.92rem' },
  inviteMeta: { color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.1rem' },
  pendingBadge: { background: '#fef9ee', color: '#b45309', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600', whiteSpace: 'nowrap' },
  adminList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  adminItem: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#fafafa', borderRadius: '12px', border: '1px solid #f1f5f9' },
  adminAvatar: { width: '44px', height: '44px', borderRadius: '50%', background: '#1e3a5f', color: '#FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.2rem', flexShrink: 0 },
  adminInfo: { flex: 1 },
  adminName: { fontWeight: '700', color: '#1e3a5f', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  youBadge: { background: '#2563eb', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '6px', fontWeight: '700' },
  roleBadge: { color: '#fff', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '6px', fontWeight: '700' },
  adminEmail: { color: '#64748b', fontSize: '0.85rem', margin: '0.15rem 0' },
  adminDate: { color: '#94a3b8', fontSize: '0.78rem' },
  btnDelete: { background: '#fff1f2', color: '#e11d48', border: 'none', borderRadius: '8px', padding: '0.5rem 0.9rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem', flexShrink: 0 },
  roleChangeWrap: { flexShrink: 0 },
  roleSelect: { padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '600', color: '#1e3a5f', cursor: 'pointer', background: '#f8fafc', outline: 'none' },
};

export default ManageAdmins;