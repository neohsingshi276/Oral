// ── Game Configuration ────────────────────────────────────────────────────────
// Map dimensions come from the Tiled map.json (350×475 tiles × 16px each).
// These are used by GamePage for things like position validation — Phaser
// reads the actual dimensions from map.json at runtime.
export const TILE_SIZE  = 16;
export const MAP_COLS   = 350;
export const MAP_ROWS   = 475;
export const MAP_WIDTH  = MAP_COLS * TILE_SIZE;   // 5600
export const MAP_HEIGHT = MAP_ROWS * TILE_SIZE;   // 7600

// Character speed — pixels per second, handled by Phaser arcade physics
export const CHAR_SPEED = 180;

// Start position — near the bottom of the map, beside Checkpoint 1
export const START_POS = { x: 3296, y: 7100 };

// Checkpoints — match CHECKPOINT_DEFS in PhaserGameScene.js
export const CHECKPOINTS = [
  { id: 1, x: 3296, y: 6880, radius: 60, color: '#7B2FBE', label: 'Checkpoint 1' },
  { id: 2, x: 2880, y: 4832, radius: 60, color: '#CC3380', label: 'Checkpoint 2' },
  { id: 3, x: 2752, y: 624,  radius: 60, color: '#E85D04', label: 'Checkpoint 3' },
];

export const CHECKPOINT_VIDEO_IDS = {
  1: 'lzBabM39SUE',
  2: 'ZuysfO_GP9M',
  3: 'O6jGPTtBUMU',
};
