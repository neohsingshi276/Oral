import { useState, useEffect } from 'react';
import api from '../services/api';

const EmailReminders = ({ currentAdmin }) => {
  const [tab, setTab] = useState(currentAdmin?.role === 'teacher' ? 'inbox' : 'compose');
  const [admins, setAdmins] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const defaultToAdminId = currentAdmin?.role === 'main_admin' ? 'all' : '';
  const [form, setForm] = useState({ to_admin_id: defaultToAdminId, to_email: '', to_name: '', subject: '', message: '' });
  const [msg, setMsg] = useState('');
  const isMainAdmin = currentAdmin?.role === 'main_admin';
  const canCompose  = ['main_admin', 'admin', 'teacher'].includes(currentAdmin?.role);

  useEffect(() => {
    fetchInbox();
    if (canCompose) { fetchAdmins(); fetchSent(); }
  }, []);

  const fetchAdmins = () => api.get('/admin/admins').then(res => {
    setAdmins(res.data.admins.filter(a => a.id !== currentAdmin?.id));
  });
  const fetchInbox = () => api.get('/email/inbox').then(res => setInbox(res.data.reminders));
  const fetchSent  = () => api.get('/email/sent').then(res => setSent(res.data.reminders));

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/email/send', form);
      setMsg('✅ ' + res.data.message);
      setForm({ to_admin_id: defaultToAdminId, to_email: '', to_name: '', subject: '', message: '' });
      fetchSent();
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Gagal menghantar')); }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleMarkRead = async (id) => {
    await api.put(`/email/read/${id}`);
    fetchInbox();
  };

  const unreadCount = inbox.filter(r => !r.is_read).length;

  const TABS = [
    ...(canCompose ? [{ key: 'compose', label: '✉️ Karang' }, { key: 'sent', label: '📤 Dihantar' }] : []),
    { key: 'inbox', label: `📥 Peti Masuk${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
  ];

  // Templat pantas — paparan mengikut peranan
  const REMINDER_TEMPLATES = [
    { label: 'Peringatan 3 Bulan', subject: 'Peringatan Sesi 3 Bulan — DentalQuest', message: 'Guru yang dihormati,\n\nIni adalah peringatan bahawa sudah kira-kira 3 bulan sejak sesi DentalQuest yang terakhir. Sila jadualkan sesi permainan baru untuk pelajar anda bagi mengukuhkan pengetahuan dan amalan kesihatan mulut mereka.\n\nSila log masuk ke portal pentadbir DentalQuest untuk mencipta sesi baru dan kongsi kod permainan dengan pelajar anda.\n\nTerima kasih atas sokongan berterusan anda!\n\nSalam hormat,\nPasukan Penyelidik DentalQuest' },
    { label: 'Sesi Pertama', subject: 'Selamat Datang ke DentalQuest!', message: 'Guru yang dihormati,\n\nSelamat datang ke DentalQuest! Sila log masuk ke portal pentadbir untuk mencipta sesi permainan pertama anda dan kongsi kod 4 digit dengan pelajar anda.\n\nJika anda memerlukan sebarang bantuan, jangan teragak-agak untuk menghubungi kami.\n\nSalam hormat,\nPasukan Penyelidik DentalQuest' },
  ];
  const TECH_TEMPLATE = { label: 'Isu Teknikal', subject: 'Laporan Isu Teknikal', message: 'Pentadbir yang dihormati,\n\nSaya ingin melaporkan isu teknikal dengan DentalQuest.\n\nPenerangan isu:\n[Sila terangkan isu di sini]\n\nLangkah untuk menghasilkan semula:\n1. \n2. \n3. \n\nTingkah laku yang dijangka:\n[Apa yang sepatutnya berlaku]\n\nTingkah laku sebenar:\n[Apa yang sebenarnya berlaku]\n\nTerima kasih atas bantuan anda.\n\nSalam hormat,' };

  // Pentadbir utama: templat peringatan sahaja | Pentadbir: semua 3 | Guru: isu teknikal sahaja
  const TEMPLATES = currentAdmin?.role === 'main_admin'
    ? REMINDER_TEMPLATES
    : currentAdmin?.role === 'admin'
      ? [...REMINDER_TEMPLATES, TECH_TEMPLATE]
      : [TECH_TEMPLATE];

  return (
    <div>
      <div style={s.tabs}>
        {TABS.map(t => (
          <button key={t.key} style={{ ...s.tab, ...(tab === t.key ? s.tabActive : {}) }} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {msg && <div style={{ ...s.msg, ...(msg.includes('✅') ? s.success : s.error) }}>{msg}</div>}

      {/* KARANG */}
      {tab === 'compose' && canCompose && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>✉️ {currentAdmin?.role === 'teacher' ? 'Hantar E-mel kepada Pentadbir' : 'Hantar E-mel kepada Staf'}</h2>

          {/* Templat pantas */}
          <div style={s.templateRow}>
            <span style={s.templateLabel}>Templat Pantas:</span>
            {TEMPLATES.map((t, i) => (
              <button key={i} style={s.templateBtn} onClick={() => setForm({ ...form, subject: t.subject, message: t.message })}>{t.label}</button>
            ))}
          </div>

          <form onSubmit={handleSend}>
            <div style={s.field}>
              <label style={s.label}>Hantar Kepada</label>
              <select style={s.input} value={form.to_admin_id} onChange={e => setForm({ ...form, to_admin_id: e.target.value })}>
                {isMainAdmin && <option value="all">📢 Semua Staf</option>}
                {admins.map(a => <option key={a.id} value={a.id}>{a.name} ({a.role === 'main_admin' ? '⭐ Pentadbir Utama' : a.role === 'teacher' ? '👩‍🏫 Guru' : '👨‍💼 Pentadbir'}) — {a.email}</option>)}
                {currentAdmin?.role !== 'teacher' && <option value="custom">Alamat E-mel Lain</option>}
              </select>
            </div>
            {form.to_admin_id === 'custom' && (
              <>
                <div style={s.field}>
                  <label style={s.label}>E-mel Penerima</label>
                  <input style={s.input} type="email" value={form.to_email} onChange={e => setForm({ ...form, to_email: e.target.value })} required placeholder="staf@contoh.com" maxLength={120} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Nama Penerima</label>
                  <input style={s.input} value={form.to_name} onChange={e => setForm({ ...form, to_name: e.target.value })} placeholder="Pilihan" maxLength={80} />
                </div>
              </>
            )}
            <div style={s.field}>
              <label style={s.label}>Subjek</label>
              <input style={s.input} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required placeholder="cth. Peringatan Sesi 3 Bulan" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Mesej</label>
              <textarea style={{ ...s.input, height: '180px', resize: 'vertical' }} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required placeholder="Tulis mesej peringatan anda di sini..." />
            </div>
            <button style={s.btnPrimary} type="submit">📤 Hantar E-mel</button>
          </form>
        </div>
      )}

      {/* DIHANTAR */}
      {tab === 'sent' && canCompose && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>📤 Peringatan Dihantar ({sent.length})</h2>
          <div style={s.emailList}>
            {sent.map(r => (
              <div key={r.id} style={s.emailItem}>
                <div style={s.emailTop}>
                  <span style={s.emailTo}>Kepada: {r.to_name}</span>
                  <span style={s.emailDate}>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <div style={s.emailSubject}>{r.subject}</div>
                <div style={s.emailPreview}>{r.message.slice(0, 100)}...</div>
                <div style={{ ...s.readBadge, ...(r.is_read ? s.readBadgeRead : s.readBadgeUnread) }}>
                  {r.is_read ? '✅ Dibaca' : '⏳ Belum Dibaca'}
                </div>
              </div>
            ))}
            {sent.length === 0 && <p style={s.empty}>Tiada peringatan dihantar lagi</p>}
          </div>
        </div>
      )}

      {/* PETI MASUK */}
      {tab === 'inbox' && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>📥 Peti Masuk ({inbox.length})</h2>
          <div style={s.emailList}>
            {inbox.map(r => (
              <div key={r.id} style={{ ...s.emailItem, ...(r.is_read ? {} : s.emailItemUnread) }}>
                <div style={s.emailTop}>
                  <span style={s.emailTo}>Daripada: {r.from_name}</span>
                  <span style={s.emailDate}>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <div style={s.emailSubject}>{r.subject}</div>
                <div style={s.emailBody}>{r.message}</div>
                {!r.is_read && (
                  <button style={s.markReadBtn} onClick={() => handleMarkRead(r.id)}>Tandai Sudah Dibaca ✓</button>
                )}
              </div>
            ))}
            {inbox.length === 0 && <p style={s.empty}>Tiada mesej dalam peti masuk</p>}
          </div>
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
  templateRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '10px' },
  templateLabel: { fontSize: '0.82rem', fontWeight: '600', color: '#64748b' },
  templateBtn: { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' },
  field: { marginBottom: '1rem' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' },
  input: { width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' },
  btnPrimary: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem' },
  msg: { padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  success: { background: '#f0fdf4', color: '#16a34a' },
  error: { background: '#fff1f2', color: '#e11d48' },
  emailList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  emailItem: { background: '#fafafa', borderRadius: '12px', padding: '1rem', border: '1px solid #f1f5f9' },
  emailItemUnread: { background: '#eff6ff', border: '1px solid #bfdbfe' },
  emailTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' },
  emailTo: { fontSize: '0.82rem', color: '#64748b', fontWeight: '600' },
  emailDate: { fontSize: '0.78rem', color: '#94a3b8' },
  emailSubject: { fontWeight: '700', color: '#1e3a5f', fontSize: '0.95rem', marginBottom: '0.4rem' },
  emailPreview: { fontSize: '0.82rem', color: '#64748b' },
  emailBody: { fontSize: '0.88rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.6, marginBottom: '0.75rem' },
  readBadge: { display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', marginTop: '0.5rem' },
  readBadgeRead: { background: '#f0fdf4', color: '#16a34a' },
  readBadgeUnread: { background: '#fff7ed', color: '#ea580c' },
  markReadBtn: { background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: '6px', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' },
  empty: { color: '#94a3b8', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' },
};

export default EmailReminders;
