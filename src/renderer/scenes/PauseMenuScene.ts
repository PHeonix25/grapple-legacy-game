import Phaser from 'phaser';

const CX = 640;
const BTN_W = 360;
const BTN_H = 52;
const BTN_BORDER = 4;
const COL_BG       = 0x0d1f33;
const COL_BORDER   = 0x4a9eff;
const COL_TEXT     = '#4a9eff';
const COL_ACTIVE   = 0x4a9eff;
const COL_TEXT_ACT = '#0d1f33';

interface Button {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  action: () => void;
}

export class PauseMenuScene extends Phaser.Scene {
  private buttons: Button[] = [];
  private arrow!: Phaser.GameObjects.Text;
  private selectedIndex = 0;
  private upKey!: Phaser.Input.Keyboard.Key;
  private downKey!: Phaser.Input.Keyboard.Key;
  private wKey!: Phaser.Input.Keyboard.Key;
  private sKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'PauseMenuScene' });
  }

  create(): void {
    this.selectedIndex = 0;
    this.buttons = [];

    this.drawOverlay();
    this.drawTitle();
    this.buildButtons();
    this.buildArrow();
    this.setupKeys();
    this.selectButton(0);
  }

  // ── Overlay ──────────────────────────────────────────────────────────────────

  private drawOverlay(): void {
    // Semi-transparent dark overlay over the paused game
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.7);

    // Subtle grid
    const g = this.add.graphics();
    g.lineStyle(1, 0x4a9eff, 0.06);
    for (let x = 0; x <= 1280; x += 32) { g.moveTo(x, 0); g.lineTo(x, 720); }
    for (let y = 0; y <= 720; y += 32) { g.moveTo(0, y); g.lineTo(1280, y); }
    g.strokePath();

    // Panel border
    const panel = this.add.graphics();
    panel.lineStyle(BTN_BORDER, COL_BORDER, 1);
    panel.strokeRect(CX - 260, 220, 520, 300);
  }

  // ── Title ────────────────────────────────────────────────────────────────────

  private drawTitle(): void {
    this.add.text(CX + 3, 283, 'PAUSED', {
      fontFamily: '"Press Start 2P"', fontSize: '36px', color: '#0a2a4a',
    }).setOrigin(0.5);
    this.add.text(CX, 280, 'PAUSED', {
      fontFamily: '"Press Start 2P"', fontSize: '36px', color: '#4a9eff',
    }).setOrigin(0.5);
  }

  // ── Buttons ──────────────────────────────────────────────────────────────────

  private buildButtons(): void {
    const items: [string, () => void][] = [
      ['Resume',    () => this.resume()],
      ['Main Menu', () => this.goToMainMenu()],
    ];

    items.forEach(([label, action], i) => {
      const y = 370 + i * 70;
      const btn = this.makeButton(CX, y, label, action);
      this.buttons.push(btn);
    });
  }

  private makeButton(x: number, y: number, label: string, action: () => void): Button {
    const bg = this.add.rectangle(x, y, BTN_W, BTN_H, COL_BG).setInteractive({ useHandCursor: true });

    const border = this.add.graphics();
    border.lineStyle(BTN_BORDER, COL_BORDER, 1);
    border.strokeRect(x - BTN_W / 2, y - BTN_H / 2, BTN_W, BTN_H);

    const text = this.add.text(x, y, label, {
      fontFamily: '"Press Start 2P"', fontSize: '14px', color: COL_TEXT,
    }).setOrigin(0.5);

    const idx = this.buttons.length;
    bg.on('pointerover', () => this.selectButton(idx));
    bg.on('pointerdown', () => action());

    return { bg, label: text, action };
  }

  // ── Arrow ────────────────────────────────────────────────────────────────────

  private buildArrow(): void {
    this.arrow = this.add.text(0, 0, '▶', {
      fontFamily: '"Press Start 2P"', fontSize: '16px', color: '#ffdd57',
    }).setOrigin(0.5);
  }

  // ── Selection ────────────────────────────────────────────────────────────────

  private selectButton(idx: number): void {
    const prev = this.buttons[this.selectedIndex];
    if (prev) {
      prev.bg.setFillStyle(COL_BG);
      prev.label.setColor(COL_TEXT);
    }
    this.selectedIndex = idx;
    const cur = this.buttons[idx];
    cur.bg.setFillStyle(COL_ACTIVE);
    cur.label.setColor(COL_TEXT_ACT);
    this.arrow.setPosition(CX - BTN_W / 2 - 24, 370 + idx * 70);
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  private resume(): void {
    this.scene.stop();
    this.scene.resume('GameScene');
  }

  private goToMainMenu(): void {
    this.scene.stop('GameScene');
    this.scene.start('MainMenuScene');
  }

  // ── Keys ─────────────────────────────────────────────────────────────────────

  private setupKeys(): void {
    const kb = this.input.keyboard!;
    this.upKey    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.wKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.sKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.enterKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escKey   = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.resume();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.upKey) || Phaser.Input.Keyboard.JustDown(this.wKey)) {
      this.selectButton((this.selectedIndex + this.buttons.length - 1) % this.buttons.length);
    }
    if (Phaser.Input.Keyboard.JustDown(this.downKey) || Phaser.Input.Keyboard.JustDown(this.sKey)) {
      this.selectButton((this.selectedIndex + 1) % this.buttons.length);
    }
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.buttons[this.selectedIndex].action();
    }
  }
}
