import Phaser from 'phaser';

const LEVEL_COUNT = 1; // Keep in sync with GameScene — increment as levels are added
const SLOT_W = 180;
const SLOT_H = 180;
const SLOT_GAP = 24;
const SLOTS_PER_ROW = 5;

const COL_BG_ACTIVE  = 0x0d1f33;
const COL_BG_LOCKED  = 0x0a1020;
const COL_BORDER_ACT = 0x4a9eff;
const COL_BORDER_LOK = 0x1e3a55;

export class LevelSelectScene extends Phaser.Scene {
  private slots: Phaser.GameObjects.Container[] = [];
  private selectedIndex = 0;
  private upKey!: Phaser.Input.Keyboard.Key;
  private downKey!: Phaser.Input.Keyboard.Key;
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create(): void {
    this.selectedIndex = 0;
    this.slots = [];

    this.drawBackground();
    this.drawTitle();
    this.buildSlots();
    this.setupKeys();
    this.highlightSlot(0);
  }

  // ── Background ──────────────────────────────────────────────────────────────

  private drawBackground(): void {
    this.add.rectangle(640, 360, 1280, 720, 0x1a1a2e);
    const g = this.add.graphics();
    g.lineStyle(1, 0x4a9eff, 0.06);
    for (let x = 0; x <= 1280; x += 32) { g.moveTo(x, 0); g.lineTo(x, 720); }
    for (let y = 0; y <= 720; y += 32) { g.moveTo(0, y); g.lineTo(1280, y); }
    g.strokePath();
  }

  // ── Title ───────────────────────────────────────────────────────────────────

  private drawTitle(): void {
    this.add.text(644, 64, 'LEVEL SELECT', {
      fontFamily: '"Press Start 2P"', fontSize: '32px', color: '#0a2a4a',
    }).setOrigin(0.5);
    this.add.text(640, 60, 'LEVEL SELECT', {
      fontFamily: '"Press Start 2P"', fontSize: '32px', color: '#4a9eff',
    }).setOrigin(0.5);

    this.add.text(640, 680, 'ESC — Back to Menu', {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#4a9eff',
    }).setOrigin(0.5).setAlpha(0.5);
  }

  // ── Slots ────────────────────────────────────────────────────────────────────

  private buildSlots(): void {
    // Total display slots — show at least 10 so the grid looks intentional
    const totalSlots = Math.max(10, LEVEL_COUNT);

    const gridW = SLOTS_PER_ROW * SLOT_W + (SLOTS_PER_ROW - 1) * SLOT_GAP;
    const startX = 640 - gridW / 2 + SLOT_W / 2;
    const startY = 160;

    for (let i = 0; i < totalSlots; i++) {
      const col = i % SLOTS_PER_ROW;
      const row = Math.floor(i / SLOTS_PER_ROW);
      const x = startX + col * (SLOT_W + SLOT_GAP);
      const y = startY + row * (SLOT_H + SLOT_GAP);
      const unlocked = i < LEVEL_COUNT;

      const slot = this.makeSlot(x, y, i + 1, unlocked);
      this.slots.push(slot);
    }
  }

  private makeSlot(x: number, y: number, num: number, unlocked: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, SLOT_W, SLOT_H, unlocked ? COL_BG_ACTIVE : COL_BG_LOCKED);

    const border = this.add.graphics();
    border.lineStyle(4, unlocked ? COL_BORDER_ACT : COL_BORDER_LOK, 1);
    border.strokeRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H);

    const numText = this.add.text(0, -16, String(num), {
      fontFamily: '"Press Start 2P"',
      fontSize: '36px',
      color: unlocked ? '#4a9eff' : '#1e3a55',
    }).setOrigin(0.5);

    const statusText = this.add.text(0, 36, unlocked ? 'PLAY' : 'LOCKED', {
      fontFamily: '"Press Start 2P"',
      fontSize: '9px',
      color: unlocked ? '#ffdd57' : '#1e3a55',
    }).setOrigin(0.5);

    container.add([bg, border, numText, statusText]);

    if (unlocked) {
      bg.setInteractive({ useHandCursor: true });
      const idx = this.slots.length;
      bg.on('pointerover', () => this.highlightSlot(idx));
      bg.on('pointerdown', () => this.playLevel(idx));
    }

    return container;
  }

  // ── Highlight ────────────────────────────────────────────────────────────────

  private highlightSlot(idx: number): void {
    if (idx >= LEVEL_COUNT) return; // Can't select locked slots

    // Reset previous
    const prev = this.slots[this.selectedIndex];
    if (prev && this.selectedIndex < LEVEL_COUNT) {
      const [bg, border] = prev.list as [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Graphics];
      bg.setFillStyle(COL_BG_ACTIVE);
      border.clear();
      border.lineStyle(4, COL_BORDER_ACT, 1);
      border.strokeRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H);
    }

    this.selectedIndex = idx;

    const cur = this.slots[idx];
    const [bg, border] = cur.list as [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Graphics];
    bg.setFillStyle(0x4a9eff);
    border.clear();
    border.lineStyle(4, 0xffffff, 1);
    border.strokeRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H);
    // Flip number colour when bg turns cyan
    (cur.list[2] as Phaser.GameObjects.Text).setColor('#0d1f33');
    (cur.list[3] as Phaser.GameObjects.Text).setColor('#0d1f33');
  }

  private unhighlightSlot(idx: number): void {
    if (idx >= LEVEL_COUNT) return;
    const slot = this.slots[idx];
    const [bg, border] = slot.list as [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Graphics];
    bg.setFillStyle(COL_BG_ACTIVE);
    border.clear();
    border.lineStyle(4, COL_BORDER_ACT, 1);
    border.strokeRect(-SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H);
    (slot.list[2] as Phaser.GameObjects.Text).setColor('#4a9eff');
    (slot.list[3] as Phaser.GameObjects.Text).setColor('#ffdd57');
  }

  private playLevel(idx: number): void {
    this.scene.start('GameScene', { levelIndex: idx });
  }

  // ── Keys ─────────────────────────────────────────────────────────────────────

  private setupKeys(): void {
    const kb = this.input.keyboard!;
    this.upKey    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.leftKey  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.enterKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escKey   = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.scene.start('MainMenuScene');
      return;
    }

    let next = this.selectedIndex;

    if (Phaser.Input.Keyboard.JustDown(this.rightKey)) next += 1;
    if (Phaser.Input.Keyboard.JustDown(this.leftKey))  next -= 1;
    if (Phaser.Input.Keyboard.JustDown(this.downKey))  next += SLOTS_PER_ROW;
    if (Phaser.Input.Keyboard.JustDown(this.upKey))    next -= SLOTS_PER_ROW;

    next = Phaser.Math.Clamp(next, 0, LEVEL_COUNT - 1);
    if (next !== this.selectedIndex) {
      this.unhighlightSlot(this.selectedIndex);
      this.highlightSlot(next);
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.playLevel(this.selectedIndex);
    }
  }
}
