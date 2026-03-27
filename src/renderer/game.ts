import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { SettingsScene } from './scenes/SettingsScene';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 2.5 },
      debug: false,
      positionIterations: 10,
      velocityIterations: 10,
      constraintIterations: 10,
    },
  },
  scene: [BootScene, MainMenuScene, LevelSelectScene, SettingsScene, GameScene],
};

new Phaser.Game(config);