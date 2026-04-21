/**
 * GameCanvas.jsx  —  Phaser 4 version
 *
 * FIXED BUGS:
 *  1. Asset paths: map.json and tilesets must be in public/assets/, not src/assets/
 *     (src/assets files are hashed/bundled by Vite and NOT available at a stable URL)
 *  2. Asset key sanitisation: Phaser keys cannot have spaces. "16oga (1)" → "16oga_1"
 *     and "plant repack" → "plant_repack"
 *  3. Path prefix: changed from '../assets/' → '/assets/' (absolute from public root)
 *  4. Phaser 4 keyboard: this.input.keyboard can be null — added null guards
 *  5. Duplicate TILESET_ENTRIES caused "already loaded" warnings — deduplicated by name
 */

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import {
  MAP_WIDTH, MAP_HEIGHT, CHAR_SPEED, START_POS,
  CHECKPOINTS, TILESET_ENTRIES, TILESET_SOURCES,
} from './gameConfig';
import api from '../services/api';

const SAVE_INTERVAL = 5000;

// ─── FIX 1: Use absolute public paths (not relative src/assets) ───────────────
// Vite only serves files in /public at a stable URL.
// Files in src/assets get content-hashed (e.g. map-Bg3xKp.json) and
// are NOT reachable via a plain URL — Phaser's loader would get a 404.
const MAP_JSON_URL  = '/assets/map.json';
const TILESET_BASE  = '/assets/tilesets/';

// ─── FIX 2: Key sanitiser — Phaser cache keys cannot contain spaces or parens ─
const toKey = (filename) =>
  filename.replace('.png', '').replace(/[\s()]/g, '_');

// Names of every tile layer in map.json that should be rendered
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

// Object layers that hold collision rectangles
const COLLISION_LAYERS = ['collisionbelowplayer', 'collisionupperplayer'];

// ─── FIX 3: Deduplicate sources so Phaser doesn't try to load the same file twice ─
const UNIQUE_SOURCES = [...new Set(TILESET_SOURCES)];

// ─── FIX 4: Deduplicate TILESET_ENTRIES by name (keeps first occurrence) ──────
// Duplicate names caused "Key already in use" warnings and sometimes crashes.
const UNIQUE_TILESET_ENTRIES = TILESET_ENTRIES.filter(
  (entry, idx, arr) => arr.findIndex(e => e.name === entry.name) === idx
);

// ─── Viewport helper ──────────────────────────────────────────────────────────
const getViewSize = () => ({
  w: Math.max(320, window.innerWidth - 32),
  h: Math.max(240, window.innerHeight - 130),
});

