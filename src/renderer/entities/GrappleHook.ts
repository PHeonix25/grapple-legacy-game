import Phaser from 'phaser';
import { Player } from './Player';

// ── Tuning constants ─────────────────────────────────────────────────────────
const GRAPPLE_MAX_DISTANCE = 400;  // Max rope length in pixels
const SEGMENT_LENGTH = 20;         // Resting length of each chain link in pixels
const SEGMENT_RADIUS = 3;          // Physical radius of each segment body
const SEGMENT_STIFFNESS = 1.0;     // How rigid the links are (0=rubber, 1=rigid)
const REEL_SENSITIVITY = 0.4;      // Scroll units → pixel change in target length

export class GrappleHook {
  private scene: Phaser.Scene;
  private player: Player;

  // Chain state — null when no grapple is active
  private segments: MatterJS.BodyType[] = [];
  private links: MatterJS.ConstraintType[] = [];   // segment-to-segment constraints
  private anchorConstraint: MatterJS.ConstraintType | null = null;
  private playerConstraint: MatterJS.ConstraintType | null = null;

  // Anchor
  private _anchorPoint: Phaser.Math.Vector2 | null = null;
  private anchorBody: MatterJS.BodyType | null = null;

  // Reeling
  private targetRopeLength: number = 0;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        if (this.isAttached()) {
          this.release();
        } else {
          this.fire(pointer);
        }
      }
    });

    scene.input.on('wheel', (
      _pointer: Phaser.Input.Pointer,
      _objects: unknown,
      _dx: number,
      dy: number
    ) => {
      this.reel(dy);
    });
  }

  get anchorPoint(): Phaser.Math.Vector2 | null {
    return this._anchorPoint;
  }

  get segmentPositions(): Phaser.Math.Vector2[] {
    return this.segments.map(
      (s) => new Phaser.Math.Vector2(s.position.x, s.position.y)
    );
  }

  isAttached(): boolean {
    return this.anchorConstraint !== null;
  }

  // ── Per-frame update ─────────────────────────────────────────────────────────

  update(): void {
    // Tell the player whether it's swinging and where the anchor is (for rotation)
    this.player.isSwinging = this.isAttached();
    this.player.setAnchorPoint(this._anchorPoint);
    if (!this.isAttached()) return;
    this.applyReel();
  }

  // ── Firing ───────────────────────────────────────────────────────────────────

  private fire(pointer: Phaser.Input.Pointer): void {
    const playerPos = this.player.position;

    const dir = new Phaser.Math.Vector2(
      pointer.worldX - playerPos.x,
      pointer.worldY - playerPos.y
    );
    if (dir.length() < 1) return;
    dir.normalize();

    const hit = this.raycast(playerPos, dir, GRAPPLE_MAX_DISTANCE);
    if (!hit) return;

    this._anchorPoint = hit;

    const ropeLength = Phaser.Math.Distance.Between(
      playerPos.x, playerPos.y, hit.x, hit.y
    );

    this.targetRopeLength = ropeLength;

    this.buildChain(playerPos, hit, ropeLength);
  }

  // ── Chain construction ───────────────────────────────────────────────────────

  private buildChain(
    from: Phaser.Math.Vector2,
    to: Phaser.Math.Vector2,
    length: number
  ): void {
    const segmentCount = Math.max(2, Math.round(length / SEGMENT_LENGTH));
    const matter = this.scene.matter;

    // Static anchor body at the hit point
    this.anchorBody = matter.add.circle(to.x, to.y, 2, {
      isStatic: true,
      isSensor: true,
      label: 'anchor',
    }) as MatterJS.BodyType;

    // Spawn segments evenly spaced from anchor → player
    for (let i = 0; i < segmentCount; i++) {
      const t = i / (segmentCount - 1);
      const x = Phaser.Math.Linear(to.x, from.x, t);
      const y = Phaser.Math.Linear(to.y, from.y, t);

      const seg = matter.add.circle(x, y, SEGMENT_RADIUS, {
        label: 'rope-segment',
        frictionAir: 0.001, // Near-zero — segments shouldn't bleed swing energy
        collisionFilter: {
          category: 0x0002,
          mask: 0x0001,
        },
      }) as MatterJS.BodyType;

      this.segments.push(seg);
    }

    // anchor → first segment
    this.anchorConstraint = matter.add.constraint(
      this.anchorBody,
      this.segments[0],
      SEGMENT_LENGTH,
      SEGMENT_STIFFNESS,
      { pointA: { x: 0, y: 0 }, pointB: { x: 0, y: 0 } }
    ) as MatterJS.ConstraintType;

    // segment → segment
    for (let i = 0; i < segmentCount - 1; i++) {
      const link = matter.add.constraint(
        this.segments[i],
        this.segments[i + 1],
        SEGMENT_LENGTH,
        SEGMENT_STIFFNESS,
        { pointA: { x: 0, y: 0 }, pointB: { x: 0, y: 0 } }
      ) as MatterJS.ConstraintType;
      this.links.push(link);
    }

    // last segment → player
    this.playerConstraint = matter.add.constraint(
      this.segments[segmentCount - 1],
      this.player.matterBody as MatterJS.BodyType,
      SEGMENT_LENGTH,
      SEGMENT_STIFFNESS,
      { pointA: { x: 0, y: 0 }, pointB: { x: 0, y: 0 } }
    ) as MatterJS.ConstraintType;
  }

  // ── Release ──────────────────────────────────────────────────────────────────

  private release(): void {
    const world = this.scene.matter.world;

    if (this.anchorConstraint) world.removeConstraint(this.anchorConstraint);
    if (this.playerConstraint) world.removeConstraint(this.playerConstraint);
    for (const link of this.links) world.removeConstraint(link);
    for (const seg of this.segments) world.remove(seg);
    if (this.anchorBody) world.remove(this.anchorBody);

    this.anchorConstraint = null;
    this.playerConstraint = null;
    this.links = [];
    this.segments = [];
    this.anchorBody = null;
    this._anchorPoint = null;
  }

  // ── Reeling ──────────────────────────────────────────────────────────────────

  private reel(dy: number): void {
    if (!this.isAttached()) return;
    // Accumulate scroll — threshold crossing adds/removes one segment
    this.targetRopeLength = Math.max(
      SEGMENT_LENGTH * 2,
      Math.min(GRAPPLE_MAX_DISTANCE, this.targetRopeLength + dy * REEL_SENSITIVITY)
    );
  }

  private applyReel(): void {
    const desiredCount = Math.max(2, Math.round(this.targetRopeLength / SEGMENT_LENGTH));
    const currentCount = this.segments.length;

    // Only change by one segment per frame to keep it smooth
    if (desiredCount < currentCount) {
      this.removeSegmentFromPlayer();
    } else if (desiredCount > currentCount) {
      this.addSegmentNearPlayer();
    }
  }

  private removeSegmentFromPlayer(): void {
    if (this.segments.length <= 2) return;

    const world = this.scene.matter.world;

    if (this.playerConstraint) world.removeConstraint(this.playerConstraint);
    const lastLink = this.links.pop();
    if (lastLink) world.removeConstraint(lastLink);

    const removed = this.segments.pop()!;
    world.remove(removed);

    this.playerConstraint = this.scene.matter.add.constraint(
      this.segments[this.segments.length - 1],
      this.player.matterBody as MatterJS.BodyType,
      SEGMENT_LENGTH,
      SEGMENT_STIFFNESS,
      { pointA: { x: 0, y: 0 }, pointB: { x: 0, y: 0 } }
    ) as MatterJS.ConstraintType;
  }

  private addSegmentNearPlayer(): void {
    const world = this.scene.matter.world;
    const matter = this.scene.matter;

    if (this.playerConstraint) world.removeConstraint(this.playerConstraint);

    const lastSeg = this.segments[this.segments.length - 1];
    const newSeg = matter.add.circle(
      lastSeg.position.x,
      lastSeg.position.y + SEGMENT_LENGTH,
      SEGMENT_RADIUS,
      {
        label: 'rope-segment',
        frictionAir: 0.001,
        collisionFilter: { category: 0x0002, mask: 0x0001 },
      }
    ) as MatterJS.BodyType;

    const newLink = matter.add.constraint(
      lastSeg,
      newSeg,
      SEGMENT_LENGTH,
      SEGMENT_STIFFNESS,
      { pointA: { x: 0, y: 0 }, pointB: { x: 0, y: 0 } }
    ) as MatterJS.ConstraintType;

    this.segments.push(newSeg);
    this.links.push(newLink);

    this.playerConstraint = matter.add.constraint(
      newSeg,
      this.player.matterBody as MatterJS.BodyType,
      SEGMENT_LENGTH,
      SEGMENT_STIFFNESS,
      { pointA: { x: 0, y: 0 }, pointB: { x: 0, y: 0 } }
    ) as MatterJS.ConstraintType;
  }

  // ── Raycast ──────────────────────────────────────────────────────────────────

  private raycast(
    origin: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    maxDist: number
  ): Phaser.Math.Vector2 | null {
    const bodies = this.scene.matter.world.getAllBodies() as MatterJS.BodyType[];
    const staticBodies = bodies.filter((b) => b.isStatic && b.label === 'platform');

    let closestHit: Phaser.Math.Vector2 | null = null;
    let closestDist = maxDist;

    for (const body of staticBodies) {
      const hit = this.rayVsAABB(origin, direction, body.bounds, closestDist);
      if (hit !== null) {
        const d = Phaser.Math.Distance.Between(origin.x, origin.y, hit.x, hit.y);
        if (d < closestDist) {
          closestDist = d;
          closestHit = hit;
        }
      }
    }

    return closestHit;
  }

  private rayVsAABB(
    origin: Phaser.Math.Vector2,
    dir: Phaser.Math.Vector2,
    bounds: { min: { x: number; y: number }; max: { x: number; y: number } },
    maxDist: number
  ): Phaser.Math.Vector2 | null {
    const invDirX = dir.x !== 0 ? 1 / dir.x : Infinity;
    const invDirY = dir.y !== 0 ? 1 / dir.y : Infinity;

    const t1 = (bounds.min.x - origin.x) * invDirX;
    const t2 = (bounds.max.x - origin.x) * invDirX;
    const t3 = (bounds.min.y - origin.y) * invDirY;
    const t4 = (bounds.max.y - origin.y) * invDirY;

    const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
    const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));

    if (tmax < 0 || tmin > tmax || tmin > maxDist) return null;

    const t = tmin < 0 ? tmax : tmin;
    return new Phaser.Math.Vector2(origin.x + dir.x * t, origin.y + dir.y * t);
  }
}