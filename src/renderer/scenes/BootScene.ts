import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  async create(): Promise<void> {
    // Explicitly download the font before any scene tries to render it.
    // document.fonts.ready resolves even when fonts haven't been fetched yet;
    // document.fonts.load() actually triggers the download and waits for it.
    try {
      await document.fonts.load('16px "Press Start 2P"');
    } catch {
      // If offline or font fails, continue anyway — fallback font will be used
    }
    this.scene.start('MainMenuScene');
  }
}
