import Phaser from 'phaser';
import { START_POS } from './gameConfig';
import { CHECKPOINTS } from './gameConfig';

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
  { key: 'Arrows', file: 'Arrows.png' },
];

// The order above matches the order of tilesets in map.json — this is critical
// because addTilesetImage must be called in the same order as the JSON declares them.

// ── Checkpoint definitions ───────────────────────────────────────────────────
// The `triggervideocheckpoint` object layer has 6 point objects.
// We map them to our 3 game checkpoints based on visual position on the map.
// Obj id=13 (x:3296, y:6880) → bottom of map → CP1 (start area)
// Obj id=14 (x:2880, y:4832) → middle area → CP2
// Obj id=15 (x:2752, y:624)  → top of map → CP3

// Player start position — near the bottom of the map (near CP1)
const PLAYER_SPEED = 2;

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
      // We defer this.onLoadComplete() until the end of create()
      // to keep the loading screen up while the tilemap is parsed and built.
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
    console.log('🎮 SCENE CREATE RUNNING');

    console.log('Player initial pos:', this.initialPos);
    this.add.text(100, 100, 'GAME WORKING', {
      fontSize: '32px',
      color: '#ffffff'
    }).setDepth(2000);

    // ── Create tilemap ───────────────────────────────────────────────
    const map = this.make.tilemap({ key: 'mainmap' });

    const startX = this.initialPos?.x || START_POS.x;
    const startY = this.initialPos?.y || START_POS.y;

    // Add tilesets — order must match the JSON tileset array exactly.
    // The first arg is the tileset name in Tiled, second is the Phaser image key.
    const tilesetNames = map.tilesets.map(ts => ts.name);
    const tilesets = [];

    this.matter.world.engine.positionIterations = 6;
    this.matter.world.engine.velocityIterations = 4;

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
        layer.setDepth(0);
        this.tileLayers.push(layer);
      }
    });

    // ── World bounds ─────────────────────────────────────────────────
    const mapWidthPx = map.widthInPixels;
    const mapHeightPx = map.heightInPixels;

    // NOTE: Sea tile collision (setCollisionByExclusion) has been removed.
    // It was marking nearly every tile as solid because the WALKABLE_GIDS list
    // was incomplete, blocking the player at spawn and preventing movement.
    // World boundary is enforced by setCollideWorldBounds(true) on the player.

    // ── Collision bodies from object layers ───────────────────────────
    // Collect all static collision zones in a plain array so we can pass
    // them to physics.add.collider() individually after creation.


    const createBody = (obj, isSensor = false, label = 'wall') => {
      const options = {
        isStatic: true,
        isSensor,
        label,
      };

      // ─────────────────────────────
      // RECTANGLE
      // ─────────────────────────────
      if (!obj.polygon && !obj.polyline && !obj.ellipse) {
        const cx = obj.x + obj.width / 2;
        const cy = obj.y + obj.height / 2;

        const body = this.matter.add.rectangle(
          cx,
          cy,
          obj.width,
          obj.height,
          {
            ...options,
            angle: Phaser.Math.DegToRad(obj.rotation || 0),
          }
        );

        body.label = label;
        return body;
      }

      // ─────────────────────────────
      // ELLIPSE
      // ─────────────────────────────
      if (obj.ellipse) {
        const cx = obj.x + obj.width / 2;
        const cy = obj.y + obj.height / 2;

        const body = this.matter.add.circle(
          cx,
          cy,
          obj.width / 2,
          options
        );

        if (obj.width !== obj.height) {
          this.matter.body.scale(body, 1, obj.height / obj.width);
        }

        body.label = label;
        return body;
      }

      // ─────────────────────────────
      // POLYGON (closed shape)
      // ─────────────────────────────
      if (obj.polygon) {
        const worldVerts = obj.polygon.map(p => ({
          x: obj.x + p.x,
          y: obj.y + p.y
        }));

        const center = Phaser.Physics.Matter.Matter.Vertices.centre(worldVerts);

        const localVerts = worldVerts.map(v => ({
          x: v.x - center.x,
          y: v.y - center.y
        }));

        const body = this.matter.add.fromVertices(
          center.x,
          center.y,
          localVerts,
          options,
          true
        );

        body.label = label;
        return body;
      }

      // ─────────────────────────────
      // 🔥 POLYLINE (edge-based collision)
      // ─────────────────────────────
      if (obj.polyline) {
        const thickness = 6; // 👈 adjust collision thickness

        obj.polyline.forEach((p, i) => {
          if (i === obj.polyline.length - 1) return;

          const p1 = obj.polyline[i];
          const p2 = obj.polyline[i + 1];

          const x1 = obj.x + p1.x;
          const y1 = obj.y + p1.y;
          const x2 = obj.x + p2.x;
          const y2 = obj.y + p2.y;

          const length = Phaser.Math.Distance.Between(x1, y1, x2, y2);
          const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);

          this.matter.add.rectangle(
            (x1 + x2) / 2,
            (y1 + y2) / 2,
            length,
            thickness,
            {
              ...options,
              angle,
            }
          );
        });

        return null; // polyline creates multiple bodies
      }
    };

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
    this.playerGraphic.setDepth(1000);

    // Physics body for player (invisible rectangle — avoids null-texture bug
    // where physics.add.sprite(x, y, null) places the body at (0,0) instead
    // of the requested position and breaks movement registration).
    this.playerBody = this.matter.add.rectangle(startX, startY + 22, 16, 10, {
      friction: 0,
      frictionAir: 0.2,
      inertia: Infinity,
      label: 'player'
    });

    this.matter.world.on('collisionstart', (event) => {
      event.pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;

        const isTree =
          (bodyA.label === 'player' && bodyB.label === 'tree') ||
          (bodyB.label === 'player' && bodyA.label === 'tree');

        if (isTree) {
          const treeBody = bodyA.label === 'tree' ? bodyA : bodyB;
          this.treeCollisions.add(treeBody.id);
        }
      });

      this.updatePlayerOpacity();
    });

    this.matter.world.on('collisionend', (event) => {
      event.pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;

        const isTree =
          (bodyA.label === 'player' && bodyB.label === 'tree') ||
          (bodyB.label === 'player' && bodyA.label === 'tree');

        if (isTree) {
          const treeBody = bodyA.label === 'tree' ? bodyA : bodyB;
          this.treeCollisions.delete(treeBody.id);
        }
      });

      this.updatePlayerOpacity();
    });

    const addLayerBodies = (layerName, isSensor = false, label = 'wall') => {
      const layer = map.getObjectLayer(layerName);
      if (!layer) return;

      layer.objects.forEach(obj => {
        createBody(obj, isSensor, label);
      });
    };

    // Solid collisions
    addLayerBodies('collisionbelowplayer', false, 'wall');
    addLayerBodies('collisionupperplayer', true, 'tree');

    // Collide player with collision objects (trees, fences, etc.)
    // Add colliders for all static collision zones

    // NOTE: We intentionally do NOT add a collider against the base tile layer.
    // The setCollisionByExclusion approach marks almost every tile as solid,
    // which blocks the player at the spawn position and prevents walking.
    // Collision is already handled by the explicit object layers above.

    // ── Checkpoint markers ───────────────────────────────────────────
    this.checkpointGraphics = [];
    CHECKPOINTS.forEach(cp => {
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
    this.cameras.main.startFollow(this.playerGraphic);
    this.cameras.main.centerOn(startX, startY);
    this.cameras.main.setZoom(3);

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
    this.treeCollisions = new Set();
    this.walkFrame = 0;
    this.isPaused = false;

    // Store map reference for position saving
    this.mapWidthPx = mapWidthPx;
    this.mapHeightPx = mapHeightPx;

    // Signal that loading and map generation is complete
    this.onLoadComplete();
  }

  update() {
    try {
      if (this.isPaused) return;
      if (!this.playerBody) return;

      const pos = this.playerBody.position;

      if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
        console.error("🚨 Player position is invalid:", pos);

        this.matter.body.setPosition(this.playerBody, {
          x: START_POS.x,
          y: START_POS.y
        });

        return;
      }


      // ── INPUT ──
      let vx = 0;
      let vy = 0;
      this.playerGraphic.setDepth(this.playerBody.position.y);

      if (this.cursors && this.wasd) {
        if (this.cursors.left.isDown || this.wasd.a.isDown) vx = -PLAYER_SPEED;
        if (this.cursors.right.isDown || this.wasd.d.isDown) vx = PLAYER_SPEED;
        if (this.cursors.up.isDown || this.wasd.w.isDown) vy = -PLAYER_SPEED;
        if (this.cursors.down.isDown || this.wasd.s.isDown) vy = PLAYER_SPEED;
      }

      if (vx !== 0 && vy !== 0) {
        vx *= 0.707;
        vy *= 0.707;
      }

      const SPEED = 2.5;
      this.matter.body.setVelocity(this.playerBody, {
        x: vx * SPEED,
        y: vy * SPEED
      });
      this.playerGraphic.setPosition(
        this.playerBody.position.x,
        this.playerBody.position.y - 22
      );

      // ── ANIMATION ──
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

      // ── SAFE PROGRESS ──
      const progressRaw = this.getProgress?.();
      const progress = Array.isArray(progressRaw) ? progressRaw : [];

      const completedCPs = progress
        .filter(p => p && p.completed)
        .map(p => p.checkpoint_number);

      let near = null;

      CHECKPOINTS.forEach(cp => {
        const dist = Phaser.Math.Distance.Between(
          this.playerBody.position.x,
          this.playerBody.position.y,
          cp.x,
          cp.y
        );

        if (dist < cp.radius + 20) near = cp.id;
      });

      this.checkpointGraphics.forEach(({ cpDef, glow, circle, idText, hintText, lockText }) => {
        const isCompleted = completedCPs.includes(cpDef.id);
        const isUnlocked = this.getIsCheckpointUnlocked
          ? this.getIsCheckpointUnlocked(cpDef.id)
          : true;
        const isNear = near === cpDef.id;

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

        glow.setVisible(isNear && isUnlocked && !isCompleted);
        hintText.setVisible(isNear && isUnlocked && !isCompleted);
        lockText.setVisible(!isUnlocked && !isCompleted);
      });

      if (near !== this.nearCheckpointId) {
        this.nearCheckpointId = near;
        this.onNearCheckpoint(near);
      }

      if (Phaser.Input.Keyboard.JustDown(this.keyE) && near) {
        const isUnlocked = this.getIsCheckpointUnlocked
          ? this.getIsCheckpointUnlocked(near)
          : true;

        const isCompleted = completedCPs.includes(near);

        if (isUnlocked && !isCompleted) {
          this.onCheckpointReached(near);
        }
      }

      const x = Phaser.Math.Clamp(this.playerBody.position.x, 0, this.mapWidthPx);
      const y = Phaser.Math.Clamp(this.playerBody.position.y, 0, this.mapHeightPx);

      if (x !== this.playerBody.position.x || y !== this.playerBody.position.y) {
        this.matter.body.setPosition(this.playerBody, { x, y });
      }

      if (this.playerBody?.position) {
        const { x, y } = this.playerBody.position;

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          console.error("🚨 BAD POSITION:", x, y);
        }
      }

    } catch (err) {
      console.error("🚨 UPDATE CRASH:", err);
    }
  }

  // ─────────────────────────────────────────────
  // SAFE METHODS (keep inside class)
  // ─────────────────────────────────────────────

  pauseGame() {
    this.isPaused = true;
  }

  resumeGame() {
    this.isPaused = false;
  }

  updatePlayerOpacity() {
    const count = this.treeCollisions.size;

    const alpha = Phaser.Math.Clamp(1 - count * 0.60, 0.60, 1);

    this.tweens.add({
      targets: this.playerGraphic,
      alpha: alpha,
      duration: 120,
      ease: 'Power2'
    });
  }


  getPlayerPosition() {
    return {
      x: this.playerBody?.position?.x || START_POS.x,
      y: this.playerBody?.position?.y || START_POS.y,
    };
  }

  setPlayerPosition(x, y) {
    if (this.playerBody) {
      this.matter.body.setPosition(this.playerBody, { x, y });
      this.playerGraphic.setPosition(x, y);
    }
  }
}