import { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ProfileSettings = ({ onClose }) => {
  const { admin, login } = useAuth();
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState({ name: admin?.name || '', email: admin?.email || '' });
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [msg, setMsg] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put('/admin/profile', profile);
      setMsg('✅ Profile updated successfully!');
      // Refresh admin info
      const res = await api.get('/auth/me');
      const token = localStorage.getItem('token');
      login(token, res.data.admin);
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Failed')); }
    setTimeout(() => setMsg(''), 3000);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      setMsg('❌ New passwords do not match!');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    try {
      await api.put('/admin/password', { current_password: passwords.current_password, new_password: passwords.new_password });
      setMsg('✅ Password changed successfully!');
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Failed')); }
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.avatar}>{admin?.name?.[0]?.toUpperCase()}</div>
            <div>
              <div style={s.adminName}>{admin?.name}</div>
              <div style={s.adminEmail}>{admin?.email}</div>
            </div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          <button style={{...s.tab, ...(tab === 'profile' ? s.tabActive : {})}} onClick={() => setTab('profile')}>👤 Profile</button>
          <button style={{...s.tab, ...(tab === 'password' ? s.tabActive : {})}} onClick={() => setTab('password')}>🔒 Password</button>
        </div>

        {msg && <div style={{...s.msg, ...(msg.includes('✅') ? s.success : s.error)}}>{msg}</div>}

        {/* Profile Tab */}
        {tab === 'profile' && (
          <form onSubmit={handleProfileUpdate} style={s.body}>
            <div style={s.field}>
              <label style={s.label}>Full Name</label>
              <input style={s.input} value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} required maxLength={80} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Email</label>
              <input style={s.input} type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} required maxLength={120} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Member Since</label>
              <input style={{...s.input, background:'#f8fafc', color:'#94a3b8'}} value={new Date(admin?.created_at).toLocaleDateString()} disabled />
            </div>
            <button style={s.btnPrimary} type="submit">💾 Save Changes</button>
          </form>
        )}

        {/* Password Tab */}
        {tab === 'password' && (
          <form onSubmit={handlePasswordChange} style={s.body}>
            <div style={s.field}>
              <label style={s.label}>Current Password</label>
              <div style={s.passWrap}>
                <input style={{...s.input, flex:1}} type={showPass ? 'text' : 'password'} value={passwords.current_password} onChange={e => setPasswords({...passwords, current_password: e.target.value})} required placeholder="Enter current password" maxLength={128} />
                <button type="button" style={s.eyeBtn} onClick={() => setShowPass(!showPass)}>{showPass ? '🙈' : '👁️'}</button>
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>New Password</label>
              <input style={s.input} type={showPass ? 'text' : 'password'} value={passwords.new_password} onChange={e => setPasswords({...passwords, new_password: e.target.value})} required placeholder="Min 6 characters" minLength={6} maxLength={128} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Confirm New Password</label>
              <input style={s.input} type={showPass ? 'text' : 'password'} value={passwords.confirm_password} onChange={e => setPasswords({...passwords, confirm_password: e.target.value})} required placeholder="Repeat new password" maxLength={128} />
              {passwords.new_password && passwords.confirm_password && passwords.new_password !== passwords.confirm_password && (
                <p style={{color:'#e11d48', fontSize:'0.78rem', margin:'0.25rem 0 0'}}>⚠️ Passwords do not match</p>
              )}
            </div>
            <button style={s.btnPrimary} type="submit">🔒 Change Password</button>
          </form>
        )}

      </div>
    </div>
  );
};

const s = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, padding:'1rem' },
  modal: { background:'#fff', borderRadius:'20px', width:'100%', maxWidth:'440px', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.25rem 1.5rem', borderBottom:'1px solid #f1f5f9' },
  headerLeft: { display:'flex', alignItems:'center', gap:'0.75rem' },
  avatar: { width:'48px', height:'48px', borderRadius:'50%', background:'#1e3a5f', color:'#FFD700', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', fontSize:'1.3rem' },
  adminName: { fontWeight:'700', color:'#1e3a5f', fontSize:'1rem' },
  adminEmail: { color:'#64748b', fontSize:'0.82rem' },
  closeBtn: { background:'#f1f5f9', border:'none', borderRadius:'8px', width:'32px', height:'32px', cursor:'pointer', fontSize:'1rem', fontWeight:'700', color:'#64748b' },
  tabs: { display:'flex', gap:'0', borderBottom:'1px solid #f1f5f9' },
  tab: { flex:1, padding:'0.75rem', background:'transparent', border:'none', cursor:'pointer', fontWeight:'600', fontSize:'0.88rem', color:'#64748b', borderBottom:'2px solid transparent' },
  tabActive: { color:'#2563eb', borderBottom:'2px solid #2563eb' },
  msg: { margin:'0.75rem 1.5rem 0', padding:'0.6rem 0.9rem', borderRadius:'8px', fontSize:'0.88rem' },
  success: { background:'#f0fdf4', color:'#16a34a' },
  error: { background:'#fff1f2', color:'#e11d48' },
  body: { padding:'1.25rem 1.5rem 1.5rem', display:'flex', flexDirection:'column', gap:'0' },
  field: { marginBottom:'1rem' },
  label: { display:'block', fontSize:'0.85rem', fontWeight:'600', color:'#475569', marginBottom:'0.4rem' },
  input: { width:'100%', padding:'0.65rem 0.9rem', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'0.95rem', outline:'none', boxSizing:'border-box' },
  passWrap: { display:'flex', gap:'0.5rem', alignItems:'center' },
  eyeBtn: { background:'#f1f5f9', border:'none', borderRadius:'8px', padding:'0.65rem 0.75rem', cursor:'pointer', fontSize:'1rem', flexShrink:0 },
  btnPrimary: { background:'#2563eb', color:'#fff', border:'none', borderRadius:'8px', padding:'0.75rem', fontWeight:'700', cursor:'pointer', fontSize:'0.95rem', marginTop:'0.25rem' },
};

export default ProfileSettings;
