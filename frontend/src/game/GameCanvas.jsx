import { useEffect, useRef, useCallback, useState } from 'react';
import PhaserGameScene, { START_X, START_Y } from './PhaserGameScene';
import api from '../services/api';

const SAVE_INTERVAL = 5000;

const GameCanvas = ({ player, progress, onCheckpointReached }) => {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const sceneRef = useRef(null);
  const lastSave = useRef(Date.now());
  const [loadPct, setLoadPct] = useState(0);   // 0–100
  const [ready, setReady] = useState(false);

  const progressRef = useRef(progress);
  useEffect(() => { progressRef.current = progress; }, [progress]);

  const getProgress = useCallback(() => progressRef.current, []);
  const getIsCheckpointUnlocked = useCallback((cpId) => {
    if (cpId === 1) return true;
    return progressRef.current.find(p => p.checkpoint_number === cpId - 1)?.completed ?? false;
  }, []);

  // ── Position save ─────────────────────────────────────────────────────────
  const savePosition = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const { x, y } = scene.getPlayerPosition();
    const completed = progressRef.current.filter(p => p.completed).map(p => p.checkpoint_number);
    const lastCP = completed.length > 0 ? Math.max(...completed) : 0;
    api.post('/game/position', {
      player_id: player.id,
      pos_x: x,
      pos_y: y,
      last_checkpoint: lastCP,
    }).catch(() => { });
  }, [player.id]);

  // ── Boot Phaser ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    let cancelled = false;

    api.get(`/game/position/${player.id}`)
      .then(res => {
        if (cancelled) return;
        let initialPos = { x: START_X, y: START_Y };
        if (res.data?.position) {
          const { pos_x, pos_y } = res.data.position;
          // Accept any position that is on the land area.
          // Reject clearly invalid saves (zero, very small, or out-of-bounds).
          // Also reject the OLD wrong default spawn (3296, 7000-7600) which was
          // below the actual start sign — those saves should reset to START.
          const isOldWrongSpawn = pos_x > 2800 && pos_x < 3600 && pos_y > 6900;
          const looksValid = pos_x > 100 && pos_y > 100 && pos_x < 5600 && pos_y < 7600 && !isOldWrongSpawn;
          if (looksValid) initialPos = { x: pos_x, y: pos_y };
        }
        bootPhaser(initialPos);
      })
      .catch(() => { if (!cancelled) bootPhaser({ x: START_X, y: START_Y }); });

    function bootPhaser(initialPos) {
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
          // Wire progress callbacks to React state
          onLoadProgress: (v) => setLoadPct(Math.round(v * 100)),
          onLoadComplete: () => setReady(true),
        };

        const game = new Phaser.Game({
          type: Phaser.AUTO,
          width: viewW,
          height: viewH,
          parent: containerRef.current,
          backgroundColor: '#1a1a2e',
          physics: {
            default: 'arcade',
            arcade: { gravity: { y: 0 }, debug: true },
          },
          scene: [],
        });

        gameRef.current = game;

        game.events.on('ready', () => {
          game.scene.add('PhaserGameScene', PhaserGameScene, true, sceneData);
          const scene = game.scene.getScene('PhaserGameScene');
          if (scene) sceneRef.current = scene;
        });

        const onResize = () => {
          game.scale.resize(window.innerWidth - 32, window.innerHeight - 130);
        };
        window.addEventListener('resize', onResize);

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
      const game = gameRef.current;
      if (game) {
        window.removeEventListener('resize', game._oralCleanup?.onResize);
        clearInterval(game._oralCleanup?.saveInterval);
        savePosition();
        game.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.id]);

  return (
    <div style={{ position: 'relative', width: '100%', margin: '0 auto' }}>
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
          {/* Tooth emoji spinner */}
          <div style={{ fontSize: 48, animation: 'spin 1.2s linear infinite' }}>🦷</div>
          <div style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 18 }}>
            Loading Dental Quest…
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

      {/* Phaser canvas container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          lineHeight: 0,
          borderRadius: '12px',
          overflow: 'hidden',
          border: ready ? '3px solid #1e3a5f' : '3px solid transparent',
          opacity: ready ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      />
    </div>
  );
};

export default GameCanvas;
