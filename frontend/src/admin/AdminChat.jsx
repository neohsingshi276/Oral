import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/* ─── AdminChat ───────────────────────────────────────────────────────────── */
const AdminChat = () => {
  const { admin } = useAuth();
  const [tab, setTab] = useState('players');   // 'players' | 'internal'

  return (
    <div>
      {/* Tab switcher */}
      <div style={ts.tabBar}>
        <button
          style={{ ...ts.tab, ...(tab === 'players' ? ts.tabActive : {}) }}
          onClick={() => setTab('players')}
        >
          💬 Player Chats
        </button>
        <button
          style={{ ...ts.tab, ...(tab === 'internal' ? ts.tabActive : {}) }}
          onClick={() => setTab('internal')}
        >
          🔒 Admin Reports {admin?.role === 'main_admin' ? '(All)' : '(to Main Admin)'}
        </button>
      </div>

      {tab === 'players'  && <PlayerChatPanel admin={admin} />}
      {tab === 'internal' && <InternalChatPanel admin={admin} />}
    </div>
  );
};

/* ─── PlayerChatPanel ─────────────────────────────────────────────────────── */
const PlayerChatPanel = ({ admin }) => {
  const [players, setPlayers]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const messagesEndRef           = useRef(null);
  const pollRef                  = useRef(null);

  const fetchPlayers = async () => {
    try {
      const res = await api.get('/chat');
      const playerMap = {};
      res.data.messages.forEach(m => {
        if (!playerMap[m.player_id]) {
          playerMap[m.player_id] = {
            player_id: m.player_id,
            nickname:  m.nickname,
            session_id: m.session_id,
            lastMessage: m.message,
            lastTime:    m.sent_at,
            unread: 0,
          };
        }
        playerMap[m.player_id].lastMessage = m.message;
        playerMap[m.player_id].lastTime    = m.sent_at;
        if (m.sender_type === 'player') playerMap[m.player_id].unread++;
      });
      setPlayers(Object.values(playerMap));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (playerId) => {
    try {
      // Use admin-specific endpoint so token is sent properly
      const res = await api.get(`/chat/admin/player/${playerId}`);
      setMessages(res.data.messages || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPlayers();
    pollRef.current = setInterval(fetchPlayers, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetchMessages(selected.player_id);
    const t = setInterval(() => fetchMessages(selected.player_id), 3000);
    return () => clearInterval(t);
  }, [selected]);

  const handleSend = async () => {
    if (!input.trim() || !selected || sending) return;
    setSending(true);
    try {
      await api.post('/chat/admin/send', {
        player_id:  selected.player_id,
        session_id: selected.session_id,
        message:    input.trim(),
      });
      setInput('');
      fetchMessages(selected.player_id);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div style={s.loading}>Loading chats...</div>;

  return (
    <div style={s.wrap}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={s.sidebarTitle}>💬 Player Chats</div>
        {players.length === 0 && <p style={s.empty}>No messages yet</p>}
        {players.map(p => (
          <div
            key={p.player_id}
            style={{ ...s.playerItem, ...(selected?.player_id === p.player_id ? s.playerItemActive : {}) }}
            onClick={() => setSelected(p)}
          >
            <div style={s.playerAvatar}>{p.nickname?.[0]?.toUpperCase()}</div>
            <div style={s.playerInfo}>
              <div style={s.playerName}>{p.nickname}</div>
              <div style={s.playerLast}>{p.lastMessage?.slice(0, 30)}…</div>
            </div>
            <div style={s.playerTime}>
              {new Date(p.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>

      {/* Chat window */}
      <div style={s.chatWin}>
        {!selected ? (
          <div style={s.noChatSelected}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
            <p style={{ color: '#64748b' }}>Select a player to view their messages</p>
          </div>
        ) : (
          <>
            <div style={s.chatHeader}>
              <div style={s.chatAvatar}>{selected.nickname?.[0]?.toUpperCase()}</div>
              <div>
                <div style={s.chatName}>{selected.nickname}</div>
                <div style={s.chatSub}>Player ID: {selected.player_id}</div>
              </div>
            </div>

            <div style={s.messages}>
              {messages.length === 0 && <p style={s.empty}>No messages yet</p>}
              {messages.map((m, i) => (
                <div key={i} style={{ ...s.msgWrap, justifyContent: m.sender_type === 'admin' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ ...s.bubble, ...(m.sender_type === 'admin' ? s.bubbleAdmin : s.bubblePlayer) }}>
                    <span style={s.bubbleSender}>
                      {m.sender_type === 'admin' ? `${admin?.name || 'Admin'} (You)` : selected.nickname}
                    </span>
                    <p style={{ ...s.bubbleText, color: m.sender_type === 'admin' ? '#fff' : '#1e293b' }}>
                      {m.message}
                    </p>
                    <span style={s.bubbleTime}>
                      {new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div style={s.inputRow}>
              <input
                style={s.input}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Reply to ${selected.nickname}...`}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              />
              <button style={{ ...s.sendBtn, opacity: sending ? 0.6 : 1 }} onClick={handleSend} disabled={sending}>
                {sending ? '...' : 'Send ➤'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ─── InternalChatPanel ───────────────────────────────────────────────────── */
const InternalChatPanel = ({ admin }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const messagesEndRef           = useRef(null);

  const fetchMessages = async () => {
    try {
      const res = await api.get('/chat/admin/internal');
      setMessages(res.data.messages || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const t = setInterval(fetchMessages, 5000);
    return () => clearInterval(t);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await api.post('/chat/admin/internal', { message: input.trim() });
      setInput('');
      fetchMessages();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div style={s.loading}>Loading messages...</div>;

  return (
    <div style={ic.wrap}>
      <div style={ic.header}>
        <div style={ic.icon}>🔒</div>
        <div>
          <div style={ic.title}>
            {admin?.role === 'main_admin' ? 'All Admin Reports & Messages' : 'Report to Main Admin'}
          </div>
          <div style={ic.sub}>
            {admin?.role === 'main_admin'
              ? 'View all messages sent by admins'
              : 'Send technical issues or reports to the Main Admin'}
          </div>
        </div>
      </div>

      <div style={ic.messages}>
        {messages.length === 0 && (
          <div style={ic.empty}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
            <p style={{ color: '#94a3b8' }}>No messages yet</p>
          </div>
        )}
        {messages.map((m, i) => {
          const isMe = m.from_admin_id === admin?.id;
          return (
            <div key={i} style={{ ...ic.msgWrap, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{ ...ic.bubble, ...(isMe ? ic.bubbleMe : ic.bubbleThem) }}>
                <span style={ic.sender}>
                  {isMe ? 'You' : m.from_name}
                  {m.from_role === 'main_admin' && <span style={ic.mainBadge}>⭐ Main Admin</span>}
                </span>
                <p style={{ ...ic.text, color: isMe ? '#fff' : '#1e293b' }}>{m.message}</p>
                <span style={ic.time}>
                  {new Date(m.sent_at).toLocaleString([], {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div style={ic.inputRow}>
        <input
          style={ic.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={
            admin?.role === 'main_admin'
              ? 'Reply to all admins...'
              : 'Report an issue to Main Admin...'
          }
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
        />
        <button
          style={{ ...ic.sendBtn, opacity: sending ? 0.6 : 1 }}
          onClick={handleSend}
          disabled={sending}
        >
          {sending ? '...' : 'Send ➤'}
        </button>
      </div>
    </div>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const ts = {
  tabBar:    { display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' },
  tab:       { padding: '0.6rem 1.25rem', border: '2px solid #e2e8f0', borderRadius: '10px', background: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', color: '#64748b', transition: 'all 0.15s' },
  tabActive: { background: '#2563eb', borderColor: '#2563eb', color: '#fff' },
};

const s = {
  loading:         { padding: '2rem', color: '#64748b', textAlign: 'center' },
  wrap:            { display: 'flex', gap: '0', background: '#fff', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden', height: '580px' },
  sidebar:         { width: '260px', flexShrink: 0, borderRight: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' },
  sidebarTitle:    { padding: '1rem 1.25rem', fontWeight: '800', color: '#1e3a5f', fontSize: '0.95rem', borderBottom: '1px solid #f1f5f9', flexShrink: 0 },
  playerItem:      { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.25rem', cursor: 'pointer', borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' },
  playerItemActive:{ background: '#eff6ff' },
  playerAvatar:    { width: '38px', height: '38px', borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1rem', flexShrink: 0 },
  playerInfo:      { flex: 1, minWidth: 0 },
  playerName:      { fontWeight: '700', color: '#1e3a5f', fontSize: '0.9rem' },
  playerLast:      { color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  playerTime:      { color: '#94a3b8', fontSize: '0.72rem', flexShrink: 0 },
  chatWin:         { flex: 1, display: 'flex', flexDirection: 'column' },
  noChatSelected:  { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  chatHeader:      { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', flexShrink: 0 },
  chatAvatar:      { width: '40px', height: '40px', borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.1rem' },
  chatName:        { fontWeight: '700', color: '#1e3a5f', fontSize: '0.95rem' },
  chatSub:         { color: '#94a3b8', fontSize: '0.75rem' },
  messages:        { flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  empty:           { color: '#94a3b8', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' },
  msgWrap:         { display: 'flex' },
  bubble:          { maxWidth: '70%', padding: '0.6rem 0.9rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  bubblePlayer:    { background: '#f1f5f9', borderBottomLeftRadius: '4px' },
  bubbleAdmin:     { background: '#2563eb', borderBottomRightRadius: '4px' },
  bubbleSender:    { fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8' },
  bubbleText:      { margin: 0, fontSize: '0.88rem', lineHeight: 1.5 },
  bubbleTime:      { fontSize: '0.65rem', color: '#94a3b8', alignSelf: 'flex-end' },
  inputRow:        { display: 'flex', gap: '0.5rem', padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', flexShrink: 0 },
  input:           { flex: 1, padding: '0.65rem 1rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none' },
  sendBtn:         { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.65rem 1.25rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' },
};

const ic = {
  wrap:      { background: '#fff', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', height: '580px' },
  header:    { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', flexShrink: 0, background: '#fafbff' },
  icon:      { fontSize: '2rem' },
  title:     { fontWeight: '800', color: '#1e3a5f', fontSize: '1rem' },
  sub:       { color: '#64748b', fontSize: '0.82rem', marginTop: '0.1rem' },
  messages:  { flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  empty:     { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem' },
  msgWrap:   { display: 'flex' },
  bubble:    { maxWidth: '65%', padding: '0.65rem 1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  bubbleMe:  { background: '#2563eb', borderBottomRightRadius: '4px' },
  bubbleThem:{ background: '#f1f5f9', borderBottomLeftRadius: '4px' },
  sender:    { fontSize: '0.72rem', fontWeight: '700', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' },
  mainBadge: { background: '#7c3aed', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: '700' },
  text:      { margin: 0, fontSize: '0.88rem', lineHeight: 1.5 },
  time:      { fontSize: '0.65rem', color: '#94a3b8', alignSelf: 'flex-end' },
  inputRow:  { display: 'flex', gap: '0.5rem', padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', flexShrink: 0 },
  input:     { flex: 1, padding: '0.65rem 1rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none' },
  sendBtn:   { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.65rem 1.25rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' },
};

export default AdminChat;
