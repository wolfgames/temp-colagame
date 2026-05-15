import { describe, it, expect } from "vitest";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(__dirname, "../../..");
const SPRITES_ROOT = path.join(ROOT, "public/assets/sprites");

const MAGENTA_R_MIN = 200;
const MAGENTA_G_MAX = 60;
const MAGENTA_B_MIN = 200;

function isOpaqueMagenta(r: number, g: number, b: number, a: number): boolean {
  if (a < 250) return false;
  return r >= MAGENTA_R_MIN && g <= MAGENTA_G_MAX && b >= MAGENTA_B_MIN;
}

function collectSpritePngs(): string[] {
  const variants = readdirSync(SPRITES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const files: string[] = [];
  for (const variant of variants) {
    const dir = path.join(SPRITES_ROOT, variant);
    walk(dir, files);
  }
  return files;
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith(".png")) continue;
    if (entry.name.toLowerCase().startsWith("background")) continue;
    out.push(full);
  }
}

async function sampleEdges(file: string): Promise<{
  width: number;
  height: number;
  hasAlphaChannel: boolean;
  samples: Array<{ at: string; rgba: [number, number, number, number] }>;
}> {
  const img = sharp(file).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const hasAlphaChannel = channels === 4;

  const px = (x: number, y: number): [number, number, number, number] => {
    const i = (y * width + x) * channels;
    return [data[i], data[i + 1], data[i + 2], hasAlphaChannel ? data[i + 3] : 255];
  };

  // Sample 5 points along each edge — not just corners. Generated sprites with
  // rounded-rectangle masks have anti-aliased corner pixels that don't read as
  // pure magenta, but the midpoints of each edge expose the real fill color.
  const fractions = [0.1, 0.3, 0.5, 0.7, 0.9];
  const xs = fractions.map((f) => Math.floor(f * (width - 1)));
  const ys = fractions.map((f) => Math.floor(f * (height - 1)));

  const samples: Array<{ at: string; rgba: [number, number, number, number] }> = [];
  for (const x of xs) {
    samples.push({ at: `top@${x},0`, rgba: px(x, 0) });
    samples.push({ at: `bottom@${x},${height - 1}`, rgba: px(x, height - 1) });
  }
  for (const y of ys) {
    samples.push({ at: `left@0,${y}`, rgba: px(0, y) });
    samples.push({ at: `right@${width - 1},${y}`, rgba: px(width - 1, y) });
  }

  return { width, height, hasAlphaChannel, samples };
}

describe("Sprite background transparency", () => {
  const files = (() => {
    try {
      return statSync(SPRITES_ROOT).isDirectory() ? collectSpritePngs() : [];
    } catch {
      return [];
    }
  })();

  it("public/assets/sprites/ exists", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s has no opaque magenta along its edges", async (file) => {
    const { samples } = await sampleEdges(file);
    const offenders = samples.filter(({ rgba: [r, g, b, a] }) =>
      isOpaqueMagenta(r, g, b, a),
    );
    expect(
      offenders,
      `${path.relative(ROOT, file)} still has opaque magenta at ${offenders.length}/${samples.length} edge samples ` +
        `(${offenders.map((o) => o.at).join(", ")}) — ` +
        `re-run mcp__wolf-game-kit__chroma_key (or remove_background) before saving locally.`,
    ).toHaveLength(0);
  });
});
