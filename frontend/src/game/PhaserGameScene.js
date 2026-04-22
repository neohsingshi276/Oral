import Phaser from 'phaser';

/**
 * PhaserGameScene
 * ───────────────
 * Loads the `map.json` Tiled tilemap and all referenced tileset images,
 * renders every visible tile layer, builds collision walls from the two
 * object-group layers (`collisionbelowplayer`, `collisionupperplayer`),
 * and drives the player sprite + camera.
 *
 * Communication with React happens through callback functions passed in
 * via `this.scene.settings.data`.
 */

// ── Tileset images referenced by map.json ─────────────────────────────────────
// Each entry maps to an image in /public/assets/.
// Phaser requires unique *keys* – two tilesets share the name "plants" and
// "Checkpoint1" in the JSON, so we suffix duplicates with _2.
const TILESET_ASSETS = [
  { key: 'terrain', file: 'terrain.png' },
  { key: 'Video', file: 'Video.png' },
  { key: 'plant repack', file: 'plant repack.png' },
  { key: 'plants', file: 'plants.png' },
  { key: 'rocks', file: 'rocks.png' },
  { key: 'terrain_atlas', file: 'terrain_atlas.png' },
  { key: 'base_out_atlas', file: 'base_out_atlas.png' },
  { key: 'farming_fishing', file: 'farming_fishing.png' },
  { key: 'fence', file: 'fence.png' },
  { key: 'plants_2', file: 'plants.png' },           // duplicate
  { key: 'PathAndObjects', file: 'PathAndObjects.png' },
  { key: 'town', file: 'town.png' },
  { key: 'tileset_preview', file: 'tileset_preview.png' },
  { key: 'trees_plants', file: 'trees_plants.png' },
  { key: 'transparent-bg-tiles', file: 'transparent-bg-tiles.png' },
  { key: 'forrestup', file: 'forrestup.png' },
  { key: 'chicken_walk', file: 'chicken_walk.png' },
  { key: 'cow_walk', file: 'cow_walk.png' },
  { key: 'sheep_eat', file: 'sheep_eat.png' },
  { key: 'llama_walk', file: 'llama_walk.png' },
  { key: 'decorations-medieval', file: 'decorations-medieval.png' },
  { key: 'foodfromcts1a', file: 'foodfromcts1a.png' },
  { key: 'fence_alt', file: 'fence_alt.png' },
  { key: 'fence_medieval', file: 'fence_medieval.png' },
  { key: 'fruit-trees', file: 'fruit-trees.png' },
  { key: 'thatched-roof', file: 'thatched-roof.png' },
  { key: 'cottage', file: 'cottage.png' },
  { key: 'window_w_shutters', file: 'window_w_shutters.png' },
  { key: 'castledoors', file: 'castledoors.png' },
  { key: 'monkeywin', file: 'monkeywin.png' },
  { key: 'frm', file: 'frm.png' },
  { key: 'fossils3-Photoroom', file: 'fossils3-Photoroom.png' },
  { key: 'horse-brown', file: 'horse-brown.png' },
  { key: 'horse-white', file: 'horse-white.png' },
  { key: 'horse-black', file: 'horse-black.png' },
  { key: 'bunnysheet5', file: 'bunnysheet5.png' },
  { key: '16oga (1)', file: '16oga (1).png' },
  { key: 'Checkpoint1', file: 'Checkpoint1.png' },
  { key: 'Checkpoint2', file: 'Checkpoint2.png' },
  { key: 'Checkpoint3', file: 'Checkpoint3.png' },
  { key: 'start-sign-means-don-t-wait-and-action-Photoroom', file: 'start-sign-means-don-t-wait-and-action-Photoroom.png' },
  { key: 'Checkpoint1_2', file: 'Checkpoint1.png' },      // duplicate
  { key: 'forest_tiles', file: 'forest_tiles.png' },
  { key: 'Try', file: 'Try.png' },
  { key: 'A', file: 'A.png' },
  { key: 'B', file: 'B.png' },
];

// The order above matches the order of tilesets in map.json — this is critical
// because addTilesetImage must be called in the same order as the JSON declares them.

