// ─── New map dimensions (map.json: 350 tiles × 16px = 5600, 475 tiles × 16px = 7600) ───
export const MAP_WIDTH = 350 * 16; // 5600
export const MAP_HEIGHT = 475 * 16; // 7600
export const TILE_SIZE = 16;

// ─── Legacy values kept for any non-Phaser references ───
export const MAP_SCALE = 1;
export const MAP_IMG_WIDTH = MAP_WIDTH;
export const MAP_IMG_HEIGHT = MAP_HEIGHT;
export const CHAR_SIZE = 16;

// Speed in px/frame → Phaser uses px/sec, so GameCanvas multiplies by 60
export const CHAR_SPEED = 2.5;

// ─── Start position ───
// Old map (3534×4800): start was ~(630, 4470)
// New map (5600×7600): scaled by ~1.585 × ~1.583
// ⚠️  Fine-tune these after you see the map rendered.
export const START_POS = { x: 1000, y: 7100 };

// ─── Checkpoints ───
// Coordinates are in the NEW map's pixel space (5600×7600).
// ⚠️  The values below are approximate (scaled from old map).
//     Open your game, check where each checkpoint visual lands,
//     and update x/y to match the actual location on the new map.
export const CHECKPOINTS = [
  {
    id: 1,
    x: 2520, y: 3850,
    radius: 60,
    color: '#7B2FBE',
    label: 'Checkpoint 1',
  },
  {
    id: 2,
    x: 2330, y: 2280,
    radius: 60,
    color: '#CC3380',
    label: 'Checkpoint 2',
  },
  {
    id: 3,
    x: 2283, y: 546,
    radius: 60,
    color: '#E85D04',
    label: 'Checkpoint 3',
  },
];

export const CHECKPOINT_VIDEO_IDS = {
  1: 'lzBabM39SUE',
  2: 'ZuysfO_GP9M',
  3: 'O6jGPTtBUMU',
};

// ─── All tileset image sources referenced by map.json ───
// Place every PNG in:  public/assets/tilesets/<filename>.png
export const TILESET_SOURCES = [
  'terrain.png',
  'Video.png',
  'plant repack.png',
  'plants.png',
  'rocks.png',
  'terrain_atlas.png',
  'base_out_atlas.png',
  'farming_fishing.png',
  'fence.png',
  'PathAndObjects.png',
  'town.png',
  'tileset_preview.png',
  'trees_plants.png',
  'transparent-bg-tiles.png',
  'forrestup.png',
  'chicken_walk.png',
  'cow_walk.png',
  'sheep_eat.png',
  'llama_walk.png',
  'decorations-medieval.png',
  'foodfromcts1a.png',
  'fence_alt.png',
  'fence_medieval.png',
  'fruit-trees.png',
  'thatched-roof.png',
  'cottage.png',
  'window_w_shutters.png',
  'castledoors.png',
  'monkeywin.png',
  'frm.png',
  'fossils3-Photoroom.png',
  'horse-brown.png',
  'horse-white.png',
  'horse-black.png',
  'bunnysheet5.png',
  '16oga (1).png',
  'Checkpoint1.png',
  'Checkpoint2.png',
  'Checkpoint3.png',
  'start-sign-means-don-t-wait-and-action-Photoroom.png',
  'forest_tiles.png',
  'Try.png',
  'A.png',
  'B.png',
];

// Each entry = { name: as-in-JSON, src: filename }
// name MUST exactly match the "name" field in map.json tilesets array.
export const TILESET_ENTRIES = [
  { name: 'terrain', src: 'terrain.png' },
  { name: 'Video', src: 'Video.png' },
  { name: 'plant repack', src: 'plant repack.png' },
  { name: 'plants', src: 'plants.png' },
  { name: 'rocks', src: 'rocks.png' },
  { name: 'terrain_atlas', src: 'terrain_atlas.png' },
  { name: 'base_out_atlas', src: 'base_out_atlas.png' },
  { name: 'farming_fishing', src: 'farming_fishing.png' },
  { name: 'fence', src: 'fence.png' },
  { name: 'plants', src: 'plants.png' },         // second occurrence same file
  { name: 'PathAndObjects', src: 'PathAndObjects.png' },
  { name: 'town', src: 'town.png' },
  { name: 'tileset_preview', src: 'tileset_preview.png' },
  { name: 'trees_plants', src: 'trees_plants.png' },
  { name: 'transparent-bg-tiles', src: 'transparent-bg-tiles.png' },
  { name: 'forrestup', src: 'forrestup.png' },
  { name: 'chicken_walk', src: 'chicken_walk.png' },
  { name: 'cow_walk', src: 'cow_walk.png' },
  { name: 'sheep_eat', src: 'sheep_eat.png' },
  { name: 'llama_walk', src: 'llama_walk.png' },
  { name: 'decorations-medieval', src: 'decorations-medieval.png' },
  { name: 'foodfromcts1a', src: 'foodfromcts1a.png' },
  { name: 'fence_alt', src: 'fence_alt.png' },
  { name: 'fence_medieval', src: 'fence_medieval.png' },
  { name: 'fruit-trees', src: 'fruit-trees.png' },
  { name: 'thatched-roof', src: 'thatched-roof.png' },
  { name: 'cottage', src: 'cottage.png' },
  { name: 'window_w_shutters', src: 'window_w_shutters.png' },
  { name: 'castledoors', src: 'castledoors.png' },
  { name: 'monkeywin', src: 'monkeywin.png' },
  { name: 'frm', src: 'frm.png' },
  { name: 'fossils3-Photoroom', src: 'fossils3-Photoroom.png' },
  { name: 'horse-brown', src: 'horse-brown.png' },
  { name: 'horse-white', src: 'horse-white.png' },
  { name: 'horse-black', src: 'horse-black.png' },
  { name: 'bunnysheet5', src: 'bunnysheet5.png' },
  { name: '16oga (1)', src: '16oga (1).png' },
  { name: 'Checkpoint1', src: 'Checkpoint1.png' },
  { name: 'Checkpoint2', src: 'Checkpoint2.png' },
  { name: 'Checkpoint3', src: 'Checkpoint3.png' },
  { name: 'start-sign-means-don-t-wait-and-action-Photoroom', src: 'start-sign-means-don-t-wait-and-action-Photoroom.png' },
  { name: 'Checkpoint1', src: 'Checkpoint1.png' },    // second occurrence same file
  { name: 'forest_tiles', src: 'forest_tiles.png' },
  { name: 'Try', src: 'Try.png' },
  { name: 'A', src: 'A.png' },
  { name: 'B', src: 'B.png' },
];
