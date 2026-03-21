import Phaser from 'phaser';
import { Player } from './Player';

// ── Tuning constants ─────────────────────────────────────────────────────────
const GRAPPLE_MAX_DISTANCE = 400;
const SEGMENT_LENGTH = 20;
const SEGMENT_RADIUS = 3;
const SEGMENT_STIFFNESS = 1.0;
const REEL_SENSITIVITY = 0.4;
const MIN_FIRE_DISTANCE = 40;   // Ignore platforms closer than this when firing
const WRAP_BUFFER = 15;         // How far from player to stop the wrap raycast

interface RayHit {
  point: Phaser.Math.Vector2;
  bounds: { min: { x: number; y: number }; max: { x: number; y: number } };
  dist: number;
}

interface WrapPoint {
  point: Phaser.Math.Vector2;
  anchorBody: MatterJS.BodyType;
}

export class GrappleHook {
  private scene: Phaser.Scene;
  private player: Player;

  // Stack of wrap points. Index 0 = original anchor, last = active physics anchor.
  private wrapStack: WrapPoint[] = [];

  // Physics chain from active anchor → player
  private segments: MatterJS.BodyType[] = [];
  private links: MatterJS.ConstraintType[] = [];
  private anchorConstraint: MatterJS.ConstraintType | null = null;
  private playerConstraint: MatterJS.ConstraintType | null = null;

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

  // ── Public API ───────────────────────────────────────────────────────────────

  get anchorPoint(): Phaser.Math.Vector2 | null {
    return this.wrapStack.length > 0 ? this.wrapStack[0].point : null;
  }

  get wrapPoints(): Phaser.Math.Vector2[] {
    return this.wrapStack.map(w => w.point);
  }

  get segmentPositions(): Phaser.Math.Vector2[] {
    return this.segments.map(s => new Phaser.Math.Vector2(s.position.x, s.position.y));
  }

  isAttached(): boolean {
    return this.wrapStack.length > 0;
  }

  // ── Per-frame update ─────────────────────────────────────────────────────────

  update(): void {
    this.player.isSwinging = this.isAttached();
    const activeAnchor = this.wrapStack.length > 0
      ? this.wrapStack[this.wrapStack.length - 1].point
      : null;
    this.player.setAnchorPoint(activeAnchor);

    if (!this.isAttached()) return;

    this.applyReel();
    this.checkWrap();
    this.checkUnwrap();
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

    // Cast from slightly ahead of the player to avoid self-hits on nearby platforms
    const origin = new Phaser.Math.Vector2(
      playerPos.x + dir.x * MIN_FIRE_DISTANCE,
      playerPos.y + dir.y * MIN_FIRE_DISTANCE
    );

    const hit = this.raycast(origin, dir, GRAPPLE_MAX_DISTANCE - MIN_FIRE_DISTANCE);
    if (!hit) return;

    const anchorBody = this.makeAnchorBody(hit.point.x, hit.point.y);
    this.wrapStack.push({ point: hit.point, anchorBody });

    const ropeLength = Phaser.Math.Distance.Between(
      playerPos.x, playerPos.y, hit.point.x, hit.point.y
    );
    this.targetRopeLength = ropeLength;
    this.buildChain(playerPos, hit.point, ropeLength);
  }

  // ── Wrap detection ───────────────────────────────────────────────────────────

