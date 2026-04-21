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
  { key: 'terrain',           file: 'terrain.png' },
  { key: 'Video',             file: 'Video.png' },
  { key: 'plant repack',      file: 'plant repack.png' },
  { key: 'plants',            file: 'plants.png' },
  { key: 'rocks',             file: 'rocks.png' },
  { key: 'terrain_atlas',     file: 'terrain_atlas.png' },
  { key: 'base_out_atlas',    file: 'base_out_atlas.png' },
  { key: 'farming_fishing',   file: 'farming_fishing.png' },
  { key: 'fence',             file: 'fence.png' },
  { key: 'plants_2',          file: 'plants.png' },           // duplicate
  { key: 'PathAndObjects',    file: 'PathAndObjects.png' },
  { key: 'town',              file: 'town.png' },
  { key: 'tileset_preview',   file: 'tileset_preview.png' },
  { key: 'trees_plants',      file: 'trees_plants.png' },
  { key: 'transparent-bg-tiles', file: 'transparent-bg-tiles.png' },
  { key: 'forrestup',         file: 'forrestup.png' },
  { key: 'chicken_walk',      file: 'chicken_walk.png' },
  { key: 'cow_walk',          file: 'cow_walk.png' },
  { key: 'sheep_eat',         file: 'sheep_eat.png' },
  { key: 'llama_walk',        file: 'llama_walk.png' },
  { key: 'decorations-medieval', file: 'decorations-medieval.png' },
  { key: 'foodfromcts1a',     file: 'foodfromcts1a.png' },
  { key: 'fence_alt',         file: 'fence_alt.png' },
  { key: 'fence_medieval',    file: 'fence_medieval.png' },
  { key: 'fruit-trees',       file: 'fruit-trees.png' },
  { key: 'thatched-roof',     file: 'thatched-roof.png' },
  { key: 'cottage',           file: 'cottage.png' },
  { key: 'window_w_shutters', file: 'window_w_shutters.png' },
  { key: 'castledoors',       file: 'castledoors.png' },
  { key: 'monkeywin',         file: 'monkeywin.png' },
  { key: 'frm',               file: 'frm.png' },
  { key: 'fossils3-Photoroom', file: 'fossils3-Photoroom.png' },
  { key: 'horse-brown',       file: 'horse-brown.png' },
  { key: 'horse-white',       file: 'horse-white.png' },
  { key: 'horse-black',       file: 'horse-black.png' },
  { key: 'bunnysheet5',       file: 'bunnysheet5.png' },
  { key: '16oga (1)',         file: '16oga (1).png' },
  { key: 'Checkpoint1',       file: 'Checkpoint1.png' },
  { key: 'Checkpoint2',       file: 'Checkpoint2.png' },
  { key: 'Checkpoint3',       file: 'Checkpoint3.png' },
  { key: 'start-sign-means-don-t-wait-and-action-Photoroom', file: 'start-sign-means-don-t-wait-and-action-Photoroom.png' },
  { key: 'Checkpoint1_2',     file: 'Checkpoint1.png' },      // duplicate
  { key: 'forest_tiles',      file: 'forest_tiles.png' },
  { key: 'Try',               file: 'Try.png' },
  { key: 'A',                 file: 'A.png' },
  { key: 'B',                 file: 'B.png' },
];

// The order above matches the order of tilesets in map.json — this is critical
// because addTilesetImage must be called in the same order as the JSON declares them.

// ── Checkpoint definitions ───────────────────────────────────────────────────
// The `triggervideocheckpoint` object layer has 6 point objects.
// We map them to our 3 game checkpoints based on visual position on the map.
// Obj id=13 (x:3296, y:6880) → bottom of map → CP1 (start area)
// Obj id=14 (x:2880, y:4832) → middle area → CP2
// Obj id=15 (x:2752, y:624)  → top of map → CP3
const CHECKPOINT_DEFS = [
  { id: 1, x: 3296, y: 6880, radius: 60, color: 0x7B2FBE, label: 'Checkpoint 1' },
  { id: 2, x: 2880, y: 4832, radius: 60, color: 0xCC3380, label: 'Checkpoint 2' },
  { id: 3, x: 2752, y: 624,  radius: 60, color: 0xE85D04, label: 'Checkpoint 3' },
];

// Player start position — near the bottom of the map (near CP1)
const START_X = 3296;
const START_Y = 7200;
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
    // Callbacks from React
    this.onNearCheckpoint = data.onNearCheckpoint || (() => {});
    this.onCheckpointReached = data.onCheckpointReached || (() => {});
    this.onLoadProgress = data.onLoadProgress || (() => {});
    this.onLoadComplete = data.onLoadComplete || (() => {});
    this.getProgress = data.getProgress || (() => []);
    this.getIsCheckpointUnlocked = data.getIsCheckpointUnlocked || (() => true);
    this.playerNickname = data.playerNickname || 'Player';
    this.initialPos = data.initialPos || null;
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

    // ── Collision bodies from object layers ───────────────────────────
    this.collisionGroup = this.physics.add.staticGroup();

    const addCollisionObjects = (layerName) => {
      const objectLayer = map.getObjectLayer(layerName);
      if (!objectLayer) return;

      objectLayer.objects.forEach(obj => {
        if (obj.ellipse) {
          // Ellipse: represented as a rectangle body
          const body = this.collisionGroup.create(
            obj.x + obj.width / 2,
            obj.y + obj.height / 2,
            null
          );
          body.setVisible(false);
          body.body.setSize(obj.width, obj.height);
          body.body.setOffset(-obj.width / 2, -obj.height / 2);
        } else if (obj.polygon) {
          // Polygon: approximate with bounding box
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          obj.polygon.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          });
          const w = maxX - minX;
          const h = maxY - minY;
          if (w > 0 && h > 0) {
            const body = this.collisionGroup.create(
              obj.x + minX + w / 2,
              obj.y + minY + h / 2,
              null
            );
            body.setVisible(false);
            body.body.setSize(w, h);
            body.body.setOffset(-w / 2, -h / 2);
          }
        } else if (obj.width > 0 && obj.height > 0) {
          // Rectangle
          const body = this.collisionGroup.create(
            obj.x + obj.width / 2,
            obj.y + obj.height / 2,
            null
          );
          body.setVisible(false);
          body.body.setSize(obj.width, obj.height);
          body.body.setOffset(-obj.width / 2, -obj.height / 2);
        }
      });
    };

    addCollisionObjects('collisionbelowplayer');
    addCollisionObjects('collisionupperplayer');

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

    // Physics body for player (invisible, used for collisions)
    this.playerBody = this.physics.add.sprite(startX, startY, null);
    this.playerBody.setVisible(false);
    this.playerBody.body.setSize(16, 16);
    this.playerBody.setCollideWorldBounds(true);

    // Collide player with collision objects
    this.physics.add.collider(this.playerBody, this.collisionGroup);

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
