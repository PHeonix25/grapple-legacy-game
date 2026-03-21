import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GrappleHook } from '../entities/GrappleHook';

// Platform definition: [x, y, width, height]
type PlatformDef = [number, number, number, number];

const PLATFORMS: PlatformDef[] = [
  // Ground
  [640, 700, 1280, 40],
  // Platforms
  [200, 550, 200, 20],
  [500, 450, 160, 20],
  [800, 380, 200, 20],
  [400, 300, 160, 20],
  [900, 580, 180, 20],
  [1100, 480, 160, 20],
  [150, 200, 120, 20],
  [700, 200, 200, 20],
];

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private grapple!: GrappleHook;
  private platforms!: Phaser.GameObjects.Rectangle[];
  private ropeGraphics!: Phaser.GameObjects.Graphics;
  private hookSprite!: Phaser.GameObjects.Image;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Paths are relative to index.html at the project root
    this.load.image('player', 'assets/Sprite.png');
    this.load.image('hook', 'assets/Grapple_Hook.png');
  }

  create(): void {
    this.platforms = [];
    this.ropeGraphics = this.add.graphics();

    this.createPlatforms();

    // Spawn player above the ground
    this.player = new Player(this, 100, 600);
    this.grapple = new GrappleHook(this, this.player);

    // Hook sprite — hidden until the grapple is fired
    // Display size: 16×24px (scaled down from 80×120 source)
    this.hookSprite = this.add.image(0, 0, 'hook')
      .setDisplaySize(16, 24)
      .setVisible(false);

    // Camera follows player with a small lerp for that Mario feel
    this.cameras.main.startFollow(this.player.gameObject, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(200, 100);

    // Instructions overlay
    this.add
      .text(640, 20, 'WASD/Arrows: Move  |  Space: Jump  |  Click: Grapple  |  Scroll: Reel', {
        fontSize: '14px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);
  }

  update(time: number, delta: number): void {
    this.player.update(delta);
    this.grapple.update();
    this.drawRope();
  }

  private createPlatforms(): void {
    for (const [x, y, w, h] of PLATFORMS) {
      const rect = this.add.rectangle(x, y, w, h, 0x4a9eff);
      this.platforms.push(rect);

      const body = this.matter.add.rectangle(x, y, w, h, { isStatic: true, label: 'platform' });
      (body as MatterJS.BodyType).friction = 0.05;
      (body as MatterJS.BodyType).frictionStatic = 0.05;
    }
  }

  private drawRope(): void {
    this.ropeGraphics.clear();

    if (!this.grapple.isAttached()) {
      this.hookSprite.setVisible(false);
      return;
    }

    const anchor = this.grapple.anchorPoint!;
    const segments = this.grapple.segmentPositions;
    const playerPos = this.player.position;

    // Full chain: anchor → each segment → player
    const points: Phaser.Math.Vector2[] = [anchor, ...segments, playerPos];

    this.ropeGraphics.lineStyle(2, 0xffdd57, 1);
    for (let i = 0; i < points.length - 1; i++) {
      this.ropeGraphics.lineBetween(
        points[i].x, points[i].y,
        points[i + 1].x, points[i + 1].y
      );
    }

    // Position and show the hook sprite at the anchor point.
    // Rotate it to point away from the first rope segment so it looks embedded.
    const ropeDir = new Phaser.Math.Vector2(
      segments.length > 0 ? segments[0].x - anchor.x : playerPos.x - anchor.x,
      segments.length > 0 ? segments[0].y - anchor.y : playerPos.y - anchor.y
    ).normalize();

    const hookAngle = Math.atan2(ropeDir.y, ropeDir.x) + Math.PI / 2 + Math.PI;

    this.hookSprite
      .setPosition(anchor.x, anchor.y)
      .setRotation(hookAngle)
      .setVisible(true);
  }
}