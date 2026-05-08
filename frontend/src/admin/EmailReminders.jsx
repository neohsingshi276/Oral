import { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const COPY = {
  bm: {
    tabs: { compose: '✉️ Karang', sent: '📤 Dihantar', inbox: '📥 Peti Masuk' },
    composeTeacher: 'Hantar E-mel kepada Pentadbir',
    composeStaff: 'Hantar E-mel kepada Staf',
    quickTemplates: 'Templat Pantas:',
    sendTo: 'Hantar Kepada',
    selectRecipient: 'Sila Pilih Penerima',
    allStaff: '📢 Semua Staf',
    mainAdmin: '⭐ Pentadbir Utama',
    teacher: '👩‍🏫 Guru',
    admin: '👨‍💼 Pentadbir',
    otherEmail: 'Alamat E-mel Lain',
    recipientEmail: 'E-mel Penerima',
    recipientName: 'Nama Penerima',
    optional: 'Pilihan',
    subject: 'Subjek',
    message: 'Mesej',
    subjectPlaceholder: 'cth. Peringatan Sesi 3 Bulan',
    messagePlaceholder: 'Tulis mesej peringatan anda di sini...',
    sendEmail: '📤 Hantar E-mel',
    sentTitle: '📤 Peringatan Dihantar',
    inboxTitle: '📥 Peti Masuk',
    to: 'Kepada:',
    from: 'Daripada:',
    read: '✅ Dibaca',
    unread: '⏳ Belum Dibaca',
    markRead: 'Tandai Sudah Dibaca ✓',
    emptySent: 'Tiada peringatan dihantar lagi',
    emptyInbox: 'Tiada mesej dalam peti masuk',
    sendFail: 'Gagal menghantar',
    templates: {
      reminder3: {
        label: 'Peringatan 3 Bulan',
        subject: 'Peringatan Sesi 3 Bulan — DentalQuest',
        message: 'Guru yang dihormati,\n\nIni adalah peringatan bahawa sudah kira-kira 3 bulan sejak sesi DentalQuest yang terakhir. Sila jadualkan sesi permainan baru untuk pelajar anda bagi mengukuhkan pengetahuan dan amalan kesihatan mulut mereka.\n\nSila log masuk ke portal pentadbir DentalQuest untuk mencipta sesi baru dan kongsi kod permainan dengan pelajar anda.\n\nTerima kasih atas sokongan berterusan anda!\n\nSalam hormat,\nPasukan Penyelidik DentalQuest',
      },
      firstSession: {
        label: 'Sesi Pertama',
        subject: 'Selamat Datang ke DentalQuest!',
        message: 'Guru yang dihormati,\n\nSelamat datang ke DentalQuest! Sila log masuk ke portal pentadbir untuk mencipta sesi permainan pertama anda dan kongsi kod 4 digit dengan pelajar anda.\n\nJika anda memerlukan sebarang bantuan, jangan teragak-agak untuk menghubungi kami.\n\nSalam hormat,\nPasukan Penyelidik DentalQuest',
      },
      tech: {
        label: 'Isu Teknikal',
        subject: 'Laporan Isu Teknikal',
        message: 'Pentadbir yang dihormati,\n\nSaya ingin melaporkan isu teknikal dengan DentalQuest.\n\nPenerangan isu:\n[Sila terangkan isu di sini]\n\nLangkah untuk menghasilkan semula:\n1. \n2. \n3. \n\nTingkah laku yang dijangka:\n[Apa yang sepatutnya berlaku]\n\nTingkah laku sebenar:\n[Apa yang sebenarnya berlaku]\n\nTerima kasih atas bantuan anda.\n\nSalam hormat,',
      },
    },
  },
  bi: {
    tabs: { compose: '✉️ Compose', sent: '📤 Sent', inbox: '📥 Inbox' },
    composeTeacher: 'Send Email to Admin',
    composeStaff: 'Send Email to Staff',
    quickTemplates: 'Quick Templates:',
    sendTo: 'Send To',
    selectRecipient: 'Please Select Recipient',
    allStaff: '📢 All Staff',
    mainAdmin: '⭐ Main Admin',
    teacher: '👩‍🏫 Teacher',
    admin: '👨‍💼 Admin',
    otherEmail: 'Other Email Address',
    recipientEmail: 'Recipient Email',
    recipientName: 'Recipient Name',
    optional: 'Optional',
    subject: 'Subject',
    message: 'Message',
    subjectPlaceholder: 'e.g. 3-Month Session Reminder',
    messagePlaceholder: 'Write your reminder message here...',
    sendEmail: '📤 Send Email',
    sentTitle: '📤 Sent Reminders',
    inboxTitle: '📥 Inbox',
    to: 'To:',
    from: 'From:',
    read: '✅ Read',
    unread: '⏳ Unread',
    markRead: 'Mark As Read ✓',
    emptySent: 'No reminders sent yet',
    emptyInbox: 'No messages in inbox',
    sendFail: 'Failed to send',
    templates: {
      reminder3: {
        label: '3-Month Reminder',
        subject: '3-Month Session Reminder — DentalQuest',
        message: 'Dear Teacher,\n\nThis is a reminder that it has been about 3 months since the last DentalQuest session. Please schedule a new game session for your students to reinforce their oral health knowledge and habits.\n\nPlease log in to the DentalQuest admin portal to create a new session and share the game code with your students.\n\nThank you for your continued support!\n\nBest regards,\nThe DentalQuest Research Team',
      },
      firstSession: {
        label: 'First Session',
        subject: 'Welcome to DentalQuest!',
        message: 'Dear Teacher,\n\nWelcome to DentalQuest! Please log in to the admin portal to create your first game session and share the 4-digit code with your students.\n\nIf you need any help, please feel free to contact us.\n\nBest regards,\nThe DentalQuest Research Team',
      },
      tech: {
        label: 'Technical Issue',
        subject: 'Technical Issue Report',
        message: 'Dear Admin,\n\nI would like to report a technical issue with DentalQuest.\n\nIssue description:\n[Please describe the issue here]\n\nSteps to reproduce:\n1. \n2. \n3. \n\nExpected behavior:\n[What should have happened]\n\nActual behavior:\n[What actually happened]\n\nThank you for your help.\n\nBest regards,',
      },
    },
  },
};

const EmailReminders = ({ currentAdmin }) => {
  const { language } = useLanguage();
  const c = COPY[language];
  const [tab, setTab] = useState(currentAdmin?.role === 'teacher' ? 'inbox' : 'compose');
  const [admins, setAdmins] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const defaultToAdminId = currentAdmin?.role === 'main_admin' ? 'all' : '';
  const [form, setForm] = useState({ to_admin_id: defaultToAdminId, to_email: '', to_name: '', subject: '', message: '' });
  const [msg, setMsg] = useState('');
  const isMainAdmin = currentAdmin?.role === 'main_admin';
  const canCompose = ['main_admin', 'admin', 'teacher'].includes(currentAdmin?.role);

  const fetchAdmins = () => api.get('/admin/admins').then(res => {
    setAdmins(res.data.admins.filter(a => a.id !== currentAdmin?.id));
  });
  const fetchInbox = () => api.get('/email/inbox').then(res => setInbox(res.data.reminders));
  const fetchSent = () => api.get('/email/sent').then(res => setSent(res.data.reminders));

  useEffect(() => {
    fetchInbox();
    if (canCompose) { fetchAdmins(); fetchSent(); }
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/email/send', form);
      setMsg('✅ ' + res.data.message);
      setForm({ to_admin_id: defaultToAdminId, to_email: '', to_name: '', subject: '', message: '' });
      fetchSent();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || c.sendFail));
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleMarkRead = async (id) => {
    await api.put(`/email/read/${id}`);
    fetchInbox();
  };

  const unreadCount = inbox.filter(r => !r.is_read).length;
  const tabs = [
    ...(canCompose ? [{ key: 'compose', label: c.tabs.compose }, { key: 'sent', label: c.tabs.sent }] : []),
    { key: 'inbox', label: `${c.tabs.inbox}${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
  ];

  const reminderTemplates = [c.templates.reminder3, c.templates.firstSession];
  const templates = currentAdmin?.role === 'main_admin'
    ? reminderTemplates
    : currentAdmin?.role === 'admin'
      ? [...reminderTemplates, c.templates.tech]
      : [c.templates.tech];

  const roleLabel = (role) => role === 'main_admin' ? c.mainAdmin : role === 'teacher' ? c.teacher : c.admin;

  return (
    <div>
      <div style={s.tabs}>
        {tabs.map(item => (
          <button key={item.key} style={{ ...s.tab, ...(tab === item.key ? s.tabActive : {}) }} onClick={() => setTab(item.key)}>{item.label}</button>
        ))}
      </div>

      {msg && <div style={{ ...s.msg, ...(msg.includes('✅') ? s.success : s.error) }}>{msg}</div>}

      {tab === 'compose' && canCompose && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>✉️ {currentAdmin?.role === 'teacher' ? c.composeTeacher : c.composeStaff}</h2>
          <div style={s.templateRow}>
            <span style={s.templateLabel}>{c.quickTemplates}</span>
            {templates.map((template, i) => (
              <button key={i} style={s.templateBtn} onClick={() => setForm({ ...form, subject: template.subject, message: template.message })}>{template.label}</button>
            ))}
          </div>

          <form onSubmit={handleSend}>
            <div style={s.field}>
              <label style={s.label}>{c.sendTo}</label>
              <select style={s.input} value={form.to_admin_id} onChange={e => setForm({ ...form, to_admin_id: e.target.value })} required>
                <option value="" disabled>{c.selectRecipient}</option>
                {isMainAdmin && <option value="all">{c.allStaff}</option>}
                {admins.map(a => <option key={a.id} value={a.id}>{a.name} ({roleLabel(a.role)}) — {a.email}</option>)}
                {currentAdmin?.role !== 'teacher' && <option value="custom">{c.otherEmail}</option>}
              </select>
            </div>
            {form.to_admin_id === 'custom' && (
              <>
                <div style={s.field}>
                  <label style={s.label}>{c.recipientEmail}</label>
                  <input style={s.input} type="email" value={form.to_email} onChange={e => setForm({ ...form, to_email: e.target.value })} required placeholder="staff@example.com" maxLength={120} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>{c.recipientName}</label>
                  <input style={s.input} value={form.to_name} onChange={e => setForm({ ...form, to_name: e.target.value })} placeholder={c.optional} maxLength={80} />
                </div>
              </>
            )}
            <div style={s.field}>
              <label style={s.label}>{c.subject}</label>
              <input style={s.input} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required placeholder={c.subjectPlaceholder} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{c.message}</label>
              <textarea style={{ ...s.input, height: '180px', resize: 'vertical' }} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required placeholder={c.messagePlaceholder} />
            </div>
            <button style={s.btnPrimary} type="submit">{c.sendEmail}</button>
          </form>
        </div>
      )}

      {tab === 'sent' && canCompose && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>{c.sentTitle} ({sent.length})</h2>
          <div style={s.emailList}>
            {sent.map(item => (
              <div key={item.id} style={s.emailItem}>
                <div style={s.emailTop}>
                  <span style={s.emailTo}>{c.to} {item.to_name}</span>
                  <span style={s.emailDate}>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                <div style={s.emailSubject} data-no-translate="true">{item.subject}</div>
                <div style={s.emailPreview} data-no-translate="true">{item.message.slice(0, 100)}...</div>
                <div style={{ ...s.readBadge, ...(item.is_read ? s.readBadgeRead : s.readBadgeUnread) }}>
                  {item.is_read ? c.read : c.unread}
                </div>
              </div>
            ))}
            {sent.length === 0 && <p style={s.empty}>{c.emptySent}</p>}
          </div>
        </div>
      )}

      {tab === 'inbox' && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>{c.inboxTitle} ({inbox.length})</h2>
          <div style={s.emailList}>
            {inbox.map(item => (
              <div key={item.id} style={{ ...s.emailItem, ...(item.is_read ? {} : s.emailItemUnread) }}>
                <div style={s.emailTop}>
                  <span style={s.emailTo}>{c.from} {item.from_name}</span>
                  <span style={s.emailDate}>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                <div style={s.emailSubject} data-no-translate="true">{item.subject}</div>
                <div style={s.emailBody} data-no-translate="true">{item.message}</div>
                {!item.is_read && (
                  <button style={s.markReadBtn} onClick={() => handleMarkRead(item.id)}>{c.markRead}</button>
                )}
              </div>
            ))}
            {inbox.length === 0 && <p style={s.empty}>{c.emptyInbox}</p>}
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
