import { useEffect, useRef, useCallback, useState } from 'react';
import PhaserGameScene from './PhaserGameScene';
import api from '../services/api';
import { START_POS, resolveSpawnPosition, writeCachedPosition } from './gameConfig';

const SAVE_INTERVAL = 5000;

const GameCanvas = ({ player, progress, onCheckpointReached, externalGameRef }) => {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const sceneRef = useRef(null);
  const lastSave = useRef(Date.now());
  const hasBooted = useRef(false);

  // Loading state
  const [ready, setReady] = useState(false);
  const [loadPct, setLoadPct] = useState(0);

  // Keep latest progress in a ref so the scene can read it every frame
  // without needing Phaser to restart when React re-renders.
  const progressRef = useRef(progress);
  useEffect(() => { progressRef.current = progress; }, [progress]);

  const getProgress = useCallback(() => progressRef.current, []);
  const getIsCheckpointUnlocked = useCallback((cpId) => {
    if (cpId === 1) return true;
    return progressRef.current.find(p => p.checkpoint_number === cpId - 1)?.completed ?? false;
  }, []);

  // ── Position save ──────────────────────────────────────────────────────────
  const savePosition = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene || !player?.id) return;
    const { x, y } = scene.getPlayerPosition();
    const completed = progressRef.current.filter(p => p.completed).map(p => p.checkpoint_number);
    const lastCP = completed.length > 0 ? Math.max(...completed) : 0;

    // 1. Write to localStorage immediately — survives refresh even if API is slow
    writeCachedPosition(player.id, x, y);

    // 2. Persist to backend
    api.post('/game/position', {
      player_id: player.id,
      pos_x: Math.round(x),
      pos_y: Math.round(y),
      last_checkpoint: lastCP,
    }).catch(() => { });
  }, [player.id]);

  // ── Boot Phaser ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasBooted.current) return;
    hasBooted.current = true;

    if (!containerRef.current || gameRef.current) return;

    let cancelled = false;

    // Fetch saved position from server, then pick the best spawn point.
    // resolveSpawnPosition compares the API row against the localStorage cache
    // and returns whichever is farther from the start (i.e. the most recent walk).
    // This means refresh always restores position even before the last API save completes.
    api.get(`/game/position/${player.id}`)
      .then(res => {
        if (cancelled) return;
        const initialPos = resolveSpawnPosition(res.data?.position, player.id);
        bootPhaser(initialPos);
      })
      .catch(() => {
        if (!cancelled) {
          // API failed — fall back to localStorage cache, then START_POS
          const initialPos = resolveSpawnPosition(null, player.id);
          bootPhaser(initialPos);
        }
      });

    function bootPhaser(initialPos) {
      if (gameRef.current) return;
      import('phaser').then(({ default: Phaser }) => {
        if (cancelled || !containerRef.current) return;

        const viewW = window.innerWidth - 32;
        const viewH = window.innerHeight - 130;

        const sceneData = {
          onCheckpointReached,
          getProgress,
          getIsCheckpointUnlocked,
          playerNickname: player.nickname,
          initialPos,
          onNearCheckpoint: () => { },
          onLoadProgress: (pct) => setLoadPct(Math.round(pct * 100)),
          onLoadComplete: () => setReady(true),
        };

        const game = new Phaser.Game({
          type: Phaser.AUTO,
          width: viewW,
          height: viewH,
          parent: containerRef.current,
          backgroundColor: '#1a1a2e',
          pixelArt: true,
          antialias: false,
          roundPixels: true,
          physics: {
            default: 'matter',
            matter: { gravity: { y: 0 }, debug: false },
          },
          scene: [],
        });

        gameRef.current = game;
        if (externalGameRef) externalGameRef.current = game;

        game.events.on('ready', () => {
          game.scene.add('PhaserGameScene', PhaserGameScene, true, sceneData);
          const scene = game.scene.getScene('PhaserGameScene');
          if (scene) sceneRef.current = scene;
        });

        const onResize = () => {
          game.scale.resize(window.innerWidth - 32, window.innerHeight - 130);
        };
        window.addEventListener('resize', onResize);

        // Autosave on a timer — also writes to localStorage via savePosition
        const saveInterval = setInterval(() => {
          if (Date.now() - lastSave.current > SAVE_INTERVAL) {
            lastSave.current = Date.now();
            savePosition();
          }
        }, SAVE_INTERVAL);

        game._oralCleanup = { onResize, saveInterval };
      });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // Save position immediately when the page is closed/refreshed
  useEffect(() => {
    const onPageHide = () => {
      const scene = sceneRef.current;
      if (!scene || !player?.id) return;
      const { x, y } = scene.getPlayerPosition();
      // writeCachedPosition is synchronous — guaranteed to finish before unload
      writeCachedPosition(player.id, x, y);
      // keepalive fetch so the backend also gets the final position
      const completed = progressRef.current.filter(p => p.completed).map(p => p.checkpoint_number);
      const lastCP = completed.length > 0 ? Math.max(...completed) : 0;
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      fetch(`${API_BASE}/game/position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: player.id, pos_x: Math.round(x), pos_y: Math.round(y), last_checkpoint: lastCP }),
        keepalive: true,
      }).catch(() => { });
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [player.id, savePosition]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Loading overlay — shown until Phaser fires onLoadComplete */}
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#1a1a2e',
          borderRadius: '12px',
          border: '3px solid #1e3a5f',
          zIndex: 10,
          gap: 16,
          minHeight: 300,
        }}>
          <div style={{ fontSize: 48, animation: 'spin 1.2s linear infinite' }}>🦷</div>
          <div style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 18 }}>
            Loading Dental Quest…
          </div>
          <div style={{
            width: 220, height: 10,
            background: '#0f1a2e',
            borderRadius: 5,
            overflow: 'hidden',
            border: '1px solid #2563eb',
          }}>
            <div style={{
              height: '100%',
              width: `${loadPct}%`,
              background: 'linear-gradient(90deg, #2563eb, #7B2FBE)',
              borderRadius: 5,
              transition: 'width 0.2s ease',
            }} />
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>{loadPct}%</div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          lineHeight: 0,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '3px solid #1e3a5f',
          margin: '0 auto',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
};

export default GameCanvas;