// ── Checkpoint definitions ───────────────────────────────────────────────────
// Positions matched to the actual Checkpoint1/2/3 TILESET GRAPHICS on the
// checkpointroad layer (verified from map.json tile scan):
//   Checkpoint1 graphic centre: (3040, 4800) — nearest trigger id=14 (2880,4832)
//   Checkpoint2 graphic centre: (2808, 2800) — nearest trigger id=10 (2640,2832)
//   Checkpoint3 graphic centre: (2880,  624) — nearest trigger id=15 (2752, 624)
// Trigger points snapped to graphic centres so the marker sits on the sign.
const CHECKPOINT_DEFS = [
  { id: 1, x: 3040, y: 4800, radius: 80, color: 0x7B2FBE, label: 'Checkpoint 1' },
  { id: 2, x: 2808, y: 2800, radius: 80, color: 0xCC3380, label: 'Checkpoint 2' },
  { id: 3, x: 2880, y: 624, radius: 80, color: 0xE85D04, label: 'Checkpoint 3' },
];

// Player start position — at the START SIGN on the checkpointroad layer.
// The start sign tiles span x=1072–1680, y=6816–6992 (centre x=1376).
// Player spawns just ABOVE the sign at y=6784 so they walk DOWN onto it.
const START_X = 1376;
const START_Y = 6784;
const PLAYER_SPEED = 180;

// Tile layer names from Tiled (the order determines z-order)
const TILE_LAYER_NAMES = [
  'map',
  'checkpointroad',
  'colourfloor',
  'fenceback',
  'fencemid',
  'cansitstarmushroomcaterpillarrockgrass',
  'layer1',
  'layer2',
  'fencefrontlayer3',
  'fishlowopacity',
  'smalltree',
  'bigtree',
];

