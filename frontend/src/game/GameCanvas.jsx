import { useEffect, useRef, useCallback, useState } from 'react';
import PhaserGameScene from './PhaserGameScene';
import api from '../services/api';
import { START_POS, resolveSpawnPosition, writeCachedPosition } from './gameConfig';
import dentalImage from '../assets/dental.png';

const SAVE_INTERVAL = 5000;

const GameCanvas = ({ player, progress, onCheckpointReached, externalGameRef, virtualInput, enterSignal }) => {
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

  useEffect(() => {
    sceneRef.current?.setVirtualInput?.(virtualInput || {});
  }, [virtualInput]);

  useEffect(() => {
    if (enterSignal) sceneRef.current?.triggerVirtualEnter?.();
  }, [enterSignal]);

  const getProgress = useCallback(() => progressRef.current, []);
  // FIX: getIsCheckpointUnlocked reads from progressRef.current (a ref, not state),
  // so it always has the latest progress even without re-creating the callback.
  // CP1 is always unlocked; CPn requires CP(n-1) to be completed.
  const getIsCheckpointUnlocked = useCallback((cpId) => {
    if (cpId === 1) return true;
    const prev = progressRef.current.find(p => p.checkpoint_number === cpId - 1);
    return prev?.completed === true;
  }, []); // empty deps is intentional — we read the ref directly, not the state

  // FIX: Helper to build auth config for player-protected game routes.
  // All endpoints that read/write per-player data now require the chat JWT.
  const playerAuthConfig = useCallback(() => ({
    headers: { Authorization: `Bearer ${player.chat_token}` },
  }), [player.chat_token]);

  // ── Position save ──────────────────────────────────────────────────────────
  const savePosition = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const { x, y } = scene.getPlayerPosition();
    writeCachedPosition(player.id, x, y);
    const completed = progressRef.current.filter(p => p.completed).map(p => p.checkpoint_number);
    const lastCP = completed.length > 0 ? Math.max(...completed) : 0;
    api.post('/game/position', {
      player_id: player.id,
      pos_x: x,
      pos_y: y,
      last_checkpoint: lastCP,
    }, playerAuthConfig()).catch(() => { });
  }, [player.id, playerAuthConfig]);

  // ── Boot Phaser ────────────────────────────────────────────────────────────
  useEffect(() => {
    console.log('Booting Phaser');

    if (hasBooted.current) {
      console.log('Phaser already booted, skipping...');
      return;
    }
    hasBooted.current = true;

    if (!containerRef.current || gameRef.current) return;

    let cancelled = false;

    // Fetch saved position FIRST — only boot Phaser once we have it.
    // This guarantees init(data) receives the correct position before
    // create() runs, so the player always spawns in the right place.
    api.get(`/game/position/${player.id}`, playerAuthConfig())
      .then(res => {
        if (cancelled) return;
        let initialPos = START_POS;
        if (res.data?.position) {
          const { pos_x, pos_y } = res.data.position;
          // Reject positions that are clearly in the sea / outside the land area.
          // The old backend default was (390, 1000) which is ocean — anything
          // below x=500 or y=500 is off-map and should fall back to START.
          const looksValid = pos_x > 500 && pos_y > 500 && pos_x < 9000 && pos_y < 9000;
          if (looksValid) {
            initialPos = { x: pos_x, y: pos_y };
          }
        }
        initialPos = resolveSpawnPosition(res.data?.position, player.id);
        bootPhaser(initialPos);
      })
      .catch(() => {
        if (!cancelled) bootPhaser(resolveSpawnPosition(null, player.id));
      });

    function bootPhaser(initialPos) {
      if (gameRef.current) {
        console.log('Phaser already exists, skipping...');
        return;
      }
      import('phaser').then(({ default: Phaser }) => {
        if (cancelled || !containerRef.current) return;

        const viewW = window.innerWidth - 32;
        const viewH = window.innerHeight - 130;

        // The scene data object is passed to init(data) before create() runs.
        // This is the ONLY reliable way to get data into a scene at startup.
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
          // Don't put the scene in the config array — start it manually below
          // so we can pass sceneData into init(data) before create() runs.
          scene: [],
        });

        gameRef.current = game;
        if (externalGameRef) externalGameRef.current = game;

        game.events.on('ready', () => {
          // Add and start the scene with data in one atomic call.
          // Phaser calls init(sceneData) → preload() → create() in that order,
          // so initialPos is available when create() places the player.
          game.scene.add('PhaserGameScene', PhaserGameScene, true, sceneData);

          // Grab the live scene reference for savePosition / pause / resume
          // (scene exists immediately after add(..., true, ...))
          const scene = game.scene.getScene('PhaserGameScene');
          if (scene) sceneRef.current = scene;
        });

        // Handle window resize
        const onResize = () => {
          game.scale.resize(window.innerWidth - 32, window.innerHeight - 130);
        };
        window.addEventListener('resize', onResize);
        window.addEventListener('beforeunload', savePosition);

        // Periodic position autosave
        const saveInterval = setInterval(() => {
          if (Date.now() - lastSave.current > SAVE_INTERVAL) {
            lastSave.current = Date.now();
            savePosition();
          }
        }, SAVE_INTERVAL);

        game._oralCleanup = { onResize, saveInterval, savePosition };
      });
    }

    return () => {
      console.log('Cleanup skipped to preserve Phaser state');
    };
  }, []);

  useEffect(() => {
    console.log('GameCanvas mounted');

    return () => {
      console.log('GameCanvas unmounted');
    };
  }, []);

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
         <img src={dentalImage} style={{ width:120, animation: 'spin 1.2s linear infinite' }} />
          <div style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 18 }}>
            Loading Dental Quest...
          </div>
          {/* Progress bar */}
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
