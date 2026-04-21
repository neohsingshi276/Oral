// ── Game Configuration ───────────────────────────────────────────────
// Map dimensions come from the Tiled map.json (350×475 tiles, 16px each)
export const TILE_SIZE = 16;
export const MAP_COLS = 350;
export const MAP_ROWS = 475;

export const MAP_WIDTH = MAP_COLS * TILE_SIZE;   // 5600
export const MAP_HEIGHT = MAP_ROWS * TILE_SIZE;  // 7600

// The map-base.jpg source image is 1176×1600px; the game world is scaled up
// to 5600×7600 so each original pixel covers MAP_SCALE game-world pixels.
export const MAP_IMG_WIDTH = 1176;
export const MAP_IMG_HEIGHT = 1600;
export const MAP_SCALE = MAP_WIDTH / MAP_IMG_WIDTH;   // ≈ 4.76

// Character
export const CHAR_SIZE = 16;
// Speed in px per frame at 60 fps (was accidentally set to 180, a Phaser
// px/second value — at 60fps that made the character fly across the map).
export const CHAR_SPEED = 3;   // ~180 px/s at 60 fps

// Start position — near the bottom of the map
export const START_POS = { x: 3296, y: 7200 };

// Checkpoints — positions taken from the triggervideocheckpoint object layer
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