export default class PhaserGameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PhaserGameScene' });
  }

  init(data) {
    // Callbacks arrive either via scene.start(key, data) or patched directly
    // onto the instance by GameCanvas after the Phaser 'ready' event fires.
    // We only overwrite if data actually provides a value.
    if (data?.onNearCheckpoint) this.onNearCheckpoint = data.onNearCheckpoint;
    if (data?.onCheckpointReached) this.onCheckpointReached = data.onCheckpointReached;
    if (data?.onLoadProgress) this.onLoadProgress = data.onLoadProgress;
    if (data?.onLoadComplete) this.onLoadComplete = data.onLoadComplete;
    if (data?.getProgress) this.getProgress = data.getProgress;
    if (data?.getIsCheckpointUnlocked) this.getIsCheckpointUnlocked = data.getIsCheckpointUnlocked;
    if (data?.playerNickname) this.playerNickname = data.playerNickname;
    if (data?.initialPos) this.initialPos = data.initialPos;

    // Safe defaults so create() never crashes on undefined callbacks
    this.onNearCheckpoint = this.onNearCheckpoint || (() => { });
    this.onCheckpointReached = this.onCheckpointReached || (() => { });
    this.onLoadProgress = this.onLoadProgress || (() => { });
    this.onLoadComplete = this.onLoadComplete || (() => { });
    this.getProgress = this.getProgress || (() => []);
    this.getIsCheckpointUnlocked = this.getIsCheckpointUnlocked || (() => true);
    this.playerNickname = this.playerNickname || 'Player';
    this.initialPos = this.initialPos || null;
  }

  preload() {
    // Loading progress
    this.load.on('progress', (value) => {
      this.onLoadProgress(value);
    });
    this.load.on('complete', () => {
      this.onLoadComplete();
    });

    // Load tilemap JSON
    this.load.tilemapTiledJSON('mainmap', '/assets/map.json');

    // Load all tileset images
    TILESET_ASSETS.forEach(({ key, file }) => {
      this.load.image(key, `/assets/${file}`);
    });

    // Load character sprite sheet (PokemonLike has a walking character)
    this.load.spritesheet('playerSprite', '/assets/PokemonLike.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  create() {
    // ── Create tilemap ───────────────────────────────────────────────
    const map = this.make.tilemap({ key: 'mainmap' });

    // Add tilesets — order must match the JSON tileset array exactly.
    // The first arg is the tileset name in Tiled, second is the Phaser image key.
    const tilesetNames = map.tilesets.map(ts => ts.name);
    const tilesets = [];

    // Build a mapping between JSON tileset names (possibly duplicated) and our unique keys
    const usedNames = {};
    for (let i = 0; i < tilesetNames.length; i++) {
      const jsonName = tilesetNames[i];
      let phaserKey;
      if (usedNames[jsonName]) {
        // This is a duplicate name — use the _2 variant
        phaserKey = jsonName + '_2';
        usedNames[jsonName]++;
      } else {
        phaserKey = jsonName;
        usedNames[jsonName] = 1;
      }
      const ts = map.addTilesetImage(jsonName, phaserKey);
      if (ts) tilesets.push(ts);
    }

    // ── Create tile layers ───────────────────────────────────────────
    this.tileLayers = [];
    TILE_LAYER_NAMES.forEach(name => {
      const layer = map.createLayer(name, tilesets);
      if (layer) {
        this.tileLayers.push(layer);
      }
    });

    // ── World bounds ─────────────────────────────────────────────────
    const mapWidthPx = map.widthInPixels;
    const mapHeightPx = map.heightInPixels;
    this.physics.world.setBounds(0, 0, mapWidthPx, mapHeightPx);

    // NOTE: Sea tile collision (setCollisionByExclusion) has been removed.
    // It was marking nearly every tile as solid because the WALKABLE_GIDS list
    // was incomplete, blocking the player at spawn and preventing movement.
    // World boundary is enforced by setCollideWorldBounds(true) on the player.

    // ── Collision bodies from object layers ───────────────────────────
    // ONE StaticGroup for all collision shapes.  A single physics.add.collider()
    // call against a group is O(1) setup instead of O(N) individual calls,
    // which is what caused the black-screen freeze on load.
    this.collisionGroup = this.physics.add.staticGroup();

    // ── Collision filter helpers ─────────────────────────────────────────
    // collisionbelowplayer  = ground-level items (fences, rocks, bushes)
    // collisionupperplayer  = upper items drawn above the player (tree trunks)
    //
    // Per design:
    //   • Tree SHADOWS (ellipses in below-layer)  → skip (walk through)
    //   • Small STONES  (≤32×16 rects in below)   → skip (walk through)
    //   • Tree TRUNKS   (upper-layer polygons)     → keep (solid)
    //   • Fences/walls  (larger rects/polygons)    → keep (solid)

    const shouldSkipBelowObj = (obj) => {
      // Skip all ellipses (tree shadows / canopy footprints)
      if (obj.ellipse) return true;
      // Skip tiny flat rects that are small stones / pebbles
      const w = obj.width || 0;
      const h = obj.height || 0;
      if (!obj.ellipse && !obj.polygon && w <= 32 && h <= 16) return true;
      if (!obj.ellipse && !obj.polygon && w <= 16 && h <= 32) return true;
      return false;
    };

    const buildCollisionLayer = (layerName) => {
      const objectLayer = map.getObjectLayer(layerName);
      if (!objectLayer) return;

      const isBelowLayer = layerName === 'collisionbelowplayer';

      // Group objects at the same (x,y) — Tiled splits sloped tiles into
      // two polygons at the same origin. Merge their bboxes into one body.
      const byPos = new Map();
      objectLayer.objects.forEach(obj => {
        if (isBelowLayer && shouldSkipBelowObj(obj)) return; // skip shadows/stones
        const key = `${obj.x},${obj.y}`;
        if (!byPos.has(key)) byPos.set(key, []);
        byPos.get(key).push(obj);
      });

      byPos.forEach(objs => {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        objs.forEach(obj => {
          if (obj.ellipse) {
            x0 = Math.min(x0, obj.x); y0 = Math.min(y0, obj.y);
            x1 = Math.max(x1, obj.x + obj.width); y1 = Math.max(y1, obj.y + obj.height);
          } else if (obj.polygon) {
            obj.polygon.forEach(p => {
              x0 = Math.min(x0, obj.x + p.x); y0 = Math.min(y0, obj.y + p.y);
              x1 = Math.max(x1, obj.x + p.x); y1 = Math.max(y1, obj.y + p.y);
            });
          } else if (obj.width > 0 && obj.height > 0) {
            x0 = Math.min(x0, obj.x); y0 = Math.min(y0, obj.y);
            x1 = Math.max(x1, obj.x + obj.width); y1 = Math.max(y1, obj.y + obj.height);
          }
        });

        const w = x1 - x0;
        const h = y1 - y0;
        if (w > 0 && h > 0) {
          const zone = this.add.zone(x0 + w / 2, y0 + h / 2, w, h);
          this.collisionGroup.add(zone, true);
        }
      });
    };

    buildCollisionLayer('collisionbelowplayer');
    buildCollisionLayer('collisionupperplayer');
    this.collisionGroup.refresh();

    // ── Player sprite ────────────────────────────────────────────────
    const startX = this.initialPos?.x || START_X;
    const startY = this.initialPos?.y || START_Y;

    // Create the player with arcade physics, using a simple graphic character
    this.playerGraphic = this.add.container(startX, startY);

    // Body (blue rectangle)
    const body = this.add.rectangle(0, 3, 18, 20, 0x2563eb);
    body.setOrigin(0.5, 0.5);

    // Head (yellow circle)
    const head = this.add.circle(0, -12, 10, 0xFBBF24);
    head.setStrokeStyle(1.5, 0xD97706);

    // Eyes
    const eyeL = this.add.circle(-3, -13, 1.5, 0x1e3a5f);
    const eyeR = this.add.circle(3, -13, 1.5, 0x1e3a5f);

    // Legs
    this.legL = this.add.rectangle(-4, 19, 6, 9, 0x1e3a5f);
    this.legR = this.add.rectangle(4, 19, 6, 9, 0x1e3a5f);

    // Name label background
    const nameText = this.add.text(0, -30, this.playerNickname, {
      fontSize: '10px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
    });
    nameText.setOrigin(0.5, 1);
    const nameBg = this.add.rectangle(0, -25, nameText.width + 8, 14, 0x000000, 0.6);
    nameBg.setOrigin(0.5, 1);

    this.playerGraphic.add([nameBg, nameText, body, head, eyeL, eyeR, this.legL, this.legR]);
    this.playerGraphic.setDepth(100);

    // Physics body for player (invisible rectangle — avoids null-texture bug
    // where physics.add.sprite(x, y, null) places the body at (0,0) instead
    // of the requested position and breaks movement registration).
    this.playerBody = this.physics.add.image(startX, startY, '__DEFAULT');
    this.playerBody.setVisible(false);
    // Hitbox = only the lower body (legs/feet area).
    // The visible character is ~28px tall; we set a 14×8 hitbox offset
    // downward (+10px) so only feet collide — the player can overlap
    // tree canopies, signs and upper decorations without getting stuck.
    this.playerBody.setDisplaySize(14, 8);
    this.playerBody.body.setSize(14, 8);
    this.playerBody.body.setOffset(0, 10);
    this.playerBody.setCollideWorldBounds(true);
    this.playerBody.setPosition(startX, startY);

    // ONE collider call covers every shape in the group — O(1) not O(N).
    this.physics.add.collider(this.playerBody, this.collisionGroup);

    // NOTE: We intentionally do NOT add a collider against the base tile layer.
    // The setCollisionByExclusion approach marks almost every tile as solid,
    // which blocks the player at the spawn position and prevents walking.
    // Collision is already handled by the explicit object layers above.

    // ── Checkpoint markers ───────────────────────────────────────────
    this.checkpointGraphics = [];
    CHECKPOINT_DEFS.forEach(cp => {
      const container = this.add.container(cp.x, cp.y);
      container.setDepth(90);

      // Outer glow (shown when near)
      const glow = this.add.circle(0, 0, cp.radius, cp.color, 0.2);
      glow.setVisible(false);

      // Main circle
      const circle = this.add.circle(0, 0, 22, cp.color);
      circle.setStrokeStyle(3, 0xffffff);

      // ID text
      const idText = this.add.text(0, 0, String(cp.id), {
        fontSize: '16px',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
      });
      idText.setOrigin(0.5, 0.5);

      // Label
      const labelText = this.add.text(32, -8, cp.label, {
        fontSize: '11px',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        color: '#FFD700',
      });

      // Press E hint
      const hintText = this.add.text(0, 42, 'Press E to enter', {
        fontSize: '10px',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
      });
      hintText.setOrigin(0.5, 0.5);
      hintText.setVisible(false);

      // Lock icon
      const lockText = this.add.text(26, 6, '🔒', {
        fontSize: '12px',
      });
      lockText.setVisible(false);

      container.add([glow, circle, idText, labelText, hintText, lockText]);
      this.checkpointGraphics.push({
        cpDef: cp,
        container,
        glow,
        circle,
        idText,
        labelText,
        hintText,
        lockText,
      });
    });

    // ── Camera ───────────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, mapWidthPx, mapHeightPx);
    this.cameras.main.startFollow(this.playerBody, true, 0.12, 0.12);
    this.cameras.main.setZoom(2);

    // ── Input ────────────────────────────────────────────────────────
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // ── State ────────────────────────────────────────────────────────
    this.nearCheckpointId = null;
    this.walkFrame = 0;
    this.isPaused = false;

    // Store map reference for position saving
    this.mapWidthPx = mapWidthPx;
    this.mapHeightPx = mapHeightPx;
  }

  update(_time, _delta) {
    if (this.isPaused) {
      this.playerBody.setVelocity(0, 0);
      return;
    }

    // ── Movement ─────────────────────────────────────────────────────
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.a.isDown) vx = -PLAYER_SPEED;
    if (this.cursors.right.isDown || this.wasd.d.isDown) vx = PLAYER_SPEED;
    if (this.cursors.up.isDown || this.wasd.w.isDown) vy = -PLAYER_SPEED;
    if (this.cursors.down.isDown || this.wasd.s.isDown) vy = PLAYER_SPEED;

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.playerBody.setVelocity(vx, vy);

    // Sync the visible graphic to the physics body
    this.playerGraphic.setPosition(this.playerBody.x, this.playerBody.y);

    // Leg animation
    const isMoving = vx !== 0 || vy !== 0;
    if (isMoving) {
      this.walkFrame += 0.15;
      const legOffset = Math.sin(this.walkFrame) * 3;
      this.legL.y = 19 + legOffset;
      this.legR.y = 19 - legOffset;
    } else {
      this.legL.y = 19;
      this.legR.y = 19;
    }

    // ── Checkpoint proximity ─────────────────────────────────────────
    const progress = this.getProgress();
    const completedCPs = progress.filter(p => p.completed).map(p => p.checkpoint_number);

    let near = null;
    CHECKPOINT_DEFS.forEach(cp => {
      const dist = Phaser.Math.Distance.Between(
        this.playerBody.x, this.playerBody.y, cp.x, cp.y
      );
      if (dist < cp.radius + 20) near = cp.id;
    });

    // Update checkpoint visuals
    this.checkpointGraphics.forEach(({ cpDef, glow, circle, idText, hintText, lockText }) => {
      const isCompleted = completedCPs.includes(cpDef.id);
      const isUnlocked = this.getIsCheckpointUnlocked(cpDef.id);
      const isNear = near === cpDef.id;

      // Update circle color
      if (isCompleted) {
        circle.setFillStyle(0x16a34a);
        idText.setText('✓');
      } else if (isUnlocked) {
        circle.setFillStyle(cpDef.color);
        idText.setText(String(cpDef.id));
      } else {
        circle.setFillStyle(0x94a3b8);
        idText.setText(String(cpDef.id));
      }

      // Glow
      glow.setVisible(isNear && isUnlocked && !isCompleted);

      // Hint
      hintText.setVisible(isNear && isUnlocked && !isCompleted);

      // Lock
      lockText.setVisible(!isUnlocked && !isCompleted);
    });

    if (near !== this.nearCheckpointId) {
      this.nearCheckpointId = near;
      this.onNearCheckpoint(near);
    }

    // ── Press E to enter checkpoint ──────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(this.keyE) && near) {
      const isUnlocked = this.getIsCheckpointUnlocked(near);
      const isCompleted = completedCPs.includes(near);
      if (isUnlocked && !isCompleted) {
        this.onCheckpointReached(near);
      }
    }
  }

  // Called from React when a modal opens
  pauseGame() {
    this.isPaused = true;
  }

  // Called from React when a modal closes
  resumeGame() {
    this.isPaused = false;
  }

  // Get current player position for saving
  getPlayerPosition() {
    return {
      x: this.playerBody?.x || START_X,
      y: this.playerBody?.y || START_Y,
    };
  }

  // Set player position (e.g., loaded from server)
  setPlayerPosition(x, y) {
    if (this.playerBody) {
      this.playerBody.setPosition(x, y);
      this.playerGraphic.setPosition(x, y);
    }
  }
}

export { CHECKPOINT_DEFS, START_X, START_Y };
