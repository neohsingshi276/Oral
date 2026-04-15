import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const AdminChat = () => {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const msgPollRef = useRef(null);

  // Fetch all players who have sent messages (uses GET /chat — admin JWT route)
  const fetchPlayers = async () => {
    try {
      const res = await api.get('/chat');
      const playerMap = {};
      res.data.messages.forEach(m => {
        if (!playerMap[m.player_id]) {
          playerMap[m.player_id] = {
            player_id: m.player_id,
            nickname: m.nickname,
            session_id: m.session_id,
            lastMessage: m.message,
            lastTime: m.sent_at,
            unreadCount: 0,
          };
        }
        // Keep the latest message/time (messages are DESC from server)
        playerMap[m.player_id].lastMessage = playerMap[m.player_id].lastMessage || m.message;
        playerMap[m.player_id].lastTime = playerMap[m.player_id].lastTime || m.sent_at;
        if (m.sender_type === 'player') playerMap[m.player_id].unreadCount++;
      });
      setPlayers(Object.values(playerMap));
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch player list:', err);
      setLoading(false);
    }
  };

  // Fetch messages for a specific player — uses admin-specific endpoint
  const fetchMessages = async (playerId) => {
    try {
      const res = await api.get(`/chat/admin/messages/${playerId}`);
      setMessages(res.data.messages || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  useEffect(() => {
    fetchPlayers();
    pollRef.current = setInterval(fetchPlayers, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    clearInterval(msgPollRef.current);
    if (selectedPlayer) {
      fetchMessages(selectedPlayer.player_id);
      msgPollRef.current = setInterval(() => fetchMessages(selectedPlayer.player_id), 3000);
    }
    return () => clearInterval(msgPollRef.current);
  }, [selectedPlayer]);

  const handleSend = async () => {
    if (!input.trim() || !selectedPlayer || sending) return;
    setSending(true);
    try {
      // Uses admin-specific POST endpoint — sets sender_type: 'admin' on server
      await api.post('/chat/admin/reply', {
        player_id: selectedPlayer.player_id,
        session_id: selectedPlayer.session_id,
        message: input.trim(),
      });
      setInput('');
      await fetchMessages(selectedPlayer.player_id);
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) return <div style={s.loading}>Loading chats... 💬</div>;

  return (
    <div style={s.wrap}>
      {/* Sidebar — player list */}
      <div style={s.sidebar}>
        <div style={s.sidebarTitle}>💬 Player Chats</div>
        <div style={s.sidebarList}>
          {players.length === 0 && (
            <p style={s.empty}>No player messages yet.<br />Players can send messages during the game.</p>
          )}
          {players.map(p => (
            <div
              key={p.player_id}
              style={{
                ...s.playerItem,
                ...(selectedPlayer?.player_id === p.player_id ? s.playerItemActive : {}),
              }}
              onClick={() => setSelectedPlayer(p)}
            >
              <div style={s.playerAvatar}>{p.nickname?.[0]?.toUpperCase()}</div>
              <div style={s.playerInfo}>
                <div style={s.playerName}>{p.nickname}</div>
                <div style={s.playerLast}>
                  {p.lastMessage?.length > 32 ? p.lastMessage.slice(0, 32) + '…' : p.lastMessage}
                </div>
              </div>
              <div style={s.playerMeta}>
                <div style={s.playerTime}>
                  {new Date(p.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                {p.unreadCount > 0 && (
                  <div style={s.unreadBadge}>{p.unreadCount}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat window */}
      <div style={s.chatWin}>
        {!selectedPlayer ? (
          <div style={s.noChatSelected}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
            <p style={{ color: '#64748b', fontWeight: '600' }}>Select a player to view their chat</p>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              You can reply directly to players from here
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={s.chatHeader}>
              <div style={s.chatAvatar}>{selectedPlayer.nickname?.[0]?.toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={s.chatName}>{selectedPlayer.nickname}</div>
                <div style={s.chatSub}>Player ID: {selectedPlayer.player_id} · Session: {selectedPlayer.session_id}</div>
              </div>
              <div style={s.onlineDot} title="Active" />
            </div>

            {/* Messages */}
            <div style={s.messages}>
              {messages.length === 0 && (
                <p style={s.empty}>No messages yet. The player hasn't sent anything.</p>
              )}
              {messages.map((m, i) => {
                const isAdmin = m.sender_type === 'admin';
                return (
                  <div key={i} style={{ ...s.msgWrap, justifyContent: isAdmin ? 'flex-end' : 'flex-start' }}>
                    <div style={{ ...s.bubble, ...(isAdmin ? s.bubbleAdmin : s.bubblePlayer) }}>
                      <span style={{ ...s.bubbleSender, color: isAdmin ? 'rgba(255,255,255,0.7)' : '#94a3b8' }}>
                        {isAdmin ? '👤 You (Admin)' : `🎮 ${selectedPlayer.nickname}`}
                      </span>
                      <p style={{ ...s.bubbleText, color: isAdmin ? '#fff' : '#1e293b' }}>{m.message}</p>
                      <span style={{ ...s.bubbleTime, color: isAdmin ? 'rgba(255,255,255,0.6)' : '#94a3b8' }}>
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
                placeholder={`Reply to ${selectedPlayer.nickname}…`}
                maxLength={200}
                disabled={sending}
              />
              <button
                style={{ ...s.sendBtn, opacity: sending ? 0.6 : 1 }}
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? '…' : 'Send ➤'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const s = {
  wrap: { display: 'flex', gap: '0', background: '#fff', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden', height: '640px' },
  loading: { padding: '2rem', color: '#64748b', textAlign: 'center' },

  // Sidebar
  sidebar: { width: '270px', flexShrink: 0, borderRight: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' },
  sidebarTitle: { padding: '1rem 1.25rem', fontWeight: '800', color: '#1e3a5f', fontSize: '0.95rem', borderBottom: '1px solid #f1f5f9', flexShrink: 0 },
  sidebarList: { flex: 1, overflowY: 'auto' },
  playerItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.25rem', cursor: 'pointer', borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' },
  playerItemActive: { background: '#eff6ff', borderLeft: '3px solid #2563eb' },
  playerAvatar: { width: '40px', height: '40px', borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.1rem', flexShrink: 0 },
  playerInfo: { flex: 1, minWidth: 0 },
  playerName: { fontWeight: '700', color: '#1e3a5f', fontSize: '0.9rem' },
  playerLast: { color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.15rem' },
  playerMeta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 },
  playerTime: { color: '#94a3b8', fontSize: '0.7rem' },
  unreadBadge: { background: '#2563eb', color: '#fff', borderRadius: '999px', fontSize: '0.65rem', fontWeight: '700', padding: '0.1rem 0.4rem', minWidth: '18px', textAlign: 'center' },

  // Chat window
  chatWin: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  noChatSelected: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  chatHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1.5rem', borderBottom: '1px solid #f1f5f9', flexShrink: 0, background: '#fafbff' },
  chatAvatar: { width: '42px', height: '42px', borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.1rem', flexShrink: 0 },
  chatName: { fontWeight: '700', color: '#1e3a5f', fontSize: '0.95rem' },
  chatSub: { color: '#94a3b8', fontSize: '0.73rem', marginTop: '0.1rem' },
  onlineDot: { width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', flexShrink: 0 },

  // Messages
  messages: { flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  empty: { color: '#94a3b8', textAlign: 'center', padding: '2rem', fontSize: '0.88rem', lineHeight: 1.6 },
  msgWrap: { display: 'flex' },
  bubble: { maxWidth: '72%', padding: '0.65rem 1rem', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  bubblePlayer: { background: '#f1f5f9', borderBottomLeftRadius: '4px' },
  bubbleAdmin: { background: '#2563eb', borderBottomRightRadius: '4px' },
  bubbleSender: { fontSize: '0.68rem', fontWeight: '700' },
  bubbleText: { margin: 0, fontSize: '0.9rem', lineHeight: 1.5, wordBreak: 'break-word' },
  bubbleTime: { fontSize: '0.63rem', alignSelf: 'flex-end' },

  // Input
  inputRow: { display: 'flex', gap: '0.5rem', padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', flexShrink: 0, background: '#fafbff' },
  input: { flex: 1, padding: '0.7rem 1rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s' },
  sendBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.7rem 1.4rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem', transition: 'opacity 0.2s', whiteSpace: 'nowrap' },
};

export default AdminChat;