// ──────────────────────────────────────────────────────────────────────────────
//  GameCanvas component
// ──────────────────────────────────────────────────────────────────────────────
const GameCanvas = ({ player, progress, onCheckpointReached }) => {
  const containerRef = useRef(null);
  const gameRef      = useRef(null);
  const progressRef  = useRef(progress);
  const onCPRef      = useRef(onCheckpointReached);
  const [viewSize, setViewSize] = useState(getViewSize);

  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { onCPRef.current = onCheckpointReached; }, [onCheckpointReached]);

  // Responsive resize
  useEffect(() => {
    const onResize = () => {
      const s = getViewSize();
      setViewSize(s);
      if (gameRef.current) gameRef.current.scale.resize(s.w, s.h);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Build & destroy Phaser game ────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    if (gameRef.current) { gameRef.current.destroy(true); gameRef.current = null; }

    const playerId       = player.id;
    const playerNickname = player.nickname;

    // ── Phaser scene ─────────────────────────────────────────────────────────
    class GameScene extends Phaser.Scene {
      constructor() {
        super({ key: 'GameScene' });
        this.playerSprite = null;
        this.nameLabel    = null;
        this.hintLabel    = null;
        this.colliders    = null;
        this.cpMarkers    = [];
        this.nearCP       = null;
        this.eKey         = null;
        this.cursors      = null;
        this.wasd         = null;
        this.lastSave     = Date.now();
      }

      // ── preload ─────────────────────────────────────────────────────────────
      preload() {
        const { width, height } = this.scale;
        const bar    = this.add.graphics();
        const border = this.add.graphics();
        border.lineStyle(2, 0xffffff).strokeRect(width / 2 - 152, height / 2 - 12, 304, 24);
        this.load.on('progress', v => {
          bar.clear().fillStyle(0x2563eb).fillRect(width / 2 - 150, height / 2 - 10, 300 * v, 20);
        });
        this.add.text(width / 2, height / 2 - 30, 'Loading map…', {
          fontSize: '14px', color: '#ffffff',
        }).setOrigin(0.5);

        // Map JSON — served from /public/assets/map.json
        this.load.tilemapTiledJSON('map', MAP_JSON_URL);

        // FIX: Use sanitised keys so Phaser doesn't choke on spaces/parens
        UNIQUE_SOURCES.forEach(src => {
          const key = toKey(src);
          this.load.image(key, TILESET_BASE + src);
        });

        // Player texture
        const pg = this.make.graphics({ x: 0, y: 0, add: false });
        pg.fillStyle(0x2563eb).fillRoundedRect(-10, -6, 20, 22, 4);
        pg.fillStyle(0xFBBF24).fillCircle(0, -14, 10);
        pg.lineStyle(1.5, 0xD97706).strokeCircle(0, -14, 10);
        pg.fillStyle(0x1e3a5f).fillCircle(-3, -15, 2).fillCircle(3, -15, 2);
        pg.lineStyle(1.5, 0x1e3a5f);
        pg.beginPath().arc(0, -12, 4, 0.2, Math.PI - 0.2).strokePath();
        pg.generateTexture('player_tex', 24, 36);
        pg.destroy();
      }

      // ── create ──────────────────────────────────────────────────────────────
      create() {
        const map = this.make.tilemap({ key: 'map' });

        // FIX: Use the same sanitised key when adding tilesets to the map
        const addedTilesets = UNIQUE_TILESET_ENTRIES.map(({ name, src }) => {
          const key = toKey(src);
          return map.addTilesetImage(name, key) || null;
        }).filter(Boolean);

        const layerDepths = {
          map: 0, checkpointroad: 1, colourfloor: 2,
          fenceback: 3, fencemid: 4,
          cansitstarmushroomcaterpillarrockgrass: 5,
          layer1: 6, layer2: 7, fencefrontlayer3: 8,
          fishlowopacity: 9, smalltree: 10, bigtree: 11,
        };

        TILE_LAYER_NAMES.forEach(name => {
          try {
            const layer = map.createLayer(name, addedTilesets);
            if (!layer) return;
            layer.setDepth(layerDepths[name] ?? 5);
            if (name === 'fishlowopacity') layer.setAlpha(0.34);
          } catch (e) {
            console.warn(`[GameCanvas] Layer "${name}" skipped:`, e.message);
          }
        });

        // Collision
        this.colliders = this.physics.add.staticGroup();
        COLLISION_LAYERS.forEach(layerName => {
          const objLayer = map.getObjectLayer(layerName);
          if (!objLayer) return;
          objLayer.objects.forEach(obj => {
            if (obj.width > 0 && obj.height > 0) {
              const rect = this.add.rectangle(
                obj.x + obj.width / 2,
                obj.y + obj.height / 2,
                obj.width,
                obj.height
              ).setVisible(false);
              this.physics.add.existing(rect, true);
              this.colliders.add(rect);
            }
          });
        });

        // Player
        this.playerSprite = this.physics.add.sprite(START_POS.x, START_POS.y, 'player_tex');
        this.playerSprite
          .setCollideWorldBounds(true)
          .setDepth(15)
          .setDrag(300, 300);
        this.playerSprite.body.setSize(18, 18).setOffset(3, 14);
        this.physics.add.collider(this.playerSprite, this.colliders);

        // Labels
        this.nameLabel = this.add.text(START_POS.x, START_POS.y - 30, playerNickname, {
          fontSize: '11px', fontFamily: 'sans-serif',
          color: '#ffffff', backgroundColor: '#00000099',
          padding: { x: 4, y: 2 },
        }).setOrigin(0.5).setDepth(16);

        this.hintLabel = this.add.text(0, 0, 'Press E to enter', {
          fontSize: '12px', fontFamily: 'sans-serif', fontStyle: 'bold',
          color: '#ffffff', backgroundColor: '#00000099',
          padding: { x: 5, y: 3 },
        }).setOrigin(0.5).setDepth(16).setVisible(false);

        this._buildCheckpointMarkers();

        // Camera & physics bounds
        this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
        this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

        // ── FIX 5: Phaser 4 — this.input.keyboard can be null if no keyboard plugin ─
        // Guard every keyboard access with a null check
        if (this.input.keyboard) {
          this.cursors = this.input.keyboard.createCursorKeys();
          this.wasd = this.input.keyboard.addKeys({
            up:      Phaser.Input.Keyboard.KeyCodes.W,
            down:    Phaser.Input.Keyboard.KeyCodes.S,
            left:    Phaser.Input.Keyboard.KeyCodes.A,
            right:   Phaser.Input.Keyboard.KeyCodes.D,
          });
          this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        }

        // Load saved position
        api.get(`/game/position/${playerId}`).then(res => {
          if (!res.data?.position) return;
          const { pos_x, pos_y } = res.data.position;
          const inBounds =
            pos_x > 50 && pos_x < MAP_WIDTH - 50 &&
            pos_y > 50 && pos_y < MAP_HEIGHT - 50;
          if (inBounds) {
            this.playerSprite.setPosition(pos_x, pos_y);
            this.cameras.main.centerOn(pos_x, pos_y);
          }
        }).catch(() => {});
      }

      // ── _buildCheckpointMarkers ───────────────────────────────────────────
      _buildCheckpointMarkers() {
        CHECKPOINTS.forEach(cp => {
          const prog        = progressRef.current;
          const isCompleted = prog.find(p => p.checkpoint_number === cp.id)?.completed;
          const isUnlocked  = cp.id === 1 || prog.find(p => p.checkpoint_number === cp.id - 1)?.completed;

          const fillColor = isCompleted
            ? 0x16a34a
            : isUnlocked
              ? parseInt(cp.color.slice(1), 16)
              : 0x94a3b8;

          const gfx = this.add.graphics().setDepth(12);
          gfx.fillStyle(fillColor, 1).fillCircle(cp.x, cp.y, 28);
          gfx.lineStyle(3, 0xffffff, 1).strokeCircle(cp.x, cp.y, 28);

          const icon = this.add.text(cp.x, cp.y, isCompleted ? '✓' : String(cp.id), {
            fontSize: '18px', fontStyle: 'bold', fontFamily: 'sans-serif', color: '#ffffff',
          }).setOrigin(0.5).setDepth(13);

          const cpLabel = this.add.text(cp.x + 38, cp.y - 10, cp.label, {
            fontSize: '13px', fontStyle: 'bold', fontFamily: 'sans-serif', color: '#FFD700',
          }).setDepth(13);

          if (!isUnlocked && !isCompleted) {
            this.add.text(cp.x + 30, cp.y + 10, '🔒', { fontSize: '14px' }).setDepth(13);
          }

          this.cpMarkers.push({ id: cp.id, x: cp.x, y: cp.y, radius: cp.radius, gfx, icon, cpLabel });
        });
      }

      // ── update ──────────────────────────────────────────────────────────────
      update() {
        if (!this.playerSprite) return;

        // FIX: Guard keyboard — if no keyboard plugin, skip movement
        if (this.cursors && this.wasd) {
          const speed = CHAR_SPEED * 60;
          const { up, down, left, right } = this.wasd;
          const c = this.cursors;
          let vx = 0, vy = 0;

          if (up.isDown    || c.up.isDown)    vy = -speed;
          if (down.isDown  || c.down.isDown)  vy =  speed;
          if (left.isDown  || c.left.isDown)  vx = -speed;
          if (right.isDown || c.right.isDown) vx =  speed;

          if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
          this.playerSprite.setVelocity(vx, vy);
        }

        const px = this.playerSprite.x;
        const py = this.playerSprite.y;
        this.nameLabel.setPosition(px, py - 30);

        // Checkpoint proximity
        let nearId = null;
        this.cpMarkers.forEach(({ id, x, y, radius }) => {
          const dist = Phaser.Math.Distance.Between(px, py, x, y);
          if (dist < radius + 20) nearId = id;
        });
        this.nearCP = nearId;

        if (nearId !== null) {
          const prog        = progressRef.current;
          const isCompleted = prog.find(p => p.checkpoint_number === nearId)?.completed;
          const isUnlocked  = nearId === 1 || prog.find(p => p.checkpoint_number === nearId - 1)?.completed;
          const marker      = this.cpMarkers.find(m => m.id === nearId);

          if (isUnlocked && !isCompleted && marker) {
            this.hintLabel.setPosition(marker.x, marker.y + 50).setVisible(true);
          } else {
            this.hintLabel.setVisible(false);
          }
        } else {
          this.hintLabel.setVisible(false);
        }

        // E key — enter checkpoint (guard keyboard null)
        if (this.eKey && Phaser.Input.Keyboard.JustDown(this.eKey) && nearId !== null) {
          const prog        = progressRef.current;
          const isCompleted = prog.find(p => p.checkpoint_number === nearId)?.completed;
          const isUnlocked  = nearId === 1 || prog.find(p => p.checkpoint_number === nearId - 1)?.completed;
          if (isUnlocked && !isCompleted) onCPRef.current(nearId);
        }

        // Auto-save position
        if (Date.now() - this.lastSave > SAVE_INTERVAL) {
          this.lastSave = Date.now();
          const prog    = progressRef.current;
          const done    = prog.filter(p => p.completed).map(p => p.checkpoint_number);
          const lastCP  = done.length > 0 ? Math.max(...done) : 0;
          api.post('/game/position', {
            player_id:       playerId,
            pos_x:           Math.round(px),
            pos_y:           Math.round(py),
            last_checkpoint: lastCP,
          }).catch(() => {});
        }
      }
    }

    const { w, h } = getViewSize();
    const config = {
      type:   Phaser.AUTO,
      width:  w,
      height: h,
      parent: containerRef.current,
      backgroundColor: '#1a472a',
      physics: {
        default: 'arcade',
        arcade:  { gravity: { y: 0 }, debug: false },
      },
      scene: GameScene,
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [player.id]);

  return (
    <div
      ref={containerRef}
      style={{
        width:        `${viewSize.w}px`,
        height:       `${viewSize.h}px`,
        borderRadius: '12px',
        border:       '3px solid #1e3a5f',
        overflow:     'hidden',
        margin:       '0 auto',
      }}
    />
  );
};

export default GameCanvas;
