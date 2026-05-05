// ============================================================
// StaffChat.jsx — Admin ↔ Admin messaging
// Regular admins can message Main Admin to report issues.
// Main Admin can message any admin.
// ============================================================
import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const StaffChat = () => {
  const { admin: me } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const msgPollRef = useRef(null);
  const contactPollRef = useRef(null);

  // ── fetch contact list ───────────────────────────────────
  const fetchContacts = async () => {
    try {
      const res = await api.get('/staff-chat/contacts');
      const nextContacts = res.data.contacts || [];
      setContacts(nextContacts);
      setSelected(prev => {
        if (!prev) return prev;
        return nextContacts.find(c => c.id === prev.id) || null;
      });
      setLoadingContacts(false);
    } catch (err) {
      console.error('Failed to load contacts:', err);
      setLoadingContacts(false);
    }
  };

  // ── fetch messages for selected contact ─────────────────
  const fetchMessages = async (adminId) => {
    try {
      const res = await api.get(`/staff-chat/${adminId}`);
      setMessages(res.data.messages || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    } catch (err) {
      console.error('Gagal Untuk Memuatkan Mesej', err);
    }
  };

  // ── polling ──────────────────────────────────────────────
  useEffect(() => {
    fetchContacts();
    contactPollRef.current = setInterval(fetchContacts, 6000);
    return () => clearInterval(contactPollRef.current);
  }, []);

  useEffect(() => {
    clearInterval(msgPollRef.current);
    if (selected) {
      fetchMessages(selected.id);
      msgPollRef.current = setInterval(() => fetchMessages(selected.id), 3000);
    }
    return () => clearInterval(msgPollRef.current);
  }, [selected]);

  // ── send ─────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || !selected || sending) return;
    setSending(true);
    try {
      await api.post('/staff-chat', {
        receiver_id: selected.id,
        message: input.trim(),
      });
      setInput('');
      await fetchMessages(selected.id);
      // Refresh contact list so unread badges update for receiver
      fetchContacts();
    } catch (err) {
      console.error('Send failed:', err);
      alert(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const visibleContacts = me?.role === 'main_admin' || me?.role === 'teacher'
    ? contacts
    : contacts.filter(c => c.role === 'main_admin');

  useEffect(() => {
    if (!selected && visibleContacts.length === 1) {
      setSelected(visibleContacts[0]);
      return;
    }
    if (selected && !visibleContacts.some(c => c.id === selected.id)) {
      setSelected(visibleContacts[0] || null);
    }
  }, [selected, visibleContacts]);

  // ── total unread badge for nav ───────────────────────────
  const totalUnread = contacts.reduce((sum, c) => sum + (c.unread || 0), 0);

  if (loadingContacts) return <div style={s.loading}>Memuatkan sembang staf… 💬</div>;

  return (
    <div style={s.wrap}>
      {/* ── Sidebar ── */}
      <div style={s.sidebar}>
        <div style={s.sidebarHeader}>
          <span style={s.sidebarTitle}>🏢 Sembang Staf</span>
          {totalUnread > 0 && <span style={s.totalUnread}>{totalUnread}</span>}
        </div>
        <div style={s.sidebarSub}>
          {me?.role === 'main_admin'
            ? 'Mesej daripada pentadbir anda'
            : me?.role === 'teacher'
              ? 'Hubungi pentadbir dan staf'
              : 'Laporkan isu kepada Pentadbir Utama'}
        </div>
        <div style={s.contactList}>
          {visibleContacts.length === 0 && (
            <p style={s.empty}>Belum ada pentadbir lain.</p>
          )}
          {visibleContacts.map(c => (
            <div
              key={c.id}
              style={{
                ...s.contactItem,
                ...(selected?.id === c.id ? s.contactActive : {}),
              }}
              onClick={() => setSelected(c)}
            >
              <div style={{ ...s.avatar, background: c.role === 'main_admin' ? '#7c3aed' : '#2563eb' }}>
                {c.name?.[0]?.toUpperCase()}
              </div>
              <div style={s.contactInfo}>
                <div style={s.contactName}>
                  {c.name}
                  <span style={{ ...s.rolePill, background: c.role === 'main_admin' ? '#7c3aed' : '#2563eb' }}>
                    {c.role === 'main_admin' ? '⭐' : c.role === 'teacher' ? 'Guru' : 'Pentadbir'}
                  </span>
                </div>
                {c.lastMessage && (
                  <div style={s.contactLast}>
                    {c.lastMessage.length > 34 ? c.lastMessage.slice(0, 34) + '…' : c.lastMessage}
                  </div>
                )}
              </div>
              <div style={s.contactMeta}>
                {c.lastTime && (
                  <div style={s.contactTime}>
                    {new Date(c.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
                {c.unread > 0 && <div style={s.unreadBadge}>{c.unread}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat window ── */}
      <div style={s.chatWin}>
        {!selected ? (
          <div style={s.noChat}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏢</div>
            <p style={{ color: '#475569', fontWeight: '700', marginBottom: '0.25rem' }}>Sembang Staf</p>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', maxWidth: '260px' }}>
              {me?.role === 'main_admin'
                ? 'Pilih pentadbir dari senarai untuk melihat mesej mereka.'
                : 'Pilih pentadbir untuk menghantar laporan atau soalan.'}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={s.chatHeader}>
              <div style={{ ...s.avatar, width: '44px', height: '44px', fontSize: '1.2rem', background: selected.role === 'main_admin' ? '#7c3aed' : '#2563eb' }}>
                {selected.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={s.chatName}>{selected.name}</div>
                <div style={s.chatSub}>
                  {selected.role === 'main_admin' ? '⭐ Pentadbir Utama' : selected.role === 'teacher' ? '👩‍🏫 Guru' : 'Pentadbir'}
                </div>
              </div>
              {me?.role !== 'main_admin' && (
                <div style={s.reportHint}>📋 Saluran Laporan</div>
              )}
            </div>

            {/* Messages */}
            <div style={s.messages}>
              {messages.length === 0 && (
                <div style={s.emptyMsg}>
                  <p>No messages yet.</p>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {me?.role !== 'main_admin' ? 'Hantar mesej untuk melaporkan isu.' : 'Belum ada mesej daripada pentadbir ini.'}
                  </p>
                </div>
              )}
              {messages.map((m, i) => {
                const isMine = m.sender_id === me?.id;
                return (
                  <div key={i} style={{ ...s.msgRow, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                    {!isMine && (
                      <div style={{ ...s.msgAvatar, background: selected.role === 'main_admin' ? '#7c3aed' : '#2563eb' }}>
                        {m.sender_name?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div style={{ ...s.bubble, ...(isMine ? s.bubbleMine : s.bubbleTheirs) }}>
                      <span style={{ ...s.bubbleSender, color: isMine ? 'rgba(255,255,255,0.65)' : '#94a3b8' }}>
                        {isMine ? 'Anda' : m.sender_name}
                      </span>
                      <p style={{ ...s.bubbleText, color: isMine ? '#fff' : '#1e293b' }}>{m.message}</p>
                      <span style={{ ...s.bubbleTime, color: isMine ? 'rgba(255,255,255,0.55)' : '#94a3b8' }}>
                        {new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {m.is_read && isMine && <span style={{ marginLeft: '0.3rem' }}>✓✓</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={s.inputRow}>
              <input
                style={s.input}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`Mesej kepada ${selected.name}…`}
                maxLength={500}
                disabled={sending}
              />
              <button
                style={{ ...s.sendBtn, opacity: (!input.trim() || sending) ? 0.5 : 1 }}
                onClick={handleSend}
                disabled={!input.trim() || sending}
              >
                {sending ? '…' : 'Hantar ➤'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const s = {
  wrap: { display: 'flex', background: '#fff', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden', height: '640px' },
  loading: { padding: '2rem', color: '#64748b', textAlign: 'center' },

  // Sidebar
  sidebar: { width: '280px', flexShrink: 0, borderRight: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' },
  sidebarHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem 0.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' },
  sidebarTitle: { fontWeight: '800', color: '#1e3a5f', fontSize: '0.95rem' },
  totalUnread: { background: '#e11d48', color: '#fff', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '700', padding: '0.1rem 0.45rem' },
  sidebarSub: { padding: '0.4rem 1.25rem 0.75rem', fontSize: '0.75rem', color: '#94a3b8', borderBottom: '1px solid #f1f5f9' },
  contactList: { flex: 1, overflowY: 'auto' },
  contactItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.25rem', cursor: 'pointer', borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' },
  contactActive: { background: '#eff6ff', borderLeft: '3px solid #2563eb' },
  avatar: { width: '40px', height: '40px', borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1rem', flexShrink: 0 },
  contactInfo: { flex: 1, minWidth: 0 },
  contactName: { fontWeight: '700', color: '#1e3a5f', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' },
  rolePill: { color: '#fff', fontSize: '0.62rem', padding: '0.1rem 0.35rem', borderRadius: '5px', fontWeight: '700' },
  contactLast: { color: '#94a3b8', fontSize: '0.74rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.15rem' },
  contactMeta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 },
  contactTime: { color: '#94a3b8', fontSize: '0.68rem' },
  unreadBadge: { background: '#2563eb', color: '#fff', borderRadius: '999px', fontSize: '0.65rem', fontWeight: '700', padding: '0.1rem 0.42rem', minWidth: '18px', textAlign: 'center' },
  empty: { color: '#94a3b8', padding: '1.5rem', textAlign: 'center', fontSize: '0.85rem' },

  // Chat
  chatWin: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  noChat: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  chatHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1.5rem', borderBottom: '1px solid #f1f5f9', flexShrink: 0, background: '#fafbff' },
  chatName: { fontWeight: '700', color: '#1e3a5f', fontSize: '0.95rem' },
  chatSub: { color: '#94a3b8', fontSize: '0.73rem' },
  reportHint: { background: '#fef9ee', color: '#b45309', fontSize: '0.73rem', fontWeight: '600', padding: '0.3rem 0.7rem', borderRadius: '8px', border: '1px solid #fde68a' },
  messages: { flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  emptyMsg: { textAlign: 'center', color: '#64748b', padding: '2rem', fontSize: '0.9rem' },
  msgRow: { display: 'flex', alignItems: 'flex-end', gap: '0.5rem' },
  msgAvatar: { width: '28px', height: '28px', borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem', flexShrink: 0, marginBottom: '2px' },
  bubble: { maxWidth: '70%', padding: '0.65rem 1rem', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  bubbleMine: { background: '#2563eb', borderBottomRightRadius: '4px' },
  bubbleTheirs: { background: '#f1f5f9', borderBottomLeftRadius: '4px' },
  bubbleSender: { fontSize: '0.67rem', fontWeight: '700' },
  bubbleText: { margin: 0, fontSize: '0.9rem', lineHeight: 1.5, wordBreak: 'break-word' },
  bubbleTime: { fontSize: '0.62rem', alignSelf: 'flex-end' },
  inputRow: { display: 'flex', gap: '0.5rem', padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', flexShrink: 0, background: '#fafbff' },
  input: { flex: 1, padding: '0.7rem 1rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none' },
  sendBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.7rem 1.4rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap', transition: 'opacity 0.2s' },
};

export default StaffChat;
