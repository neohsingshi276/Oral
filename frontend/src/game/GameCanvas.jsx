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

  // FIX: When the parent passes updated progress (after CP completion),
  // immediately update the ref AND do a direct API re-fetch to guarantee
  // the Phaser scene has the latest data before the player reaches the next CP.
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Direct API refresh — called after a checkpoint is completed so the Phaser
  // scene's progressRef is up-to-date without waiting for a React render cycle.
  const refreshProgressFromAPI = useCallback(async () => {
    if (!player?.id || !player?.chat_token) return;
    try {
      const res = await api.get(`/game/progress/${player.id}`, {
        headers: { Authorization: `Bearer ${player.chat_token}` },
      });
      if (res.data?.progress) {
        progressRef.current = res.data.progress;
      }
    } catch (err) {
      // Silently ignore — the parent's fetchProgress will also run
      console.warn('GameCanvas: background progress refresh failed', err);
    }
  }, [player?.id, player?.chat_token]);

  useEffect(() => {
    sceneRef.current?.setVirtualInput?.(virtualInput || {});
  }, [virtualInput]);

  useEffect(() => {
    if (enterSignal) sceneRef.current?.triggerVirtualEnter?.();
  }, [enterSignal]);

  const getProgress = useCallback(() => progressRef.current, []);

  // getIsCheckpointUnlocked reads from progressRef.current directly (a ref, not state),
  // so it always has the latest progress every Phaser frame without re-creating the callback.
  // CP1 is always unlocked. CP2 requires CP1 completed. CP3 requires CP2 completed.
  const getIsCheckpointUnlocked = useCallback((cpId) => {
    if (cpId === 1) return true;
    const prev = progressRef.current.find(p => p.checkpoint_number === cpId - 1);
    return prev?.completed === true;
  }, []); // empty deps intentional — reads the ref directly

  // Wrapped onCheckpointReached: after a CP is entered (and completed upstream),
  // trigger a background progress refresh so the next CP unlocks immediately.
  const handleCheckpointReached = useCallback(async (cpId) => {
    await onCheckpointReached(cpId);
    // Refresh after a short delay to allow the backend to finish writing
    setTimeout(() => refreshProgressFromAPI(), 1500);
  }, [onCheckpointReached, refreshProgressFromAPI]);

  // FIX: Helper to build auth config for player-protected game routes.
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

    api.get(`/game/position/${player.id}`, playerAuthConfig())
      .then(res => {
        if (cancelled) return;
        let initialPos = START_POS;
        if (res.data?.position) {
          const { pos_x, pos_y } = res.data.position;
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

        const sceneData = {
          onCheckpointReached: handleCheckpointReached,
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
        window.addEventListener('beforeunload', savePosition);

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
