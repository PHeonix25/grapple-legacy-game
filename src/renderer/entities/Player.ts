import Phaser from 'phaser';

const WALK_SPEED = 5;       // Horizontal velocity applied per frame
const JUMP_FORCE = -18;     // Vertical impulse on jump (stronger to match gravity 2.5)
const MAX_FALL_SPEED = 30;  // Terminal velocity
const COYOTE_TIME_MS = 100; // Grace period after walking off an edge
const JUMP_BUFFER_MS = 120; // Pre-press jump before landing

export class Player {
  readonly scene: Phaser.Scene;
  readonly gameObject: Phaser.GameObjects.Image;

  private body: MatterJS.BodyType;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: {
    up: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  // Ground detection
  private isGrounded: boolean = false;
  private coyoteTimer: number = 0;
  private jumpBufferTimer: number = 0;

  // Set to true by GrappleHook while a rope is attached and player is airborne
  private _isSwinging: boolean = false;

  // Anchor position set by GrappleHook each frame — used to rotate the visual toward the rope
  private _anchorPoint: Phaser.Math.Vector2 | null = null;

  // Track whether jump key was just pressed (to avoid hold-to-jump)
  private jumpKeyDown: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    const W = 28;
    const H = 40;

    // Visual — display size matches the physics body (28×40px)
    // Source sprite is 120×240px, scaled down here
    this.gameObject = scene.add.image(x, y, 'player')
      .setDisplaySize(W, H);

    // Physics body — attach to the visual rectangle
    this.body = scene.matter.add.rectangle(x, y, W, H, {
      label: 'player',
      frictionAir: 0.01,  // Small friction — bleeds energy slowly over many swings
      friction: 0.05,
      restitution: 0,
    } as MatterJS.IBodyDefinition) as MatterJS.BodyType;

    // Prevent rotation — inertia isn't in Phaser's TS types but is valid at runtime
    this.scene.matter.body.setInertia(this.body, Infinity);

    // Detect when player touches the ground
    scene.matter.world.on('collisionstart', this.onCollisionStart, this);
    scene.matter.world.on('collisionend', this.onCollisionEnd, this);

    // Input
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      left: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.body.position.x, this.body.position.y);
  }

  get matterBody(): MatterJS.BodyType {
    return this.body;
  }

  set isSwinging(value: boolean) {
    this._isSwinging = value;
  }

  setAnchorPoint(point: Phaser.Math.Vector2 | null): void {
    this._anchorPoint = point;
  }

  update(delta: number): void {
    this.syncVisual();
    this.handleMovement();
    this.handleJump(delta);
    this.clampFallSpeed();
  }

  private syncVisual(): void {
    this.gameObject.setPosition(this.body.position.x, this.body.position.y);

    if (this._isSwinging && this._anchorPoint) {
      const dx = this._anchorPoint.x - this.body.position.x;
      const dy = this._anchorPoint.y - this.body.position.y;
      // atan2 gives angle toward anchor; subtract PI/2 so sprite top points up to anchor
      const angle = Math.atan2(dy, dx) - Math.PI / 2 + Math.PI;
      this.gameObject.setRotation(angle);
    } else {
      this.gameObject.setRotation(0);
    }
  }

  private handleMovement(): void {
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;

    const vel = this.body.velocity;

    if (this.isGrounded) {
      // On the ground — full walk control
      if (left) {
        this.scene.matter.body.setVelocity(this.body, { x: -WALK_SPEED, y: vel.y });
      } else if (right) {
        this.scene.matter.body.setVelocity(this.body, { x: WALK_SPEED, y: vel.y });
      } else {
        // Dampen horizontal velocity only on the ground
        this.scene.matter.body.setVelocity(this.body, { x: vel.x * 0.8, y: vel.y });
      }
    } else if (this._isSwinging) {
      // Swinging — let the pendulum govern momentum entirely.
      // Tiny directional nudge lets the player influence the arc without breaking physics.
      const nudge = 0.003;
      if (left) {
        this.scene.matter.body.applyForce(this.body, this.body.position, { x: -nudge, y: 0 });
      } else if (right) {
        this.scene.matter.body.applyForce(this.body, this.body.position, { x: nudge, y: 0 });
      }
    } else {
      // Airborne, no rope — gentle air steering
      const airControl = 0.006;
      if (left) {
        this.scene.matter.body.applyForce(this.body, this.body.position, { x: -airControl, y: 0 });
      } else if (right) {
        this.scene.matter.body.applyForce(this.body, this.body.position, { x: airControl, y: 0 });
      }
    }
  }

  private handleJump(delta: number): void {
    const wantsJump =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.up);

    if (wantsJump) {
      this.jumpBufferTimer = JUMP_BUFFER_MS;
    }

    // Tick timers
    if (this.isGrounded) {
      this.coyoteTimer = COYOTE_TIME_MS;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - delta);
    }
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - delta);

    // Fire jump if buffer and coyote both active
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      const vel = this.body.velocity;
      this.scene.matter.body.setVelocity(this.body, { x: vel.x, y: JUMP_FORCE });
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
    }
  }

  private clampFallSpeed(): void {
    const vel = this.body.velocity;
    if (vel.y > MAX_FALL_SPEED) {
      this.scene.matter.body.setVelocity(this.body, { x: vel.x, y: MAX_FALL_SPEED });
    }
  }

  private onCollisionStart(
    event: Phaser.Physics.Matter.Events.CollisionStartEvent
  ): void {
    for (const pair of event.pairs) {
      const bodies = [pair.bodyA, pair.bodyB] as MatterJS.BodyType[];
      const isPlayer = bodies.some((b) => b === this.body);
      const isPlatform = bodies.some((b) => b.label === 'platform');
      if (isPlayer && isPlatform) {
        this.isGrounded = true;
      }
    }
  }

  private onCollisionEnd(
    event: Phaser.Physics.Matter.Events.CollisionEndEvent
  ): void {
    for (const pair of event.pairs) {
      const bodies = [pair.bodyA, pair.bodyB] as MatterJS.BodyType[];
      const isPlayer = bodies.some((b) => b === this.body);
      const isPlatform = bodies.some((b) => b.label === 'platform');
      if (isPlayer && isPlatform) {
        this.isGrounded = false;
      }
    }
  }
}