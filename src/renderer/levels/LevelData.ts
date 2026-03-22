export interface PlatformRect {
  x: number;      // Centre x in world space
  y: number;      // Centre y in world space
  width: number;
  height: number;
}

export interface LevelData {
  worldWidth: number;
  worldHeight: number;
  playerStart: { x: number; y: number };
  flagPosition: { x: number; y: number };
  platforms: PlatformRect[];
}