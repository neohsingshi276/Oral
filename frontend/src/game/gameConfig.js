// ── Game Configuration ────────────────────────────────────────────────────────
// Map dimensions come from the Tiled map.json (350×475 tiles × 16px each).
// These are used by GamePage for things like position validation — Phaser
// reads the actual dimensions from map.json at runtime.
export const TILE_SIZE = 16;
export const MAP_COLS = 350;
export const MAP_ROWS = 475;
export const MAP_WIDTH = MAP_COLS * TILE_SIZE;   // 5600
export const MAP_HEIGHT = MAP_ROWS * TILE_SIZE;   // 7600

// Character speed — pixels per second, handled by Phaser arcade physics
export const CHAR_SPEED = 180;

// Start position — near the bottom of the map, beside Checkpoint 1
export const START_POS = { x: 1376, y: 6896 };

/** Reject legacy sea defaults and out-of-bounds saves from the API. */
export const isValidSavedPosition = (x, y) =>
  Number.isFinite(x) &&
  Number.isFinite(y) &&
  x >= 100 &&
  y >= 100 &&
  x <= MAP_WIDTH - 100 &&
  y <= MAP_HEIGHT - 100;

const positionCacheKey = (playerId) => `dq_map_pos_${playerId}`;

const distanceFromStart = (pos) =>
  Math.hypot(pos.x - START_POS.x, pos.y - START_POS.y);

/** Browser backup so refresh works even before the server autosave runs. */
export const readCachedPosition = (playerId) => {
  try {
    const raw = localStorage.getItem(positionCacheKey(playerId));
    if (!raw) return null;
    const { x, y } = JSON.parse(raw);
    return isValidSavedPosition(x, y) ? { x, y } : null;
  } catch {
    return null;
  }
};

export const writeCachedPosition = (playerId, x, y) => {
  if (!playerId || !isValidSavedPosition(x, y)) return;
  try {
    localStorage.setItem(
      positionCacheKey(playerId),
      JSON.stringify({ x: Math.round(x), y: Math.round(y), savedAt: Date.now() })
    );
  } catch {
    // Storage full or private mode — ignore
  }
};

/**
 * Pick spawn after refresh: prefer the saved spot farthest from map start
 * (handles server still at START_POS while the player had already walked away).
 */
export const resolveSpawnPosition = (apiRow, playerId) => {
  const apiPos =
    apiRow && isValidSavedPosition(apiRow.pos_x, apiRow.pos_y)
      ? { x: apiRow.pos_x, y: apiRow.pos_y }
      : null;
  const localPos = readCachedPosition(playerId);

  if (apiPos && localPos) {
    return distanceFromStart(localPos) >= distanceFromStart(apiPos) ? localPos : apiPos;
  }
  return localPos || apiPos || { ...START_POS };
};

// Checkpoints — match CHECKPOINT_DEFS in PhaserGameScene.js
export const CHECKPOINTS = [
  { id: 1, x: 3040, y: 4960, radius: 60, color: '#7B2FBE', label: 'Checkpoint 1' },
  { id: 2, x: 2800, y: 2928, radius: 60, color: '#CC3380', label: 'Checkpoint 2' },
  { id: 3, x: 2864, y: 800, radius: 60, color: '#E85D04', label: 'Checkpoint 3' },
];

// Concluding video — shown after all 3 checkpoints are done, before the congrats screen
export const CONCLUDING_VIDEO_IDS = {
  bm: 'hYig94ALazM',
  bi: '2Gs2o_YEcYk',
};

// Video IDs keyed by language ('bm' = Bahasa Melayu, 'bi' = Bahasa Inggeris)
export const CHECKPOINT_VIDEO_IDS = {
  bm: {
    1: 'lzBabM39SUE',
    2: 'ZuysfO_GP9M',
    3: 'O6jGPTtBUMU',
  },
  bi: {
    1: 'phXLxdkYmfU',
    2: 'eQ9drrprp6s',
    3: 'cZo2-fxh89w',
  },
};