import { useState, useEffect } from 'react';
import api from '../services/api';

const ManageAdmins = ({ currentAdmin }) => {
  const [admins, setAdmins] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [schools, setSchools] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Invite form
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('admin');
  const [inviteSchool, setInviteSchool] = useState('');

  // New school form
  const [newSchoolName, setNewSchoolName] = useState('');
  const [schoolMsg, setSchoolMsg] = useState('');
  const [schoolLoading, setSchoolLoading] = useState(false);

  // Active tab for admin list view
  const [activeSchoolTab, setActiveSchoolTab] = useState('__all__');

  const fetchAll = async () => {
    const [adminsRes, schoolsRes] = await Promise.all([
      api.get('/admin/admins'),
      api.get('/schools'),
    ]);
    setAdmins(adminsRes.data.admins || []);
    setPendingInvites(adminsRes.data.pending_invites || []);
    setSchools(schoolsRes.data.schools || []);
  };

  useEffect(() => { fetchAll(); }, []);

  const showMsg = (text, duration = 4000) => {
    setMsg(text);
    setTimeout(() => setMsg(''), duration);
  };

  // ── Invite ──────────────────────────────────────────────────────────────────
  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/admin/invite', { email, role: inviteRole, school: inviteSchool });
      showMsg('✅ ' + res.data.message);
      setEmail(''); setInviteRole('admin'); setInviteSchool('');
      fetchAll();
    } catch (err) { showMsg('❌ ' + (err.response?.data?.error || 'Gagal menghantar jemputan')); }
    finally { setLoading(false); }
  };

  const handleResend = async (id) => {
    try { const res = await api.post(`/admin/invitations/${id}/resend`); showMsg('✅ ' + res.data.message); fetchAll(); }
    catch (err) { showMsg('❌ ' + (err.response?.data?.error || 'Gagal menghantar semula')); }
  };

  const handleCancel = async (id) => {
    if (!confirm('Batalkan jemputan ini?')) return;
    try { await api.delete(`/admin/invitations/${id}`); fetchAll(); }
    catch (err) { alert(err.response?.data?.error || 'Gagal'); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Keluarkan pentadbir "${name}"? Tindakan ini tidak boleh dibatalkan!`)) return;
    try { await api.delete(`/admin/admins/${id}`); fetchAll(); }
    catch (err) { alert(err.response?.data?.error || 'Gagal'); }
  };

  const handleRoleChange = async (id, newRole) => {
    try { const res = await api.put(`/admin/admins/${id}/role`, { role: newRole }); showMsg('✅ ' + res.data.message); fetchAll(); }
    catch (err) { showMsg('❌ ' + (err.response?.data?.error || 'Gagal menukar peranan')); }
  };

  // ── School management ────────────────────────────────────────────────────────
  const handleAddSchool = async (e) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;
    setSchoolLoading(true);
    try {
      const res = await api.post('/schools', { school_name: newSchoolName.trim() });
      setSchoolMsg('✅ ' + res.data.message);
      setNewSchoolName('');
      fetchAll();
    } catch (err) { setSchoolMsg('❌ ' + (err.response?.data?.error || 'Gagal')); }
    finally { setSchoolLoading(false); setTimeout(() => setSchoolMsg(''), 4000); }
  };

  const handleDeleteSchool = async (school) => {
    if (!confirm(`Padam sekolah "${school.school_name}"?\n\nAmaran: Ini akan memadamkan semua kelas dan sesi yang berkaitan!`)) return;
    try { await api.delete(`/schools/${school.id}`); fetchAll(); showMsg('✅ Sekolah dipadam'); }
    catch (err) { showMsg('❌ ' + (err.response?.data?.error || 'Gagal')); }
  };

  // ── Grouped admin list ───────────────────────────────────────────────────────
  const groupedBySchool = admins.reduce((acc, a) => {
    const key = a.school || '__none__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  const schoolTabs = [
    { key: '__all__', label: '🌐 Semua' },
    ...schools.map(s => ({ key: s.school_name, label: `🏫 ${s.school_name}` })),
    ...(groupedBySchool['__none__'] ? [{ key: '__none__', label: '❓ Tiada Sekolah' }] : []),
  ];

  const displayedAdmins = activeSchoolTab === '__all__'
    ? admins
    : (groupedBySchool[activeSchoolTab] || []);

  return (
    <div>

      {/* ── School Management ── */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>🏫 Urus Sekolah</h2>
        <p style={s.hint}>Tambah sekolah baharu. Sekolah digunakan semasa menjemput pentadbir/guru dan mencipta sesi.</p>

        {schoolMsg && <div style={schoolMsg.includes('✅') ? s.success : s.error}>{schoolMsg}</div>}

        <form onSubmit={handleAddSchool} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={s.label}>Nama Sekolah Baharu</label>
            <input
              style={s.input}
              value={newSchoolName}
              onChange={e => setNewSchoolName(e.target.value)}
              placeholder="cth. SK Taman Mutiara"
              maxLength={200}
              required
            />
          </div>
          <button style={s.btnPrimary} type="submit" disabled={schoolLoading}>
            {schoolLoading ? 'Menambah...' : '➕ Tambah Sekolah'}
          </button>
        </form>

        {schools.length === 0 ? (
          <p style={s.muted}>Tiada sekolah lagi. Tambah sekolah pertama di atas.</p>
        ) : (
          <div style={s.schoolGrid}>
            {schools.map(sc => (
              <div key={sc.id} style={s.schoolPill}>
                <span>🏫 {sc.school_name}</span>
                {currentAdmin?.role === 'main_admin' && (
                  <button style={s.pillDelete} onClick={() => handleDeleteSchool(sc)} title="Padam sekolah">✕</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Invite ── */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>✉️ Jemput Pentadbir / Guru Baru</h2>
        <p style={s.hint}>Masukkan e-mel, pilih peranan, dan tetapkan sekolah. Mereka akan menerima pautan untuk sediakan akaun.</p>
        {msg && <div style={msg.includes('✅') ? s.success : s.error}>{msg}</div>}

        <form onSubmit={handleInvite}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={s.label}>Alamat E-mel</label>
              <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="guru@sekolah.com" maxLength={120} required />
            </div>
            <div>
              <label style={s.label}>Peranan</label>
              <select style={s.input} value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                <option value="admin">🛡️ Pentadbir (Admin)</option>
                <option value="teacher">👩‍🏫 Guru (Teacher)</option>
              </select>
            </div>
            <div>
              <label style={s.label}>Sekolah</label>
              <select style={s.input} value={inviteSchool} onChange={e => setInviteSchool(e.target.value)}>
                <option value="">-- Pilih Sekolah (pilihan) --</option>
                {schools.map(sc => <option key={sc.id} value={sc.school_name}>{sc.school_name}</option>)}
              </select>
              {schools.length === 0 && <div style={{ fontSize: '0.75rem', color: '#e11d48', marginTop: '3px' }}>Tambah sekolah dahulu di atas.</div>}
            </div>
          </div>
          <button style={s.btnPrimary} type="submit" disabled={loading}>
            {loading ? 'Menghantar...' : '📧 Hantar Jemputan'}
          </button>
        </form>
      </div>

      {/* ── Pending Invites ── */}
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
                    <span style={{ ...s.roleBadge, background: invite.role === 'teacher' ? '#D4A843' : '#2563eb' }}>
                      {invite.role === 'teacher' ? '👩‍🏫 Guru' : '🛡️ Pentadbir'}
                    </span>
                    {invite.school && <span style={s.schoolTag}>🏫 {invite.school}</span>}
                    · Dihantar {new Date(invite.created_at).toLocaleDateString()}
                    · Tamat {new Date(invite.expires_at).toLocaleDateString()}
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

      {/* ── Admin List grouped by school ── */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>👨‍💼 Semua Pentadbir & Guru ({admins.length})</h2>

        {/* School filter tabs */}
        <div style={s.tabRow}>
          {schoolTabs.map(tab => (
            <button
              key={tab.key}
              style={activeSchoolTab === tab.key ? s.tabActive : s.tab}
              onClick={() => setActiveSchoolTab(tab.key)}
            >
              {tab.label}
              <span style={s.tabCount}>
                {tab.key === '__all__' ? admins.length : (groupedBySchool[tab.key] || []).length}
              </span>
            </button>
          ))}
        </div>

        <div style={s.adminList}>
          {displayedAdmins.length === 0 && <p style={s.muted}>Tiada pentadbir untuk sekolah ini.</p>}
          {displayedAdmins.map(admin => (
            <div key={admin.id} style={s.adminItem}>
              <div style={s.adminAvatar}>{admin.name?.[0]?.toUpperCase()}</div>
              <div style={s.adminInfo}>
                <div style={s.adminName}>
                  {admin.name}
                  {admin.id === currentAdmin?.id && <span style={s.youBadge}>Anda</span>}
                  <span style={{ ...s.roleBadge, background: admin.role === 'main_admin' ? '#7c3aed' : admin.role === 'teacher' ? '#D4A843' : '#2563eb' }}>
                    {admin.role === 'main_admin' ? '⭐ Pentadbir Utama' : admin.role === 'teacher' ? '👩‍🏫 Guru' : '🛡️ Pentadbir'}
                  </span>
                </div>
                <div style={s.adminEmail}>{admin.email}</div>
                <div style={s.adminMeta}>
                  {admin.school
                    ? <span style={s.schoolTag}>🏫 {admin.school}</span>
                    : <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Tiada sekolah ditetapkan</span>
                  }
                  <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>· Sertai {new Date(admin.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {currentAdmin?.role === 'main_admin' && admin.id !== currentAdmin?.id && admin.role !== 'main_admin' && (
                <>
                  <div style={s.roleChangeWrap}>
                    <select style={s.roleSelect} value={admin.role} onChange={e => handleRoleChange(admin.id, e.target.value)}>
                      <option value="admin">Pentadbir</option>
                      <option value="teacher">Guru</option>
                    </select>
                  </div>
                  <button style={s.btnDelete} onClick={() => handleDelete(admin.id, admin.name)}>🗑️</button>
                </>
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
  btnDelete: { background: '#fff1f2', color: '#e11d48', border: 'none', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem', flexShrink: 0 },
  success: { background: '#f0fdf4', color: '#16a34a', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  error: { background: '#fff1f2', color: '#e11d48', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  muted: { color: '#94a3b8', fontSize: '0.88rem', margin: '0.5rem 0' },
  // Schools
  schoolGrid: { display: 'flex', flexWrap: 'wrap', gap: '0.6rem' },
  schoolPill: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a5f', borderRadius: '999px', padding: '0.35rem 0.9rem', fontSize: '0.85rem', fontWeight: '600' },
  pillDelete: { background: 'none', border: 'none', color: '#e11d48', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', padding: '0 2px', lineHeight: 1 },
  // Tabs
  tabRow: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem', marginTop: '0.5rem' },
  tab: { background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' },
  tabActive: { background: '#2563eb', color: '#fff', border: '1px solid #2563eb', borderRadius: '8px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' },
  tabCount: { background: 'rgba(255,255,255,0.25)', borderRadius: '999px', padding: '0 0.4rem', fontSize: '0.72rem', fontWeight: '800' },
  // Invite list
  inviteList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  inviteItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: '#fff9ee', borderRadius: '10px', border: '1px solid #fde68a', flexWrap: 'wrap' },
  inviteIcon: { fontSize: '1.5rem' },
  inviteInfo: { flex: 1, minWidth: '150px' },
  inviteEmail: { fontWeight: '600', color: '#1e3a5f', fontSize: '0.92rem' },
  inviteMeta: { color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' },
  pendingBadge: { background: '#fef9ee', color: '#b45309', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600', whiteSpace: 'nowrap' },
  schoolTag: { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '0.15rem 0.5rem', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' },
  // Admin list
  adminList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  adminItem: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#fafafa', borderRadius: '12px', border: '1px solid #f1f5f9', flexWrap: 'wrap' },
  adminAvatar: { width: '44px', height: '44px', borderRadius: '50%', background: '#1e3a5f', color: '#FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.2rem', flexShrink: 0 },
  adminInfo: { flex: 1, minWidth: '180px' },
  adminName: { fontWeight: '700', color: '#1e3a5f', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  youBadge: { background: '#2563eb', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '6px', fontWeight: '700' },
  roleBadge: { color: '#fff', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: '700' },
  adminEmail: { color: '#64748b', fontSize: '0.85rem', margin: '0.15rem 0' },
  adminMeta: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.15rem' },
  roleChangeWrap: { flexShrink: 0 },
  roleSelect: { padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '600', color: '#1e3a5f', cursor: 'pointer', background: '#f8fafc', outline: 'none' },
};

export default ManageAdmins;
