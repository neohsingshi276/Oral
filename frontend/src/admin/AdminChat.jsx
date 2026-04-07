import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const AdminChat = () => {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  // Fetch all players who have sent messages
  const fetchPlayers = async () => {
    try {
      const res = await api.get('/chat');
      // Group messages by player
      const playerMap = {};
      res.data.messages.forEach(m => {
        if (!playerMap[m.player_id]) {
          playerMap[m.player_id] = {
            player_id: m.player_id,
            nickname: m.nickname,
            session_id: m.session_id,
            lastMessage: m.message,
            lastTime: m.sent_at,
            unread: 0,
          };
        }
        playerMap[m.player_id].lastMessage = m.message;
        playerMap[m.player_id].lastTime = m.sent_at;
        if (m.sender_type === 'player') playerMap[m.player_id].unread++;
      });
      setPlayers(Object.values(playerMap));
      setLoading(false);
    } catch (err) { console.error(err); setLoading(false); }
  };

  // Fetch messages for selected player
  const fetchMessages = async (playerId) => {
    try {
      const res = await api.get(`/chat/${playerId}`);
      setMessages(res.data.messages || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchPlayers();
    pollRef.current = setInterval(fetchPlayers, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    if (selectedPlayer) {
      fetchMessages(selectedPlayer.player_id);
      const t = setInterval(() => fetchMessages(selectedPlayer.player_id), 3000);
      return () => clearInterval(t);
    }
  }, [selectedPlayer]);

  const handleSend = async () => {
    if (!input.trim() || !selectedPlayer) return;
    try {
      await api.post('/chat', {
        player_id: selectedPlayer.player_id,
        session_id: selectedPlayer.session_id,
        sender_type: 'admin',
        message: input.trim(),
      });
      setInput('');
      fetchMessages(selectedPlayer.player_id);
    } catch (err) { console.error(err); }
  };

  if (loading) return <div style={s.loading}>Loading chats...</div>;

  return (
    <div style={s.wrap}>
      {/* Player list */}
      <div style={s.sidebar}>
        <div style={s.sidebarTitle}>💬 Player Chats</div>
        {players.length === 0 && <p style={s.empty}>No messages yet</p>}
        {players.map(p => (
          <div
            key={p.player_id}
            style={{ ...s.playerItem, ...(selectedPlayer?.player_id === p.player_id ? s.playerItemActive : {}) }}
            onClick={() => setSelectedPlayer(p)}
          >
            <div style={s.playerAvatar}>{p.nickname?.[0]?.toUpperCase()}</div>
            <div style={s.playerInfo}>
              <div style={s.playerName}>{p.nickname}</div>
              <div style={s.playerLast}>{p.lastMessage?.slice(0, 30)}...</div>
            </div>
            <div style={s.playerTime}>{new Date(p.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        ))}
      </div>

      {/* Chat window */}
      <div style={s.chatWin}>
        {!selectedPlayer ? (
          <div style={s.noChatSelected}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
            <p style={{ color: '#64748b' }}>Select a player to view their messages</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={s.chatHeader}>
              <div style={s.chatAvatar}>{selectedPlayer.nickname?.[0]?.toUpperCase()}</div>
              <div>
                <div style={s.chatName}>{selectedPlayer.nickname}</div>
                <div style={s.chatSub}>Player ID: {selectedPlayer.player_id}</div>
              </div>
            </div>

            {/* Messages */}
            <div style={s.messages}>
              {messages.length === 0 && <p style={s.empty}>No messages yet</p>}
              {messages.map((m, i) => (
                <div key={i} style={{ ...s.msgWrap, justifyContent: m.sender_type === 'admin' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ ...s.bubble, ...(m.sender_type === 'admin' ? s.bubbleAdmin : s.bubblePlayer) }}>
                    <span style={s.bubbleSender}>{m.sender_type === 'admin' ? 'You (Admin)' : selectedPlayer.nickname}</span>
                    <p style={{ ...s.bubbleText, color: m.sender_type === 'admin' ? '#fff' : '#1e293b' }}>{m.message}</p>
                    <span style={s.bubbleTime}>{new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={s.inputRow}>
              <input
                style={s.input}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Reply to ${selectedPlayer.nickname}...`}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button style={s.sendBtn} onClick={handleSend}>Send ➤</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const s = {
  wrap: { display: 'flex', gap: '0', background: '#fff', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden', height: '600px' },
  loading: { padding: '2rem', color: '#64748b', textAlign: 'center' },
  sidebar: { width: '260px', flexShrink: 0, borderRight: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' },
  sidebarTitle: { padding: '1rem 1.25rem', fontWeight: '800', color: '#1e3a5f', fontSize: '0.95rem', borderBottom: '1px solid #f1f5f9', flexShrink: 0 },
  playerItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.25rem', cursor: 'pointer', borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' },
  playerItemActive: { background: '#eff6ff' },
  playerAvatar: { width: '38px', height: '38px', borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1rem', flexShrink: 0 },
  playerInfo: { flex: 1, minWidth: 0 },
  playerName: { fontWeight: '700', color: '#1e3a5f', fontSize: '0.9rem' },
  playerLast: { color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  playerTime: { color: '#94a3b8', fontSize: '0.72rem', flexShrink: 0 },
  chatWin: { flex: 1, display: 'flex', flexDirection: 'column' },
  noChatSelected: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  chatHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', flexShrink: 0 },
  chatAvatar: { width: '40px', height: '40px', borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.1rem' },
  chatName: { fontWeight: '700', color: '#1e3a5f', fontSize: '0.95rem' },
  chatSub: { color: '#94a3b8', fontSize: '0.75rem' },
  messages: { flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  empty: { color: '#94a3b8', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' },
  msgWrap: { display: 'flex' },
  bubble: { maxWidth: '70%', padding: '0.6rem 0.9rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  bubblePlayer: { background: '#f1f5f9', borderBottomLeftRadius: '4px' },
  bubbleAdmin: { background: '#2563eb', borderBottomRightRadius: '4px' },
  bubbleSender: { fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8' },
  bubbleText: { margin: 0, fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.5 },
  bubbleAdminText: { color: '#fff' },
  bubbleTime: { fontSize: '0.65rem', color: '#94a3b8', alignSelf: 'flex-end' },
  inputRow: { display: 'flex', gap: '0.5rem', padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', flexShrink: 0 },
  input: { flex: 1, padding: '0.65rem 1rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', outline: 'none' },
  sendBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.65rem 1.25rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' },
};

export default AdminChat;
