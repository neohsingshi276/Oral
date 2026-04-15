import { useEffect, useRef, useState, useCallback } from 'react';
import mapBase from '../assets/map-base.jpg';
import collisionData from '../assets/collision-grid.json';
import { MAP_WIDTH, MAP_HEIGHT, MAP_SCALE, MAP_IMG_WIDTH, MAP_IMG_HEIGHT, CHAR_SIZE, CHAR_SPEED, START_POS, CHECKPOINTS } from './gameConfig';
import api from '../services/api';

const SAVE_INTERVAL = 5000;

// Collision grid: "1" = walkable, "0" = blocked (ocean, trees, buildings, fences, etc.)
const GRID = collisionData.grid;
const GRID_W = collisionData.width;   // 147
const GRID_H = collisionData.height;  // 200
const TILE_W = collisionData.tileWidth; // 8 (in original image pixels)

const GameCanvas = ({ player, progress, onCheckpointReached }) => {
  const canvasRef = useRef(null);
  const charPos = useRef({ x: START_POS.x, y: START_POS.y });
  const keys = useRef({});
  const mapImg = useRef(null);
  const animRef = useRef(null);
  const lastSave = useRef(Date.now());
  const charFrame = useRef(0);
  const frameCount = useRef(0);

  // FIX: Use a ref for nearCheckpoint so the draw loop reads the latest value without
  // being in the useEffect dependency array — previously caused the entire RAF loop to
  // tear down and restart every time the player crossed a checkpoint boundary.
  const nearCheckpointRef = useRef(null);
  const [nearCheckpoint, setNearCheckpoint] = useState(null);

  // FIX: Responsive canvas size — recalculates on window resize instead of being
  // frozen at the value from the initial render.
  const getViewSize = () => ({
    w: window.innerWidth - 32,
    h: window.innerHeight - 130,
  });
  const [viewSize, setViewSize] = useState(getViewSize);
  useEffect(() => {
    const onResize = () => setViewSize(getViewSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const getCompletedCPs = useCallback(() => {
    return progress.filter(p => p.completed).map(p => p.checkpoint_number);
  }, [progress]);

  const isCheckpointUnlocked = useCallback((cpId) => {
    if (cpId === 1) return true;
    return progress.find(p => p.checkpoint_number === cpId - 1)?.completed;
  }, [progress]);

  // Check collision grid: convert scaled world coords -> original image coords -> grid cell
  const isWalkable = useCallback((scaledX, scaledY) => {
    // Map bounds check
    if (scaledX < 10 || scaledX > MAP_WIDTH - 10 || scaledY < 10 || scaledY > MAP_HEIGHT - 10) return false;

    // Convert from scaled world coords to original image coords
    const imgX = scaledX / MAP_SCALE;
    const imgY = scaledY / MAP_SCALE;

    // Convert to grid cell
    const col = Math.floor(imgX / TILE_W);
    const row = Math.floor(imgY / TILE_W);

    // Bounds check on grid
    if (row < 0 || row >= GRID_H || col < 0 || col >= GRID_W) return false;

    // "1" = walkable, "0" = blocked
    return GRID[row][col] === "1";
  }, []);

  // Load map image
  useEffect(() => {
    const img = new Image();
    img.src = mapBase;
    img.onload = () => {
      mapImg.current = img;
    };
  }, []);

  // Load saved position
  useEffect(() => {
    api.get(`/game/position/${player.id}`).then(res => {
      if (res.data?.position) {
        const { pos_x, pos_y } = res.data.position;
        const inBounds = pos_x > 50 && pos_x < MAP_WIDTH - 50 && pos_y > 50 && pos_y < MAP_HEIGHT - 50;
        if (inBounds && isWalkable(pos_x, pos_y)) {
          charPos.current = { x: pos_x, y: pos_y };
        } else {
          charPos.current = { x: START_POS.x, y: START_POS.y };
        }
      }
    }).catch(() => {
      charPos.current = { x: START_POS.x, y: START_POS.y };
    });
  }, [player.id, isWalkable]);

  // Keyboard events
  useEffect(() => {
    const onDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      keys.current[e.key] = true;
      e.preventDefault();
    };
    const onUp = (e) => { keys.current[e.key] = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // Save position
  const savePosition = useCallback(() => {
    const completed = getCompletedCPs();
    const lastCP = completed.length > 0 ? Math.max(...completed) : 0;
    api.post('/game/position', {
      player_id: player.id,
      pos_x: charPos.current.x,
      pos_y: charPos.current.y,
      last_checkpoint: lastCP,
    }).catch(() => { });
  }, [player.id, getCompletedCPs]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const completed = getCompletedCPs();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mapImg.current) {
        ctx.drawImage(mapImg.current, 0, 0, MAP_WIDTH, MAP_HEIGHT);
      } else {
        ctx.fillStyle = '#2E86AB';
        ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
      }

      // Draw checkpoints
      CHECKPOINTS.forEach(cp => {
        const isCompleted = completed.includes(cp.id);
        const isUnlocked = isCheckpointUnlocked(cp.id);
        // FIX: Read from ref instead of state — no stale closure, no loop restart
        const isNear = nearCheckpointRef.current === cp.id;

        if (isNear && isUnlocked && !isCompleted) {
          ctx.beginPath();
          ctx.arc(cp.x, cp.y, 52, 0, Math.PI * 2);
          ctx.fillStyle = cp.color + '33';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 28, 0, Math.PI * 2);
        ctx.fillStyle = isCompleted ? '#16a34a' : isUnlocked ? cp.color : '#94a3b8';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isCompleted ? '✓' : String(cp.id), cp.x, cp.y);

        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(cp.label, cp.x + 38, cp.y - 10);

        if (!isUnlocked && !isCompleted) {
          ctx.fillStyle = '#fff';
          ctx.font = '14px sans-serif';
          ctx.fillText('🔒', cp.x + 30, cp.y + 10);
        }

        if (nearCheckpointRef.current === cp.id && isUnlocked && !isCompleted) {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('Press E to enter', cp.x, cp.y + 50);
        }
      });

      // Character
      frameCount.current++;
      if (frameCount.current % 8 === 0) charFrame.current = (charFrame.current + 1) % 4;

      const cx = charPos.current.x;
      const cy = charPos.current.y;
      const isMoving = keys.current['w'] || keys.current['s'] || keys.current['a'] || keys.current['d'] ||
        keys.current['ArrowUp'] || keys.current['ArrowDown'] || keys.current['ArrowLeft'] || keys.current['ArrowRight'] ||
        keys.current['W'] || keys.current['A'] || keys.current['S'] || keys.current['D'];


      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(cx - 10, cy - 6, 20, 22, 4);
      ctx.fill();

      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.arc(cx, cy - 14, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#1e3a5f';
      ctx.beginPath(); ctx.arc(cx - 4, cy - 15, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 4, cy - 15, 2, 0, Math.PI * 2); ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy - 12, 5, 0.2, Math.PI - 0.2);
      ctx.strokeStyle = '#1e3a5f';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const legOffset = isMoving ? Math.sin(frameCount.current * 0.3) * 4 : 0;
      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(cx - 8, cy + 16, 7, 10 + legOffset);
      ctx.fillRect(cx + 1, cy + 16, 7, 10 - legOffset);

      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      const textW = ctx.measureText(player.nickname).width + 10;
      ctx.fillRect(cx - textW / 2, cy - 34, textW, 16);
      ctx.fillStyle = '#fff';
      ctx.fillText(player.nickname, cx, cy - 20);
    };

    const update = () => {
      const pos = charPos.current;
      let dx = 0, dy = 0;

      if (keys.current['w'] || keys.current['ArrowUp'] || keys.current['W']) dy = -CHAR_SPEED;
      if (keys.current['s'] || keys.current['ArrowDown'] || keys.current['S']) dy = CHAR_SPEED;
      if (keys.current['a'] || keys.current['ArrowLeft'] || keys.current['A']) dx = -CHAR_SPEED;
      if (keys.current['d'] || keys.current['ArrowRight'] || keys.current['D']) dx = CHAR_SPEED;

      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

      const newX = Math.max(CHAR_SIZE, Math.min(MAP_WIDTH - CHAR_SIZE, pos.x + dx));
      const newY = Math.max(CHAR_SIZE, Math.min(MAP_HEIGHT - CHAR_SIZE, pos.y + dy));

      if (isWalkable(newX, newY)) {
        pos.x = newX; pos.y = newY;
      } else if (dx !== 0 && isWalkable(newX, pos.y)) {
        pos.x = newX;
      } else if (dy !== 0 && isWalkable(pos.x, newY)) {
        pos.y = newY;
      }

      let near = null;
      CHECKPOINTS.forEach(cp => {
        const dist = Math.sqrt((pos.x - cp.x) ** 2 + (pos.y - cp.y) ** 2);
        if (dist < cp.radius + 20) near = cp.id;
      });
      // FIX: Update both ref (for draw loop) and state (for React UI like the "E prompt" hint)
      nearCheckpointRef.current = near;
      setNearCheckpoint(near);

      if (keys.current['e'] || keys.current['E']) {
        if (near) {
          const cp = CHECKPOINTS.find(c => c.id === near);
          const isUnlocked = isCheckpointUnlocked(cp.id);
          const completedList = getCompletedCPs();
          if (isUnlocked && !completedList.includes(cp.id)) {
            keys.current['e'] = false;
            keys.current['E'] = false;
            onCheckpointReached(cp.id);
          }
        }
      }

      if (Date.now() - lastSave.current > SAVE_INTERVAL) {
        lastSave.current = Date.now();
        savePosition();
      }

      draw();
      animRef.current = requestAnimationFrame(update);
    };

    animRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animRef.current);
    // FIX: nearCheckpoint removed from deps — the draw loop uses nearCheckpointRef instead,
    // so it no longer restarts the entire RAF loop on every checkpoint proximity change.
  }, [player, progress, onCheckpointReached, savePosition, getCompletedCPs, isCheckpointUnlocked, isWalkable]);

  // FIX: Use responsive viewSize state instead of values frozen at first render
  const viewW = viewSize.w;
  const viewH = viewSize.h;
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateCamera = () => {
      const targetX = Math.max(0, Math.min(MAP_WIDTH - viewW, charPos.current.x - viewW / 2));
      const targetY = Math.max(0, Math.min(MAP_HEIGHT - viewH, charPos.current.y - viewH / 2));
      setCameraOffset(prev => {
        const newX = prev.x + (targetX - prev.x) * 0.12;
        const newY = prev.y + (targetY - prev.y) * 0.12;
        if (Math.abs(newX - prev.x) < 0.5 && Math.abs(newY - prev.y) < 0.5) return prev;
        return { x: newX, y: newY };
      });
    };
    const interval = setInterval(updateCamera, 16);
    return () => clearInterval(interval);
  }, [viewW, viewH]);

  return (
    <div style={{
      width: `${viewW}px`,
      height: `${viewH}px`,
      overflow: 'hidden',
      borderRadius: '12px',
      border: '3px solid #1e3a5f',
      position: 'relative',
      margin: '0 auto',
    }}>
      <canvas
        ref={canvasRef}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        style={{
          display: 'block',
          imageRendering: 'auto',
          transform: `translate(${-cameraOffset.x}px, ${-cameraOffset.y}px)`,
          willChange: 'transform',
        }}
        tabIndex={0}
      />
    </div>
  );
};

export default GameCanvas;
