import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { GrappleHook } from '../entities/GrappleHook.js';
import { LevelLoader } from '../levels/LevelLoader.js';
import { LevelData } from '../levels/LevelData.js';

const WORLD_HEIGHT = 720;
const DEATH_Y = WORLD_HEIGHT + 100; // Fall this far below world bottom = death
const LEVEL_COUNT = 1;              // Increment as you add more level PNGs

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private grapple!: GrappleHook;
  private ropeGraphics!: Phaser.GameObjects.Graphics;
  private hookSprite!: Phaser.GameObjects.Image;
  private flagSprite!: Phaser.GameObjects.Rectangle;

  private levelData!: LevelData;
  private levelIndex: number = 0;
  private isDead: boolean = false;
  private isComplete: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  // Accept a level index when starting the scene (defaults to 0)
  init(data: { levelIndex?: number }): void {
    this.levelIndex = data?.levelIndex ?? 0;
    this.isDead = false;
    this.isComplete = false;
  }

  preload(): void {
    this.load.image('player', 'assets/Sprite.png');
    this.load.image('hook', 'assets/Grapple_Hook.png');

    // Load all level images
    for (let i = 0; i < LEVEL_COUNT; i++) {
      this.load.image(`level${i}`, `assets/levels/level${i + 1}.png`);
    }
  }

  create(): void {
    // Parse the level image into world data
    this.levelData = LevelLoader.parse(this, `level${this.levelIndex}`, WORLD_HEIGHT);

    // No built-in world bounds — walls are created manually in createWalls()
    // so we can omit the floor and let the player fall to their death.

    this.ropeGraphics = this.add.graphics();

    this.createPlatforms();
    this.createWalls();
    this.createFlag();

    // Spawn player at level-defined start position
    this.player = new Player(this, this.levelData.playerStart.x, this.levelData.playerStart.y);
    this.grapple = new GrappleHook(this, this.player);

    // Hook sprite
    this.hookSprite = this.add.image(0, 0, 'hook')
      .setDisplaySize(16, 24)
      .setVisible(false);

    // Camera
    this.cameras.main.setBounds(0, 0, this.levelData.worldWidth, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player.gameObject, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(200, 100);

    // HUD
    this.add
      .text(640, 20, 'WASD/Arrows: Move  |  Space: Jump  |  Click: Grapple  |  Scroll: Reel', {
        fontSize: '14px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);
  }

  update(_time: number, delta: number): void {
    if (this.isDead || this.isComplete) return;

    this.player.update(delta);
    this.grapple.update();
    this.drawRope();
    this.checkDeath();
    this.checkFlag();
  }

  // ── Level geometry ───────────────────────────────────────────────────────────

  private createPlatforms(): void {
    for (const plat of this.levelData.platforms) {
      this.add.rectangle(plat.x, plat.y, plat.width, plat.height, 0x4a9eff);

      const body = this.matter.add.rectangle(plat.x, plat.y, plat.width, plat.height, {
        isStatic: true,
        label: 'platform',
      });
      (body as MatterJS.BodyType).friction = 0.05;
      (body as MatterJS.BodyType).frictionStatic = 0.05;
    }
  }

  private createFlag(): void {
    const { x, y } = this.levelData.flagPosition;

    // Flag pole
    this.add.rectangle(x, y + 20, 4, 80, 0xffffff);

    // Flag banner
    this.flagSprite = this.add.rectangle(x + 16, y - 8, 32, 20, 0xff4444);

    // Sensor body for detection
    this.matter.add.rectangle(x, y, 40, 80, {
      isStatic: true,
      isSensor: true,
      label: 'flag',
    });
  }

  private createWalls(): void {
    const w = this.levelData.worldWidth;
    const h = WORLD_HEIGHT;
    const T = 64; // Wall thickness

    // Left wall
    this.matter.add.rectangle(-T / 2, h / 2, T, h, { isStatic: true, label: 'wall' });
    // Right wall
    this.matter.add.rectangle(w + T / 2, h / 2, T, h, { isStatic: true, label: 'wall' });
    // Ceiling
    this.matter.add.rectangle(w / 2, -T / 2, w, T, { isStatic: true, label: 'wall' });
    // No floor — player falls through and dies
  }

  // ── Per-frame checks ─────────────────────────────────────────────────────────

  private checkDeath(): void {
    if (this.player.position.y > DEATH_Y) {
      this.triggerDeath();
    }
  }

  private checkFlag(): void {
    const pos = this.player.position;
    const flag = this.levelData.flagPosition;
    const dist = Phaser.Math.Distance.Between(pos.x, pos.y, flag.x, flag.y);
    if (dist < 50) {
      this.triggerLevelComplete();
    }
  }

  // ── Death & completion ───────────────────────────────────────────────────────

  private triggerDeath(): void {
    if (this.isDead) return;
    this.isDead = true;
    this.grapple.forceRelease();

    // Flash red then respawn
    this.cameras.main.flash(200, 255, 50, 50);
    this.time.delayedCall(600, () => {
      this.scene.restart({ levelIndex: this.levelIndex });
    });
  }

  private triggerLevelComplete(): void {
    if (this.isComplete) return;
    this.isComplete = true;
    this.grapple.forceRelease();

    // Dim overlay
    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.6)
      .setScrollFactor(0);

    this.add.text(640, 300, 'LEVEL COMPLETE', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0);

    this.add.text(640, 380, 'Loading next level...', {
      fontSize: '20px',
      color: '#aaaaaa',
    }).setOrigin(0.5).setScrollFactor(0);

    const nextLevel = (this.levelIndex + 1) % LEVEL_COUNT;
    this.time.delayedCall(2000, () => {
      this.scene.restart({ levelIndex: nextLevel });
    });
  }

  // ── Rope drawing ─────────────────────────────────────────────────────────────

  private drawRope(): void {
    this.ropeGraphics.clear();

    if (!this.grapple.isAttached()) {
      this.hookSprite.setVisible(false);
      return;
    }

    const wrapPoints = this.grapple.wrapPoints;
    const segments = this.grapple.segmentPositions;
    const playerPos = this.player.position;

    const allPoints: Phaser.Math.Vector2[] = [...wrapPoints, ...segments, playerPos];

    this.ropeGraphics.lineStyle(2, 0xffdd57, 1);
    for (let i = 0; i < allPoints.length - 1; i++) {
      this.ropeGraphics.lineBetween(
        allPoints[i].x, allPoints[i].y,
        allPoints[i + 1].x, allPoints[i + 1].y
      );
    }

    const anchor = wrapPoints[0];
    const next = wrapPoints.length > 1 ? wrapPoints[1] : (segments.length > 0 ? segments[0] : playerPos);
    const ropeDir = new Phaser.Math.Vector2(next.x - anchor.x, next.y - anchor.y).normalize();
    const hookAngle = Math.atan2(ropeDir.y, ropeDir.x) + Math.PI / 2 + Math.PI;

    this.hookSprite
      .setPosition(anchor.x, anchor.y)
      .setRotation(hookAngle)
      .setVisible(true);
  }
}