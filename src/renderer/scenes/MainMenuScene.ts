import Phaser from 'phaser';

const BTN_W = 420;
const BTN_H = 52;
const BTN_BORDER = 4;
const CX = 640; // canvas centre x
const BTN_START_Y = 290;
const BTN_GAP = 72;

const COL_BG       = 0x0d1f33;
const COL_BORDER   = 0x4a9eff;
const COL_TEXT     = '#4a9eff';
const COL_ACTIVE   = 0x4a9eff;
const COL_TEXT_ACT = '#0d1f33';
const COL_TITLE    = '#4a9eff';
const COL_SUB      = '#ffdd57';
const COL_ARROW    = '#ffdd57';

interface Button {
  bg: Phaser.GameObjects.Rectangle;
  border: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  action: () => void;
}

export class MainMenuScene extends Phaser.Scene {
  private buttons: Button[] = [];
  private arrow!: Phaser.GameObjects.Text;
  private selectedIndex = 0;
  private upKey!: Phaser.Input.Keyboard.Key;
  private downKey!: Phaser.Input.Keyboard.Key;
  private wKey!: Phaser.Input.Keyboard.Key;
  private sKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    this.selectedIndex = 0;
    this.buttons = [];

    this.drawBackground();
    this.drawTitle();
    this.buildButtons();
    this.buildArrow();
    this.setupKeys();

    this.selectButton(0);
  }

  // ── Background ──────────────────────────────────────────────────────────────

  private drawBackground(): void {
    this.add.rectangle(640, 360, 1280, 720, 0x1a1a2e);

    const g = this.add.graphics();
    g.lineStyle(1, COL_BORDER, 0.06);
    for (let x = 0; x <= 1280; x += 32) {
      g.moveTo(x, 0);
      g.lineTo(x, 720);
    }
    for (let y = 0; y <= 720; y += 32) {
      g.moveTo(0, y);
      g.lineTo(1280, y);
    }
    g.strokePath();
  }

  // ── Title ───────────────────────────────────────────────────────────────────

  private drawTitle(): void {
    // Shadow pass
    this.add.text(CX + 4, 124, 'GRAPPLE LEGACY', {
      fontFamily: '"Press Start 2P"',
      fontSize: '48px',
      color: '#0a2a4a',
    }).setOrigin(0.5);

    // Main title
    this.add.text(CX, 120, 'GRAPPLE LEGACY', {
      fontFamily: '"Press Start 2P"',
      fontSize: '48px',
      color: COL_TITLE,
    }).setOrigin(0.5);

    // Tagline
    this.add.text(CX, 190, 'Rope.  Momentum.  Legacy.', {
      fontFamily: '"Press Start 2P"',
      fontSize: '11px',
      color: COL_SUB,
    }).setOrigin(0.5);
  }

  // ── Buttons ─────────────────────────────────────────────────────────────────

  private buildButtons(): void {
    const items: [string, () => void][] = [
      ['Play',         () => this.scene.start('GameScene', { levelIndex: 0 })],
      ['Level Select', () => this.scene.start('LevelSelectScene')],
      ['Settings',     () => this.scene.start('SettingsScene')],
      ['Quit',         () => window.close()],
    ];

    // Quit button is narrower
    const widths = [BTN_W, BTN_W, BTN_W, 200];

    items.forEach(([label, action], i) => {
      const y = BTN_START_Y + i * BTN_GAP;
      const w = widths[i];
      const btn = this.makeButton(CX, y, w, label, action);
      this.buttons.push(btn);
    });
  }

  private makeButton(x: number, y: number, w: number, label: string, action: () => void): Button {
    const bg = this.add.rectangle(x, y, w, BTN_H, COL_BG).setInteractive({ useHandCursor: true });

    const border = this.add.graphics();
    this.drawBorder(border, x, y, w, BTN_H, COL_BORDER);

    const text = this.add.text(x, y, label, {
      fontFamily: '"Press Start 2P"',
      fontSize: '14px',
      color: COL_TEXT,
    }).setOrigin(0.5);

    const idx = this.buttons.length;
    bg.on('pointerover', () => this.selectButton(idx));
    bg.on('pointerdown', () => action());

    return { bg, border, label: text, action };
  }

  private drawBorder(
    g: Phaser.GameObjects.Graphics,
    cx: number, cy: number,
    w: number, h: number,
    color: number
  ): void {
    g.clear();
    g.lineStyle(BTN_BORDER, color, 1);
    g.strokeRect(cx - w / 2, cy - h / 2, w, h);
  }

  // ── Arrow selector ──────────────────────────────────────────────────────────

  private buildArrow(): void {
    this.arrow = this.add.text(0, 0, '▶', {
      fontFamily: '"Press Start 2P"',
      fontSize: '16px',
      color: COL_ARROW,
    }).setOrigin(0.5);
  }

  // ── Selection state ─────────────────────────────────────────────────────────

  private selectButton(idx: number): void {
    // Deselect previous
    const prev = this.buttons[this.selectedIndex];
    if (prev) {
      prev.bg.setFillStyle(COL_BG);
      prev.label.setColor(COL_TEXT);
    }

    this.selectedIndex = idx;

    // Activate new
    const cur = this.buttons[idx];
    cur.bg.setFillStyle(COL_ACTIVE);
    cur.label.setColor(COL_TEXT_ACT);

    // Move arrow to left edge of button
    const btnY = BTN_START_Y + idx * BTN_GAP;
    const btnW = idx === 3 ? 200 : BTN_W;
    this.arrow.setPosition(CX - btnW / 2 - 24, btnY);
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────────

  private setupKeys(): void {
    const kb = this.input.keyboard!;
    this.upKey    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.wKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.sKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.enterKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
  }

  update(): void {
    if (
      Phaser.Input.Keyboard.JustDown(this.upKey) ||
      Phaser.Input.Keyboard.JustDown(this.wKey)
    ) {
      this.selectButton((this.selectedIndex + this.buttons.length - 1) % this.buttons.length);
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.downKey) ||
      Phaser.Input.Keyboard.JustDown(this.sKey)
    ) {
      this.selectButton((this.selectedIndex + 1) % this.buttons.length);
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.buttons[this.selectedIndex].action();
    }
  }
}
