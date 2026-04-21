import { useEffect, useRef, useCallback } from 'react';
import PhaserGameScene, { START_X, START_Y } from './PhaserGameScene';
import api from '../services/api';

const SAVE_INTERVAL = 5000;

const GameCanvas = ({ player, progress, onCheckpointReached }) => {
  const containerRef = useRef(null);
  const gameRef = useRef(null);          // Phaser.Game instance
  const sceneRef = useRef(null);         // live PhaserGameScene instance
  const lastSave = useRef(Date.now());

  // Keep latest progress accessible to the scene without restarting Phaser.
  // The scene calls getProgress() and getIsCheckpointUnlocked() every frame —
  // exposing them as stable refs means progress updates never re-boot the game.
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
    if (!containerRef.current) return;
    if (gameRef.current) return; // guard against StrictMode double-mount

    let cancelled = false;

    // Load saved position first, boot Phaser once we have it
    api.get(`/game/position/${player.id}`)
      .then(res => {
        if (cancelled) return;
        let initialPos = null;
        if (res.data?.position) {
          const { pos_x, pos_y } = res.data.position;
          if (pos_x > 50 && pos_x < 10000 && pos_y > 50 && pos_y < 10000) {
            initialPos = { x: pos_x, y: pos_y };
          }
        }
        bootPhaser(initialPos);
      })
      .catch(() => { if (!cancelled) bootPhaser(null); });

    function bootPhaser(initialPos) {
      // Dynamic import keeps the ~1 MB Phaser bundle out of the initial page load.
      import('phaser').then(({ default: Phaser }) => {
        if (cancelled || !containerRef.current) return;

        const viewW = window.innerWidth - 32;
        const viewH = window.innerHeight - 130;

        const game = new Phaser.Game({
          type: Phaser.AUTO,
          width: viewW,
          height: viewH,
          parent: containerRef.current,
          backgroundColor: '#1a1a2e',
          physics: {
            default: 'arcade',
            arcade: { gravity: { y: 0 }, debug: false },
          },
          scene: PhaserGameScene,
        });

        gameRef.current = game;

        // scene.init(data) is called before create(), so we inject callbacks
        // by patching the scene instance as soon as it exists.
        game.events.on('ready', () => {
          const scene = game.scene.getScene('PhaserGameScene');
          if (!scene) return;
          scene.onCheckpointReached = onCheckpointReached;
          scene.getProgress = getProgress;
          scene.getIsCheckpointUnlocked = getIsCheckpointUnlocked;
          scene.playerNickname = player.nickname;
          scene.initialPos = initialPos || { x: START_X, y: START_Y };
          sceneRef.current = scene;

          // If create() already ran before 'ready' fired (can happen on fast
          // hardware), apply the saved position now.
          if (scene.playerBody && initialPos) {
            scene.setPlayerPosition(initialPos.x, initialPos.y);
          }
        });

        // Resize Phaser canvas when window resizes
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
    // player.id is the only thing that should restart the whole game engine
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.id]);

  // ── Pause/resume when a modal opens (called from GamePage if needed) ────────
  // Usage: add a ref to GameCanvas and call ref.current.pauseGame() / resumeGame()
  // Currently GamePage doesn't use this but the wiring is ready.

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
