import { useEffect, useRef, useState, useCallback } from 'react';
import mapBase from '../assets/map-base.jpg';
import { MAP_WIDTH, MAP_HEIGHT, MAP_SCALE, MAP_IMG_WIDTH, MAP_IMG_HEIGHT, CHAR_SIZE, CHAR_SPEED, START_POS, CHECKPOINTS } from './gameConfig';
import collisionData from '../assets/collision-grid.json';
import api from '../services/api';

const SAVE_INTERVAL = 5000;

// Build collision lookup
const COLLISION_GRID = collisionData.grid;
const GRID_W = collisionData.width;   // tiles across original image
const GRID_H = collisionData.height;  // tiles down original image
const TILE_PX = collisionData.tileWidth; // pixels per tile in original image

/**
 * Check if a pixel position (in scaled/canvas coordinates) is walkable.
 * Convert from scaled coords → original image coords → tile coords.
 */
const isWalkable = (px, py) => {
  // Always allow near checkpoints and start position
  const nearSpecial = [START_POS, ...CHECKPOINTS].some(loc => {
    const lx = loc.x, ly = loc.y;
    const r = loc.radius || 30;
    return Math.abs(px - lx) < r + 10 && Math.abs(py - ly) < r + 10;
  });
  if (nearSpecial) return true;

  // Convert from scaled canvas coords to original image coords
  const imgX = px / MAP_SCALE;
  const imgY = py / MAP_SCALE;

  // Check a few points around the character's feet area
  const margin = 2;
  const halfW = 6;
  const feetY = imgY + 6;

  const points = [
    [imgX, feetY],                    // center bottom
    [imgX - halfW + margin, feetY],   // left foot
    [imgX + halfW - margin, feetY],   // right foot
    [imgX, feetY - 4],                // slightly above feet
  ];

  for (const [x, y] of points) {
    const tileX = Math.floor(x / TILE_PX);
    const tileY = Math.floor(y / TILE_PX);

    // Out of bounds = blocked
    if (tileX < 0 || tileX >= GRID_W || tileY < 0 || tileY >= GRID_H) return false;

    const row = COLLISION_GRID[tileY];
    if (!row || row[tileX] !== '1') return false;
  }
  return true;
};

