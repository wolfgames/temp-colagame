/**
 * Build an audio sprite from individual MP3 files.
 *
 * 1. Trims leading/trailing silence and normalizes peak volume
 * 2. Concatenates cleaned MP3s into a single file
 * 3. Emits a Howler-compatible JSON manifest with sprite offsets
 *
 * Usage:  bun run scripts/build-audio-sprite.ts
 */

import { readdir, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const FFMPEG = join(import.meta.dir, '..', 'node_modules', 'ffmpeg-static', 'ffmpeg');
const SFX_DIR = join(import.meta.dir, '..', 'public', 'assets', 'sfx');
const TMP_DIR = join(import.meta.dir, '..', '.tmp-audio');
const OUT_MP3 = join(import.meta.dir, '..', 'public', 'assets', 'sfx-clearpop.mp3');
const OUT_JSON = join(import.meta.dir, '..', 'public', 'assets', 'sfx-clearpop.json');

function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (e: any) {
    const out = [e.stdout, e.stderr].filter(Boolean).map(String).join('\n');
    return out.trim();
  }
}

function getDurationMs(filePath: string): number {
  const output = run(`"${FFMPEG}" -i "${filePath}" -f null /dev/null 2>&1`);
  const timeMatches = output.match(/time=(\d+):(\d+):(\d+)\.(\d+)/g);
  if (timeMatches && timeMatches.length > 0) {
    const last = timeMatches[timeMatches.length - 1];
    const m = last.match(/time=(\d+):(\d+):(\d+)\.(\d+)/)!;
    return parseInt(m[1]) * 3600000 + parseInt(m[2]) * 60000 + parseInt(m[3]) * 1000 + parseInt(m[4]) * 10;
  }
  const info = run(`"${FFMPEG}" -i "${filePath}" 2>&1`);
  const durMatch = info.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
  if (durMatch) {
    return parseInt(durMatch[1]) * 3600000 + parseInt(durMatch[2]) * 60000 + parseInt(durMatch[3]) * 1000 + parseInt(durMatch[4]) * 10;
  }
  return 0;
}

/** Detect peak dB so we can normalize to -1 dBTP */
function getPeakDb(filePath: string): number {
  const output = run(
    `"${FFMPEG}" -i "${filePath}" -af "volumedetect" -f null /dev/null 2>&1`,
  );
  const match = output.match(/max_volume:\s*([-\d.]+)\s*dB/);
  return match ? parseFloat(match[1]) : 0;
}

function spriteNameFromFile(filename: string): string {
  return filename.replace('.mp3', '').replace(/-/g, '_');
}

async function main() {
  const files = (await readdir(SFX_DIR)).filter(f => f.endsWith('.mp3')).sort();
  console.log(`Found ${files.length} MP3 files in ${SFX_DIR}\n`);

  await rm(TMP_DIR, { recursive: true, force: true });
  await mkdir(TMP_DIR, { recursive: true });

  const cleanedFiles: string[] = [];
  for (const file of files) {
    const src = join(SFX_DIR, file);
    const dst = join(TMP_DIR, file);

    // Detect peak volume for normalization
    const peak = getPeakDb(src);
    const gain = Math.min(-1 - peak, 12); // normalize to -1 dBTP, cap boost at 12dB

    // Gentle silence trim (-50dB threshold, keep 10ms margin) + peak normalize + strip metadata
    run(
      `"${FFMPEG}" -y -i "${src}" ` +
      `-af "silenceremove=start_periods=1:start_silence=0.01:start_threshold=-50dB,` +
      `areverse,silenceremove=start_periods=1:start_silence=0.01:start_threshold=-50dB,areverse,` +
      `volume=${gain}dB" ` +
      `-ar 44100 -ab 128k -map_metadata -1 "${dst}" 2>&1`,
    );

    cleanedFiles.push(dst);
    const dur = getDurationMs(dst);
    const size = Bun.file(dst).size;
    console.log(`  ${file}: ${dur}ms (${size} bytes) peak=${peak}dB gain=${gain.toFixed(1)}dB`);
  }

  // Build concat list
  const listPath = join(TMP_DIR, 'concat.txt');
  await Bun.write(listPath, cleanedFiles.map(f => `file '${f}'`).join('\n'));

  // Concatenate
  run(`"${FFMPEG}" -y -f concat -safe 0 -i "${listPath}" -c copy -map_metadata -1 "${OUT_MP3}" 2>&1`);
  console.log(`\nCombined: ${OUT_MP3} (${Bun.file(OUT_MP3).size} bytes)`);

  // Build sprite manifest
  const sprite: Record<string, [number, number]> = {};
  let offsetMs = 0;

  for (const file of files) {
    const dur = getDurationMs(join(TMP_DIR, file));
    const name = spriteNameFromFile(file);
    sprite[name] = [offsetMs, dur];
    console.log(`  ${name}: ${offsetMs}ms + ${dur}ms`);
    offsetMs += dur;
  }

  await Bun.write(OUT_JSON, JSON.stringify(manifest(), null, 2));
  console.log(`\nWrote ${OUT_JSON} (total ~${offsetMs}ms)`);

  await rm(TMP_DIR, { recursive: true, force: true });

  function manifest() {
    return { urls: ['sfx-clearpop.mp3'], sprite };
  }
}

main().catch(console.error);
