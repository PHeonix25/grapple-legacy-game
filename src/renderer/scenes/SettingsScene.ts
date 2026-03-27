import Phaser from 'phaser';

export class SettingsScene extends Phaser.Scene {
  private escKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    this.drawBackground();
    this.drawContent();
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  private drawBackground(): void {
    this.add.rectangle(640, 360, 1280, 720, 0x1a1a2e);
    const g = this.add.graphics();
    g.lineStyle(1, 0x4a9eff, 0.06);
    for (let x = 0; x <= 1280; x += 32) { g.moveTo(x, 0); g.lineTo(x, 720); }
    for (let y = 0; y <= 720; y += 32) { g.moveTo(0, y); g.lineTo(1280, y); }
    g.strokePath();
  }

  private drawContent(): void {
    // Title shadow + title
    this.add.text(644, 184, 'SETTINGS', {
      fontFamily: '"Press Start 2P"', fontSize: '40px', color: '#0a2a4a',
    }).setOrigin(0.5);
    this.add.text(640, 180, 'SETTINGS', {
      fontFamily: '"Press Start 2P"', fontSize: '40px', color: '#4a9eff',
    }).setOrigin(0.5);

    // Placeholder
    this.add.text(640, 360, 'Coming soon...', {
      fontFamily: '"Press Start 2P"', fontSize: '16px', color: '#1e3a55',
    }).setOrigin(0.5);

    // Back hint
    this.add.text(640, 680, 'ESC — Back to Menu', {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#4a9eff',
    }).setOrigin(0.5).setAlpha(0.5);
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.scene.start('MainMenuScene');
    }
  }
}
