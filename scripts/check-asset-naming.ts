#!/usr/bin/env bun
/**
 * Validates asset filenames in public/assets/ against the naming convention.
 * See docs/guides/assets/naming-convention.md and naming-convention.schema.json.
 *
 * Usage:
 *   bun run scripts/check-asset-naming.ts           # validate, exit 1 if invalid
 *   bun run scripts/check-asset-naming.ts --suggest # print suggested renames
 */

import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ASSETS_DIR = join(import.meta.dir, "..", "public", "assets");

// Raw asset pattern: {category}-{name}[_{variant}].{ext}
const RAW_REGEX =
  /^(piece|exit|character|bg|item|prop|ui|vfx|sfx|music)-([a-z0-9]+(?:_[a-z0-9]+)*)(_[a-z0-9]+)?\.([a-zA-Z0-9]+)$/;
const RAW_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "svg",
  "wav",
  "mp3",
  "webm",
  "ogg",
  "woff",
  "woff2",
  "ttf",
  "otf",
]);

// Packed output patterns (basename only)
const PACKED_PATTERNS: RegExp[] = [
  /^atlas-[a-z0-9]+(-[a-z0-9]+)*\.json$/,
  /^atlas-[a-z0-9]+(-[a-z0-9]+)*\.(png|jpg|jpeg|webp|gif)$/,
  /^sfx-[a-z0-9]+(-[a-z0-9]+)*\.json$/,
  /^sfx-[a-z0-9]+(-[a-z0-9]+)*\.(mp3|webm|ogg|wav)$/,
  /^music-[a-z0-9]+(-[a-z0-9]+)*\.json$/,
  /^music-[a-z0-9]+(-[a-z0-9]+)*\.(mp3|webm|ogg)$/,
  /^vfx-[a-z0-9_-]+\.json$/,
];

// Subpath exceptions: under vfx/ allow simple-name files (e.g. effects/default.json, white-circle.png)
const VFX_SUBPATH_BASENAME = /^[a-z0-9_-]+\.(json|png|jpg|jpeg|webp|gif|svg)$/;
// Fonts in fonts/ subfolder (e.g. Baloo-Regular.woff2) - allow common font naming
const FONTS_BASENAME = /^[a-zA-Z0-9_-]+\.(woff2?|ttf|otf)$/;

function isPackedBasename(basename: string): boolean {
  return PACKED_PATTERNS.some((re) => re.test(basename));
}

function isRawBasename(basename: string): boolean {
  const m = basename.match(RAW_REGEX);
  if (!m) return false;
  const ext = m[4]!.toLowerCase();
  return RAW_EXTENSIONS.has(ext);
}

function suggestRawRename(basename: string): string {
  const lower = basename.toLowerCase();
  const lastDot = lower.lastIndexOf(".");
  const ext = lastDot >= 0 ? lower.slice(lastDot) : "";
  const namePart = lastDot >= 0 ? lower.slice(0, lastDot) : lower;
  // Replace spaces/special with underscore, collapse multiple underscores/hyphens
  const cleaned = namePart
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/-+/g, "-")
    .replace(/^_|_$/g, "");
  if (!/^[a-z]/.test(cleaned)) return `ui-${cleaned}${ext}`;
  if (!/-/.test(cleaned) && !/_/.test(cleaned)) return `ui-${cleaned}${ext}`;
  return cleaned + ext;
}

function collectFiles(dir: string, baseDir: string): { relPath: string; basename: string }[] {
  const out: { relPath: string; basename: string }[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith(".")) continue; // skip .gitkeep, .git, etc.
    const full = join(dir, e.name);
    const rel = relative(baseDir, full);
    if (e.isDirectory()) {
      out.push(...collectFiles(full, baseDir));
    } else {
      out.push({ relPath: rel, basename: e.name });
    }
  }
  return out;
}

function main(): void {
  const suggest = process.argv.includes("--suggest");
  if (!statSync(ASSETS_DIR, { throwIfNoEntry: false })?.isDirectory()) {
    console.error("Assets directory not found:", ASSETS_DIR);
    process.exit(1);
  }
  const files = collectFiles(ASSETS_DIR, ASSETS_DIR);
  const invalid: { relPath: string; basename: string; suggested?: string }[] = [];

  for (const { relPath, basename } of files) {
    if (isPackedBasename(basename)) continue;
    if (isRawBasename(basename)) continue;
    // vfx subpath (e.g. vfx/effects/default.json)
    if (relPath.startsWith("vfx/") && VFX_SUBPATH_BASENAME.test(basename)) continue;
    // fonts subfolder
    if (relPath.startsWith("fonts/") && FONTS_BASENAME.test(basename)) continue;
    invalid.push({
      relPath,
      basename,
      suggested: suggest ? suggestRawRename(basename) : undefined,
    });
  }

  if (invalid.length === 0) {
    console.log("check:assets — All asset filenames conform to the naming convention.");
    process.exit(0);
  }

  console.error("check:assets — Non-conforming filenames:\n");
  for (const { relPath, basename, suggested } of invalid) {
    console.error(`  ${relPath}`);
    if (suggested && suggested !== basename) console.error(`    → suggest: ${suggested}`);
  }
  console.error(
    "\nSee docs/guides/assets/naming-convention.md and docs/core/manifest-contract.md."
  );
  process.exit(1);
}

main();
