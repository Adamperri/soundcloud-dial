import { PNG } from "pngjs";

export const TITLE_WIDTH = 192;
export const TITLE_HEIGHT = 48;
const GAP = 56;
const HOLD_MS = 1400;
const PIXELS_PER_SECOND = 40;
const BACKGROUND = Buffer.from([17, 18, 20, 255]);

export function scrollOffset(width: number, elapsedMs: number): number {
  if (width <= TITLE_WIDTH) return 0;
  const period = width + GAP;
  const cycleMs = HOLD_MS + period / PIXELS_PER_SECOND * 1000;
  const time = Math.max(0, elapsedMs) % cycleMs;
  return time <= HOLD_MS ? 0 : Math.floor((time - HOLD_MS) / 1000 * PIXELS_PER_SECOND);
}

export class Marquee {
  private image?: PNG;
  private source: string | null | undefined;
  private started = 0;
  private lastOffset = -1;
  private lastFrame = "assets/idle-title.png";

  frame(source: string | null, now: number): string {
    if (source !== this.source) {
      this.source = source;
      this.started = now;
      this.lastOffset = -1;
      this.lastFrame = "assets/idle-title.png";
      this.image = undefined;
      if (source?.startsWith("data:image/png;base64,")) {
        try {
          const buffer = Buffer.from(source.slice(22), "base64");
          // Bound the PNG dimensions before decoding, not after allocation.
          if (buffer.length >= 24 && buffer.readUInt32BE(16) <= 8192 && buffer.readUInt32BE(20) === TITLE_HEIGHT)
            this.image = PNG.sync.read(buffer);
        } catch { /* Retain the static fallback if a font raster is unavailable. */ }
      }
    }
    if (!this.image) return this.lastFrame;
    const offset = scrollOffset(this.image.width, now - this.started);
    if (offset === this.lastOffset) return this.lastFrame;
    this.lastOffset = offset;
    const frame = new PNG({ width: TITLE_WIDTH, height: TITLE_HEIGHT });
    frame.data.fill(BACKGROUND);
    for (let x = 0; x < TITLE_WIDTH; x++) {
      const sourceX = this.image.width <= TITLE_WIDTH ? x : (x + offset) % (this.image.width + GAP);
      if (sourceX >= this.image.width) continue;
      for (let y = 0; y < TITLE_HEIGHT; y++) {
        const from = (y * this.image.width + sourceX) * 4;
        this.image.data.copy(frame.data, (y * TITLE_WIDTH + x) * 4, from, from + 4);
      }
    }
    this.lastFrame = "data:image/png;base64," + PNG.sync.write(frame, { deflateLevel: 3 }).toString("base64");
    return this.lastFrame;
  }
}
