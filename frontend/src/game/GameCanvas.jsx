import { useEffect, useRef, useCallback } from 'react';
import PhaserGameScene from './PhaserGameScene';
import api from '../services/api';
import { START_POS } from './gameConfig';

const SAVE_INTERVAL = 5000;

const GameCanvas = ({ player, progress, onCheckpointReached }) => {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const sceneRef = useRef(null);
  const lastSave = useRef(Date.now());
  const hasBooted = useRef(false);

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

  // ── Boot Phaser ────────────────────────────────────────────────────────────
  useEffect(() => {
    console.log('🚀 BOOT PHASER useEffect triggered');

    if (hasBooted.current) {
      console.log('⚠️ Already booted, skipping...');
      return;
    }
    hasBooted.current = true;

    if (!containerRef.current || gameRef.current) return;

    let cancelled = false;

    // Fetch saved position FIRST — only boot Phaser once we have it.
    // This guarantees init(data) receives the correct position before
    // create() runs, so the player always spawns in the right place.
    api.get(`/game/position/${player.id}`)
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
        bootPhaser(initialPos);
      })
      .catch(() => {
        if (!cancelled) bootPhaser(START_POS);
      });

    function bootPhaser(initialPos) {
      if (gameRef.current) {
        console.log('⚠️ Phaser already exists, skipping...');
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
          initialPos,                       // ← player spawns here, not (0,0)
          onNearCheckpoint: () => { },
          onLoadProgress: () => { },
          onLoadComplete: () => { },
        };

        const game = new Phaser.Game({
          type: Phaser.AUTO,
          width: viewW,
          height: viewH,
          parent: containerRef.current,
          backgroundColor: '#1a1a2e',
          physics: {
            default: 'matter',
            matter: { gravity: { y: 0 }, debug: true },
          },
          // Don't put the scene in the config array — start it manually below
          // so we can pass sceneData into init(data) before create() runs.
          scene: [],
        });

        gameRef.current = game;

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

        // Periodic position autosave
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
      console.log('⚠️ Cleanup skipped (prevent destroy)');
    };
  }, []);

  useEffect(() => {
    console.log('✅ GameCanvas MOUNTED');

    return () => {
      console.log('❌ GameCanvas UNMOUNTED');
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        lineHeight: 0,
        borderRadius: '12px',
        overflow: 'hidden',
        border: '3px solid #1e3a5f',
        margin: '0 auto',
      }}
    />
  );
};


export default GameCanvas;