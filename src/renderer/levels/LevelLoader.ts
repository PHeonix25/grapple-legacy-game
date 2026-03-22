import { LevelData, PlatformRect } from './LevelData';

// Pixels darker than this threshold (0–255) are treated as solid
const DARK_THRESHOLD = 100;

// Minimum pixel run width to be considered a platform (avoids noise dots)
const MIN_PLATFORM_WIDTH_PX = 3;

// How many rows a platform slab can span before we split it
const MAX_MERGE_GAP = 2;

export class LevelLoader {
  /**
   * Parse a loaded Phaser texture into LevelData.
   * The texture must already be loaded via this.load.image() before calling this.
   *
   * @param scene   The Phaser scene (for canvas access)
   * @param key     The texture key as loaded
   * @param worldH  Target world height in pixels (image is scaled to fit this)
   */
  static parse(scene: Phaser.Scene, key: string, worldH: number): LevelData {
    // Draw the texture to an offscreen canvas so we can read pixels
    const texture = scene.textures.get(key);
    const source = texture.getSourceImage() as HTMLImageElement;

    const imgW = source.naturalWidth;
    const imgH = source.naturalHeight;

    const canvas = document.createElement('canvas');
    canvas.width = imgW;
    canvas.height = imgH;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(source, 0, 0);
    const imageData = ctx.getImageData(0, 0, imgW, imgH);
    const pixels = imageData.data; // RGBA flat array

    // Scale factor: map image pixels → world pixels
    const scale = worldH / imgH;
    const worldW = Math.round(imgW * scale);

    // Helper: is a pixel at (px, py) dark?
    const isDark = (px: number, py: number): boolean => {
      const idx = (py * imgW + px) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const brightness = (r + g + b) / 3;
      return brightness < DARK_THRESHOLD;
    };

    // ── Step 1: Collect horizontal runs per row ──────────────────────────────
    // Each run = { x1, x2, y } in image pixel space

    interface Run { x1: number; x2: number; y: number }
    const runs: Run[] = [];

    for (let py = 0; py < imgH; py++) {
      let runStart = -1;
      for (let px = 0; px < imgW; px++) {
        const dark = isDark(px, py);
        if (dark && runStart === -1) {
          runStart = px;
        } else if (!dark && runStart !== -1) {
          const width = px - runStart;
          if (width >= MIN_PLATFORM_WIDTH_PX) {
            runs.push({ x1: runStart, x2: px - 1, y: py });
          }
          runStart = -1;
        }
      }
      // Close run at end of row
      if (runStart !== -1) {
        const width = imgW - runStart;
        if (width >= MIN_PLATFORM_WIDTH_PX) {
          runs.push({ x1: runStart, x2: imgW - 1, y: runStart });
        }
      }
    }

    // ── Step 2: Merge runs into platform slabs ───────────────────────────────
    // Group runs that overlap horizontally across adjacent rows

    interface Slab { x1: number; x2: number; y1: number; y2: number }
    const slabs: Slab[] = [];

    for (const run of runs) {
      // Try to extend an existing slab
      let merged = false;
      for (const slab of slabs) {
        const rowGap = run.y - slab.y2;
        if (rowGap > MAX_MERGE_GAP) continue;

        // Check horizontal overlap
        const overlapX1 = Math.max(run.x1, slab.x1);
        const overlapX2 = Math.min(run.x2, slab.x2);
        if (overlapX2 >= overlapX1) {
          // Extend the slab to encompass this run
          slab.x1 = Math.min(slab.x1, run.x1);
          slab.x2 = Math.max(slab.x2, run.x2);
          slab.y2 = run.y;
          merged = true;
          break;
        }
      }
      if (!merged) {
        slabs.push({ x1: run.x1, x2: run.x2, y1: run.y, y2: run.y });
      }
    }

    // ── Step 3: Convert slabs → world-space PlatformRects ───────────────────

    // Sort slabs left to right for easy identification of start/flag
    slabs.sort((a, b) => a.x1 - b.x1);

    const platforms: PlatformRect[] = slabs.map(slab => {
      const wx1 = slab.x1 * scale;
      const wx2 = (slab.x2 + 1) * scale;
      const wy1 = slab.y1 * scale;
      const wy2 = (slab.y2 + 1) * scale;
      return {
        x: (wx1 + wx2) / 2,
        y: (wy1 + wy2) / 2,
        width: wx2 - wx1,
        height: Math.max(wy2 - wy1, 8), // Minimum 8px tall so thin lines are hittable
      };
    });

    // ── Step 4: Identify player start and flag ───────────────────────────────
    // Player start = leftmost slab, spawn above its top surface
    // Flag         = rightmost slab

    const startSlab = slabs[0];
    const flagSlab = slabs[slabs.length - 1];

    const playerStart = {
      x: ((startSlab.x1 + startSlab.x2) / 2) * scale,
      y: startSlab.y1 * scale - 40, // Spawn above the platform
    };

    const flagPosition = {
      x: ((flagSlab.x1 + flagSlab.x2) / 2) * scale,
      y: flagSlab.y1 * scale - 40,
    };

    // Remove the flag slab from platforms — it's a goal marker, not a surface
    platforms.pop();

    return {
      worldWidth: worldW,
      worldHeight: worldH,
      playerStart,
      flagPosition,
      platforms,
    };
  }
}