const GameCanvas = ({ player, progress, onCheckpointReached }) => {
  const canvasRef = useRef(null);
  const charPos = useRef({ x: START_POS.x, y: START_POS.y });
  const keys = useRef({});
  const mapImg = useRef(null);
  const animRef = useRef(null);
  const lastSave = useRef(Date.now());
  const charFrame = useRef(0);
  const frameCount = useRef(0);
  const [nearCheckpoint, setNearCheckpoint] = useState(null);

  const getCompletedCPs = useCallback(() => {
    return progress.filter(p => p.completed).map(p => p.checkpoint_number);
  }, [progress]);

  const isCheckpointUnlocked = useCallback((cpId) => {
    if (cpId === 1) return true;
    return progress.find(p => p.checkpoint_number === cpId - 1)?.completed;
  }, [progress]);

  // Load saved position
  useEffect(() => {
    api.get(`/game/position/${player.id}`).then(res => {
      if (res.data.position) {
        const { pos_x, pos_y } = res.data.position;
        // Only use saved position if it's within valid map bounds (not in ocean)
        if (
          pos_x > 100 && pos_x < MAP_WIDTH - 100 &&
          pos_y > 100 && pos_y < MAP_HEIGHT - 100 &&
          isWalkable(pos_x, pos_y)
        ) {
          charPos.current = { x: pos_x, y: pos_y };
        } else {
          // Reset to START if saved position is invalid
          charPos.current = { x: START_POS.x, y: START_POS.y };
        }
      }
    }).catch(() => { });
  }, [player.id]);

  // Load map image
  useEffect(() => {
    const img = new Image();
    img.src = mapBase;
    img.onload = () => { mapImg.current = img; };
  }, []);

  // Keyboard events
  useEffect(() => {
    const onDown = (e) => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; keys.current[e.key] = true; e.preventDefault(); };
    const onUp = (e) => { keys.current[e.key] = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  // Save position periodically
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

      // Draw map at 3× scale
      if (mapImg.current) {
        ctx.drawImage(mapImg.current, 0, 0, MAP_WIDTH, MAP_HEIGHT);
      } else {
        ctx.fillStyle = '#2E86AB';
        ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
      }

      // Draw path between checkpoints (dashed red line)
      ctx.beginPath();
      ctx.setLineDash([12, 8]);
      ctx.strokeStyle = '#E8341A';
      ctx.lineWidth = 3;
      ctx.moveTo(START_POS.x, START_POS.y);
      CHECKPOINTS.forEach(cp => ctx.lineTo(cp.x, cp.y));
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw checkpoints
      CHECKPOINTS.forEach(cp => {
        const isCompleted = completed.includes(cp.id);
        const isUnlocked = isCheckpointUnlocked(cp.id);
        const isNear = nearCheckpoint === cp.id;

        // Outer glow when near
        if (isNear && isUnlocked && !isCompleted) {
          ctx.beginPath();
          ctx.arc(cp.x, cp.y, 52, 0, Math.PI * 2);
          ctx.fillStyle = cp.color + '33';
          ctx.fill();
        }

        // Circle
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 28, 0, Math.PI * 2);
        ctx.fillStyle = isCompleted ? '#16a34a' : isUnlocked ? cp.color : '#94a3b8';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Number or check
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isCompleted ? '✓' : String(cp.id), cp.x, cp.y);

        // Label
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(cp.label, cp.x + 38, cp.y - 10);

        // Locked badge
        if (!isUnlocked && !isCompleted) {
          ctx.fillStyle = '#fff';
          ctx.font = '14px sans-serif';
          ctx.fillText('🔒', cp.x + 30, cp.y + 10);
        }

        // Enter prompt
        if (isNear && isUnlocked && !isCompleted) {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('Press E to enter', cp.x, cp.y + 50);
        }
      });

      // Draw START marker
      ctx.beginPath();
      ctx.arc(START_POS.x, START_POS.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD700';
      ctx.fill();
      ctx.strokeStyle = '#C8A800';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#5A4000';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('START', START_POS.x, START_POS.y);

      // Draw character (simple animated sprite)
      frameCount.current++;
      if (frameCount.current % 8 === 0) charFrame.current = (charFrame.current + 1) % 4;

      const cx = charPos.current.x;
      const cy = charPos.current.y;
      const isMoving = keys.current['w'] || keys.current['s'] || keys.current['a'] || keys.current['d'] ||
        keys.current['ArrowUp'] || keys.current['ArrowDown'] || keys.current['ArrowLeft'] || keys.current['ArrowRight'];

      // Body
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(cx - 10, cy - 6, 20, 22, 4);
      ctx.fill();

      // Head
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.arc(cx, cy - 14, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Eyes
      ctx.fillStyle = '#1e3a5f';
      ctx.beginPath(); ctx.arc(cx - 4, cy - 15, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 4, cy - 15, 2, 0, Math.PI * 2); ctx.fill();

      // Smile
      ctx.beginPath();
      ctx.arc(cx, cy - 12, 5, 0.2, Math.PI - 0.2);
      ctx.strokeStyle = '#1e3a5f';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Legs (animated)
      const legOffset = isMoving ? Math.sin(frameCount.current * 0.3) * 4 : 0;
      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(cx - 8, cy + 16, 7, 10 + legOffset);
      ctx.fillRect(cx + 1, cy + 16, 7, 10 - legOffset);

      // Nickname above character
      ctx.fillStyle = '#fff';
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

      if (keys.current['w'] || keys.current['ArrowUp']) dy = -CHAR_SPEED;
      if (keys.current['s'] || keys.current['ArrowDown']) dy = CHAR_SPEED;
      if (keys.current['a'] || keys.current['ArrowLeft']) dx = -CHAR_SPEED;
      if (keys.current['d'] || keys.current['ArrowRight']) dx = CHAR_SPEED;

      // Diagonal speed normalization
      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

      // Collision-checked movement
      const newX = Math.max(CHAR_SIZE, Math.min(MAP_WIDTH - CHAR_SIZE, pos.x + dx));
      const newY = Math.max(CHAR_SIZE, Math.min(MAP_HEIGHT - CHAR_SIZE, pos.y + dy));

      // Try moving on both axes
      if (isWalkable(newX, newY)) {
        pos.x = newX;
        pos.y = newY;
      }
      // Try X only (slide along horizontal wall)
      else if (dx !== 0 && isWalkable(newX, pos.y)) {
        pos.x = newX;
      }
      // Try Y only (slide along vertical wall)
      else if (dy !== 0 && isWalkable(pos.x, newY)) {
        pos.y = newY;
      }

      // Check near checkpoint
      let near = null;
      CHECKPOINTS.forEach(cp => {
        const dist = Math.sqrt((pos.x - cp.x) ** 2 + (pos.y - cp.y) ** 2);
        if (dist < cp.radius + 20) near = cp.id;
      });
      setNearCheckpoint(near);

      // Press E to enter checkpoint
      if (keys.current['e'] || keys.current['E']) {
        if (near) {
          const cp = CHECKPOINTS.find(c => c.id === near);
          const isUnlocked = isCheckpointUnlocked(cp.id);
          const completed = getCompletedCPs();
          if (isUnlocked && !completed.includes(cp.id)) {
            keys.current['e'] = false;
            keys.current['E'] = false;
            onCheckpointReached(cp.id);
          }
        }
      }

      // Auto save position
      if (Date.now() - lastSave.current > SAVE_INTERVAL) {
        lastSave.current = Date.now();
        savePosition();
      }

      draw();
      animRef.current = requestAnimationFrame(update);
    };

    animRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animRef.current);
  }, [player, progress, nearCheckpoint, onCheckpointReached, savePosition, getCompletedCPs, isCheckpointUnlocked]);

  // Camera: follow character via CSS transform
  const viewW = typeof window !== 'undefined' ? window.innerWidth - 32 : 1200;
  const viewH = typeof window !== 'undefined' ? window.innerHeight - 130 : 800;
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });

  // Update camera offset in game loop
  useEffect(() => {
    const updateCamera = () => {
      const targetX = Math.max(0, Math.min(MAP_WIDTH - viewW, charPos.current.x - viewW / 2));
      const targetY = Math.max(0, Math.min(MAP_HEIGHT - viewH, charPos.current.y - viewH / 2));
      setCameraOffset(prev => {
        // Smooth camera lerp
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
    <div style={{ width: `${viewW}px`, height: `${viewH}px`, overflow: 'hidden', borderRadius: '12px', border: '3px solid #1e3a5f', position: 'relative' }}>
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
