import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const AdminChat = () => {
  const [players, setPlayers]     = useState([]);
  const [selected, setSelected]   = useState(null);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);

  // Track the last-seen message count per player so unread badge clears when opened
  const lastSeenRef    = useRef({});   // { [player_id]: timestamp of last seen message }
  const messagesEndRef = useRef(null);
  const contactPollRef = useRef(null);
  const msgPollRef     = useRef(null);

  // ── Build player contact list from getAllChats ─────────────────────────────
  // getAllChats returns ALL messages ASC. We group by player, the last message
  // per player is the most recent. Unread = player messages after lastSeenRef.
  const buildPlayerMap = (allMessages) => {
    const map = {};
    allMessages.forEach(m => {
      if (!map[m.player_id]) {
        map[m.player_id] = {
          player_id:   m.player_id,
          nickname:    m.nickname,
          session_id:  m.session_id,
          lastMessage: null,
          lastTime:    null,
          unread:      0,
        };
      }
      const p = map[m.player_id];
      // Messages are ASC — every iteration overwrites with the newer message,
      // so after the loop p.lastMessage is the most recent one.
      p.lastMessage = m.message;
      p.lastTime    = m.sent_at;

      // Count unread: player messages sent after last time admin viewed this thread
      if (m.sender_type === 'player') {
        const lastSeen = lastSeenRef.current[m.player_id] || 0;
        if (new Date(m.sent_at).getTime() > lastSeen) {
          p.unread++;
        }
      }
    });
    return Object.values(map).sort((a, b) =>
      new Date(b.lastTime || 0) - new Date(a.lastTime || 0)
    );
  };

  const fetchContacts = async () => {
    try {
      const res = await api.get('/chat');
      setPlayers(buildPlayerMap(res.data.messages || []));
      if (loading) setLoading(false);
    } catch (err) {
      console.error('fetchContacts error:', err);
      if (loading) setLoading(false);
    }
  };

  const fetchMessages = async (playerId) => {
    try {
      const res = await api.get(`/chat/admin/messages/${playerId}`);
      const msgs = res.data.messages || [];
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
      // Mark as read: store the timestamp of the latest message we just saw
      if (msgs.length > 0) {
        const latest = Math.max(...msgs.map(m => new Date(m.sent_at).getTime()));
        lastSeenRef.current[playerId] = latest;
      }
    } catch (err) {
      console.error('fetchMessages error:', err);
    }
  };

  // ── Polling ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchContacts();
    contactPollRef.current = setInterval(fetchContacts, 5000);
    return () => clearInterval(contactPollRef.current);
  }, []);

  useEffect(() => {
    clearInterval(msgPollRef.current);
    if (selected) {
      fetchMessages(selected.player_id);
      msgPollRef.current = setInterval(() => fetchMessages(selected.player_id), 3000);
    }
    return () => clearInterval(msgPollRef.current);
  }, [selected?.player_id]);

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || !selected || sending) return;
    setSending(true);
    try {
      await api.post('/chat/admin/reply', {
        player_id:  selected.player_id,
        session_id: selected.session_id,
        message:    input.trim(),
      });
      setInput('');
      await fetchMessages(selected.player_id);
    } catch (err) {
      console.error('Send error:', err);
      alert(err.response?.data?.error || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSelectPlayer = (p) => {
    setSelected(p);
    // Optimistically zero out unread before fetch completes
    lastSeenRef.current[p.player_id] = Date.now();
    setPlayers(prev =>
      prev.map(x => x.player_id === p.player_id ? { ...x, unread: 0 } : x)
    );
  };

  const totalUnread = players.reduce((s, p) => s + (p.unread || 0), 0);

  if (loading) return <div style={s.loading}>Memuatkan sembang… 💬</div>;

  return (
    <div style={s.wrap}>

      {/* ── Sidebar ── */}
      <div style={s.sidebar}>
        <div style={s.sidebarHeader}>
          <span style={s.sidebarTitle}>💬 Sembang Pemain</span>
          {totalUnread > 0 && <span style={s.totalBadge}>{totalUnread}</span>}
        </div>

        <div style={s.contactList}>
          {players.length === 0 && (
            <p style={s.emptyContacts}>Belum ada mesej pemain.</p>
          )}
          {players.map(p => (
            <div
              key={p.player_id}
              style={{
                ...s.contactItem,
                ...(selected?.player_id === p.player_id ? s.contactActive : {}),
              }}
              onClick={() => handleSelectPlayer(p)}
            >
              <div style={s.avatar}>{p.nickname?.[0]?.toUpperCase()}</div>
              <div style={s.contactInfo}>
                <div style={s.contactName}>{p.nickname}</div>
                <div style={s.contactLast}>
                  {p.lastMessage
                    ? (p.lastMessage.length > 34 ? p.lastMessage.slice(0, 34) + '…' : p.lastMessage)
                    : 'Belum ada mesej'}
                </div>
              </div>
              <div style={s.contactMeta}>
                {p.lastTime && (
                  <div style={s.contactTime}>
                    {new Date(p.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
                {p.unread > 0 && (
                  <div style={s.unreadBadge}>{p.unread}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat window ── */}
      <div style={s.chatWin}>
        {!selected ? (
          <div style={s.noChat}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
            <p style={{ color: '#475569', fontWeight: '700' }}>Pilih pemain untuk mula bersembang</p>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Anda boleh membalas mana-mana mesej pemain di sini
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={s.chatHeader}>
              <div style={s.avatar}>{selected.nickname?.[0]?.toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={s.chatName}>{selected.nickname}</div>
                <div style={s.chatSub}>ID Pemain: {selected.player_id} · Sesi: {selected.session_id}</div>
              </div>
            </div>

            {/* Messages */}
            <div style={s.messages}>
              {messages.length === 0 && (
                <p style={s.emptyMessages}>Belum ada mesej. Menunggu pemain menulis dahulu.</p>
              )}
              {messages.map((m, i) => {
                const isAdmin = m.sender_type === 'admin';
                return (
                  <div key={i} style={{ ...s.msgRow, justifyContent: isAdmin ? 'flex-end' : 'flex-start' }}>
                    {!isAdmin && <div style={s.msgAvatar}>{selected.nickname?.[0]?.toUpperCase()}</div>}
                    <div style={{ ...s.bubble, ...(isAdmin ? s.bubbleAdmin : s.bubblePlayer) }}>
                      <span style={{ ...s.bubbleSender, color: isAdmin ? 'rgba(255,255,255,0.65)' : '#94a3b8' }}>
                        {isAdmin ? '👤 Anda (Pentadbir)' : `🎮 ${selected.nickname}`}
                      </span>
                      <p style={{ ...s.bubbleText, color: isAdmin ? '#fff' : '#1e293b' }}>{m.message}</p>
                      <span style={{ ...s.bubbleTime, color: isAdmin ? 'rgba(255,255,255,0.55)' : '#94a3b8' }}>
                        {new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                onKeyDown={handleKeyDown}
                placeholder={`Balas kepada ${selected.nickname}…`}
                maxLength={200}
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
  wrap: { display: 'flex', background: '#fff', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden', height: '640px' },
  loading: { padding: '2rem', color: '#64748b', textAlign: 'center' },

  sidebar: { width: '270px', flexShrink: 0, borderRight: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' },
  sidebarHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', flexShrink: 0 },
  sidebarTitle: { fontWeight: '800', color: '#1e3a5f', fontSize: '0.95rem' },
  totalBadge: { background: '#e11d48', color: '#fff', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '700', padding: '0.1rem 0.45rem' },
  contactList: { flex: 1, overflowY: 'auto' },
  contactItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.25rem', cursor: 'pointer', borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' },
  contactActive: { background: '#eff6ff', borderLeft: '3px solid #2563eb' },
  avatar: { width: '40px', height: '40px', borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1rem', flexShrink: 0 },
  contactInfo: { flex: 1, minWidth: 0 },
  contactName: { fontWeight: '700', color: '#1e3a5f', fontSize: '0.9rem' },
  contactLast: { color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.15rem' },
  contactMeta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 },
  contactTime: { color: '#94a3b8', fontSize: '0.7rem' },
  unreadBadge: { background: '#2563eb', color: '#fff', borderRadius: '999px', fontSize: '0.65rem', fontWeight: '700', padding: '0.1rem 0.42rem', minWidth: '18px', textAlign: 'center' },
  emptyContacts: { color: '#94a3b8', padding: '1.5rem', textAlign: 'center', fontSize: '0.85rem' },

  chatWin: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  noChat: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  chatHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1.5rem', borderBottom: '1px solid #f1f5f9', flexShrink: 0, background: '#fafbff' },
  chatName: { fontWeight: '700', color: '#1e3a5f', fontSize: '0.95rem' },
  chatSub: { color: '#94a3b8', fontSize: '0.73rem', marginTop: '0.1rem' },

  messages: { flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  emptyMessages: { color: '#94a3b8', textAlign: 'center', padding: '2rem', fontSize: '0.88rem' },
  msgRow: { display: 'flex', alignItems: 'flex-end', gap: '0.5rem' },
  msgAvatar: { width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem', flexShrink: 0 },
  bubble: { maxWidth: '72%', padding: '0.65rem 1rem', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  bubblePlayer: { background: '#f1f5f9', borderBottomLeftRadius: '4px' },
  bubbleAdmin: { background: '#2563eb', borderBottomRightRadius: '4px' },
  bubbleSender: { fontSize: '0.68rem', fontWeight: '700' },
  bubbleText: { margin: 0, fontSize: '0.9rem', lineHeight: 1.5, wordBreak: 'break-word' },
  bubbleTime: { fontSize: '0.63rem', alignSelf: 'flex-end' },

  inputRow: { display: 'flex', gap: '0.5rem', padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', flexShrink: 0, background: '#fafbff' },
  input: { flex: 1, padding: '0.7rem 1rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none' },
  sendBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.7rem 1.4rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap', transition: 'opacity 0.2s' },
};

export default AdminChat;
