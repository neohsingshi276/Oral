export const MAP_SCALE = 3;
export const MAP_IMG_WIDTH = 952;
export const MAP_IMG_HEIGHT = 1290;
export const MAP_WIDTH = MAP_IMG_WIDTH * MAP_SCALE;   // 2856
export const MAP_HEIGHT = MAP_IMG_HEIGHT * MAP_SCALE; // 3870
export const CHAR_SIZE = 28;
export const CHAR_SPEED = 2.5;

export const START_POS = { x: 235 * MAP_SCALE, y: 1168 * MAP_SCALE };

export const CHECKPOINTS = [
  { id: 1, x: 500 * MAP_SCALE, y: 840 * MAP_SCALE, radius: 40, color: '#7B2FBE', label: 'Checkpoint 1' },
  { id: 2, x: 460 * MAP_SCALE, y: 500 * MAP_SCALE, radius: 40, color: '#CC3380', label: 'Checkpoint 2' },
  { id: 3, x: 470 * MAP_SCALE, y: 118 * MAP_SCALE, radius: 40, color: '#E85D04', label: 'Checkpoint 3' },
];

export const CHECKPOINT_VIDEO_IDS = {
  1: 'lzBabM39SUE',
  2: 'ZuysfO_GP9M',
  3: 'O6jGPTtBUMU',
};