import axios from 'axios';

// Ensure the base URL always ends with /api
const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const baseURL = rawUrl.endsWith('/api') ? rawUrl : rawUrl.replace(/\/$/, '') + '/api';

const api = axios.create({ baseURL, withCredentials: true });

api.interceptors.request.use((config) => {
  const url = config.url || '';
  const needsPlayerToken = url.startsWith('/game/position')
    || url.startsWith('/game/attempt')
    || url.startsWith('/game/complete')
    || url.startsWith('/game/progress')
    || url.startsWith('/game/player-exists')
    || url === '/quiz/submit';

  if (needsPlayerToken) {
    try {
      const player = JSON.parse(localStorage.getItem('player') || 'null');
      if (player?.chat_token) {
        config.headers.Authorization = `Bearer ${player.chat_token}`;
        return config;
      }
    } catch {
      // Ignore malformed local player state; route guards handle redirects.
    }
  }

  return config;
});

export default api;