  private checkWrap(): void {
    if (this.wrapStack.length === 0) return;

    const activeAnchor = this.wrapStack[this.wrapStack.length - 1].point;
    const playerPos = this.player.position;

    const toPlayer = new Phaser.Math.Vector2(
      playerPos.x - activeAnchor.x,
      playerPos.y - activeAnchor.y
    );
    const dist = toPlayer.length();
    if (dist < WRAP_BUFFER * 2) return;
    toPlayer.normalize();

    // Offset the ray origin a few pixels along the rope direction so it
    // clears the surface the anchor is embedded in, avoiding self-rejection
    const ANCHOR_OFFSET = 12;
    const rayOrigin = new Phaser.Math.Vector2(
      activeAnchor.x + toPlayer.x * ANCHOR_OFFSET,
      activeAnchor.y + toPlayer.y * ANCHOR_OFFSET
    );

    const hit = this.raycast(rayOrigin, toPlayer, dist - WRAP_BUFFER - ANCHOR_OFFSET);
    if (!hit) return;

    // Found an obstruction — wrap around the nearest corner to the player
    const corner = this.nearestCorner(hit.bounds, playerPos);

    // Don't re-wrap the same corner we're already on
    const currentAnchor = this.wrapStack[this.wrapStack.length - 1].point;
    if (Phaser.Math.Distance.Between(corner.x, corner.y, currentAnchor.x, currentAnchor.y) < 10) return;

    this.destroyChain();

    const anchorBody = this.makeAnchorBody(corner.x, corner.y);
    this.wrapStack.push({ point: corner, anchorBody });

    const newLength = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, corner.x, corner.y);
    this.targetRopeLength = newLength;
    this.buildChain(playerPos, corner, newLength);
  }

  private checkUnwrap(): void {
    if (this.wrapStack.length < 2) return;

    const prevAnchor = this.wrapStack[this.wrapStack.length - 2].point;
    const playerPos = this.player.position;

    const toPlayer = new Phaser.Math.Vector2(
      playerPos.x - prevAnchor.x,
      playerPos.y - prevAnchor.y
    );
    const dist = toPlayer.length();
    if (dist < WRAP_BUFFER * 2) return;
    toPlayer.normalize();

    // Offset origin away from the surface the previous anchor is embedded in
    const ANCHOR_OFFSET = 12;
    const rayOrigin = new Phaser.Math.Vector2(
      prevAnchor.x + toPlayer.x * ANCHOR_OFFSET,
      prevAnchor.y + toPlayer.y * ANCHOR_OFFSET
    );

    const hit = this.raycast(rayOrigin, toPlayer, dist - WRAP_BUFFER - ANCHOR_OFFSET);
    if (hit) return; // Still blocked — keep wrapping

    // Clear — pop the active wrap point
    const removed = this.wrapStack.pop()!;
    this.scene.matter.world.remove(removed.anchorBody);

    this.destroyChain();

    const newAnchor = this.wrapStack[this.wrapStack.length - 1].point;
    const newLength = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, newAnchor.x, newAnchor.y);
    this.targetRopeLength = newLength;
    this.buildChain(playerPos, newAnchor, newLength);
  }

  // ── Chain construction ───────────────────────────────────────────────────────

  private buildChain(
    from: Phaser.Math.Vector2,
    to: Phaser.Math.Vector2,
    length: number
  ): void {
    const segmentCount = Math.max(2, Math.round(length / SEGMENT_LENGTH));
    const matter = this.scene.matter;
    const activeAnchorBody = this.wrapStack[this.wrapStack.length - 1].anchorBody;

    for (let i = 0; i < segmentCount; i++) {
      const t = i / (segmentCount - 1);
      const x = Phaser.Math.Linear(to.x, from.x, t);
      const y = Phaser.Math.Linear(to.y, from.y, t);

      const seg = matter.add.circle(x, y, SEGMENT_RADIUS, {
        label: 'rope-segment',
        frictionAir: 0.001,
        collisionFilter: { category: 0x0002, mask: 0x0001 },
      }) as MatterJS.BodyType;

      this.segments.push(seg);
    }

    this.anchorConstraint = matter.add.constraint(
      activeAnchorBody, this.segments[0],
      SEGMENT_LENGTH, SEGMENT_STIFFNESS,
      { pointA: { x: 0, y: 0 }, pointB: { x: 0, y: 0 } }
    ) as MatterJS.ConstraintType;

    for (let i = 0; i < segmentCount - 1; i++) {
      this.links.push(matter.add.constraint(
        this.segments[i], this.segments[i + 1],
        SEGMENT_LENGTH, SEGMENT_STIFFNESS,
        { pointA: { x: 0, y: 0 }, pointB: { x: 0, y: 0 } }
      ) as MatterJS.ConstraintType);
    }

    this.playerConstraint = matter.add.constraint(
      this.segments[segmentCount - 1],
      this.player.matterBody as MatterJS.BodyType,
      SEGMENT_LENGTH, SEGMENT_STIFFNESS,
      { pointA: { x: 0, y: 0 }, pointB: { x: 0, y: 0 } }
    ) as MatterJS.ConstraintType;
  }

  private destroyChain(): void {
    const world = this.scene.matter.world;
    if (this.anchorConstraint) world.removeConstraint(this.anchorConstraint);
    if (this.playerConstraint) world.removeConstraint(this.playerConstraint);
    for (const link of this.links) world.removeConstraint(link);
    for (const seg of this.segments) world.remove(seg);
    this.anchorConstraint = null;
    this.playerConstraint = null;
    this.links = [];
    this.segments = [];
  }

  // ── Release ──────────────────────────────────────────────────────────────────

  private release(): void {
    this.destroyChain();
    for (const wrap of this.wrapStack) {
      this.scene.matter.world.remove(wrap.anchorBody);
    }
    this.wrapStack = [];
    this.targetRopeLength = 0;
  }

  // ── Reeling ──────────────────────────────────────────────────────────────────

  private reel(dy: number): void {
    if (!this.isAttached()) return;
    this.targetRopeLength = Math.max(
      SEGMENT_LENGTH * 2,
      Math.min(GRAPPLE_MAX_DISTANCE, this.targetRopeLength + dy * REEL_SENSITIVITY)
    );
  }

  private applyReel(): void {
    const desiredCount = Math.max(2, Math.round(this.targetRopeLength / SEGMENT_LENGTH));
    const currentCount = this.segments.length;
    if (desiredCount < currentCount) this.removeSegmentFromPlayer();
    else if (desiredCount > currentCount) this.addSegmentNearPlayer();
  }

  private removeSegmentFromPlayer(): void {
    if (this.segments.length <= 2) return;
    const world = this.scene.matter.world;
    if (this.playerConstraint) world.removeConstraint(this.playerConstraint);
    const lastLink = this.links.pop();
    if (lastLink) world.removeConstraint(lastLink);
    world.remove(this.segments.pop()!);
    this.playerConstraint = this.scene.matter.add.constraint(
      this.segments[this.segments.length - 1],
      this.player.matterBody as MatterJS.BodyType,
      SEGMENT_LENGTH, SEGMENT_STIFFNESS,
      { pointA: { x: 0, y: 0 }, pointB: { x: 0, y: 0 } }
    ) as MatterJS.ConstraintType;
  }

  private addSegmentNearPlayer(): void {
    const world = this.scene.matter.world;
    const matter = this.scene.matter;
    if (this.playerConstraint) world.removeConstraint(this.playerConstraint);
    const lastSeg = this.segments[this.segments.length - 1];
    const newSeg = matter.add.circle(
      lastSeg.position.x, lastSeg.position.y + SEGMENT_LENGTH, SEGMENT_RADIUS,
      { label: 'rope-segment', frictionAir: 0.001, collisionFilter: { category: 0x0002, mask: 0x0001 } }
    ) as MatterJS.BodyType;
    this.links.push(matter.add.constraint(
      lastSeg, newSeg, SEGMENT_LENGTH, SEGMENT_STIFFNESS,
      { pointA: { x: 0, y: 0 }, pointB: { x: 0, y: 0 } }
    ) as MatterJS.ConstraintType);
    this.segments.push(newSeg);
    this.playerConstraint = matter.add.constraint(
      newSeg, this.player.matterBody as MatterJS.BodyType,
      SEGMENT_LENGTH, SEGMENT_STIFFNESS,
      { pointA: { x: 0, y: 0 }, pointB: { x: 0, y: 0 } }
    ) as MatterJS.ConstraintType;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private makeAnchorBody(x: number, y: number): MatterJS.BodyType {
    return this.scene.matter.add.circle(x, y, 2, {
      isStatic: true, isSensor: true, label: 'anchor',
    }) as MatterJS.BodyType;
  }

  private nearestCorner(
    bounds: { min: { x: number; y: number }; max: { x: number; y: number } },
    reference: Phaser.Math.Vector2
  ): Phaser.Math.Vector2 {
    const corners = [
      new Phaser.Math.Vector2(bounds.min.x, bounds.min.y),
      new Phaser.Math.Vector2(bounds.max.x, bounds.min.y),
      new Phaser.Math.Vector2(bounds.min.x, bounds.max.y),
      new Phaser.Math.Vector2(bounds.max.x, bounds.max.y),
    ];
    return corners.reduce((nearest, corner) => {
      const d = Phaser.Math.Distance.Between(reference.x, reference.y, corner.x, corner.y);
      const nd = Phaser.Math.Distance.Between(reference.x, reference.y, nearest.x, nearest.y);
      return d < nd ? corner : nearest;
    });
  }

  // ── Unified raycast ──────────────────────────────────────────────────────────

  /**
   * Single raycast returning both hit point and the bounds of the hit body.
   * Returns null if nothing is hit within maxDist.
   */
  private raycast(
    origin: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    maxDist: number
  ): RayHit | null {
    const bodies = this.scene.matter.world.getAllBodies() as MatterJS.BodyType[];
    const platforms = bodies.filter(b => b.isStatic && b.label === 'platform');

    let result: RayHit | null = null;

    for (const body of platforms) {
      const hit = this.rayVsAABB(origin, direction, body.bounds, result ? result.dist : maxDist);
      if (hit) {
        const d = Phaser.Math.Distance.Between(origin.x, origin.y, hit.x, hit.y);
        result = { point: hit, bounds: body.bounds, dist: d };
      }
    }

    return result;
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

    // tmin must be positive (entry point is ahead of us) and within range
    // If tmin < 0, origin is inside the box — skip it entirely
    if (tmin < 0.1 || tmin > tmax || tmin > maxDist) return null;

    return new Phaser.Math.Vector2(origin.x + dir.x * tmin, origin.y + dir.y * tmin);
  }
}