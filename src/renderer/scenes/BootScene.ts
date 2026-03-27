import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    document.fonts.ready.then(() => {
      this.scene.start('MainMenuScene');
    });
  }
}
