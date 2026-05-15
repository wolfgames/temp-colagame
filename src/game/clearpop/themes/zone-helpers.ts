/**
 * Theme-agnostic helpers for zone/level math and content lookup.
 *
 * Pure functions operating on the Theme contract — no eigenpop-specific
 * imports. GameController and other engine modules call these instead of
 * importing helpers from a specific theme.
 */

import type { Theme, ZoneContent, ThemeDialogueStep, CompanionSpec } from '../contracts/theme';

export const LEVELS_PER_ZONE = 10;

export function getLevelZone(level: number): number {
  return Math.floor((level - 1) / LEVELS_PER_ZONE) + 1;
}

export function isZoneFirstLevel(level: number): boolean {
  return (level - 1) % LEVELS_PER_ZONE === 0;
}

export function isZoneLastLevel(level: number): boolean {
  return level > 0 && level % LEVELS_PER_ZONE === 0;
}

/** Look up zone content from the theme's zones array. Returns null if absent. */
export function findZoneContent(zones: readonly ZoneContent[], zone: number): ZoneContent | null {
  return zones.find((z) => z.zone === zone) ?? null;
}

/** Zone's intro dialogue sequence, or null if the zone has no content. */
export function getZoneIntro(zones: readonly ZoneContent[], zone: number): ThemeDialogueStep[] | null {
  return findZoneContent(zones, zone)?.introDialogue ?? null;
}

/**
 * Pick a quip line for the given level. Deterministic — uses level position
 * within the zone to index into the zone's quips array.
 */
export function getLevelQuip(theme: Theme, level: number): ThemeDialogueStep {
  const zone = getLevelZone(level);
  const zoneContent = findZoneContent(theme.zones, zone) ?? theme.zones[0];
  const positionInZone = (level - 1) % LEVELS_PER_ZONE;
  const quips = zoneContent?.quips ?? [theme.companion.name + ' is silent today.'];
  const idx = quips.length > 0
    ? ((positionInZone - 1 + quips.length) % quips.length)
    : 0;
  const message = quips[idx] ?? '';
  // Speaker key is fixed to 'nana' to match the existing UI dialogue
  // registration. When the theme contract grows a `companion.speakerKey`
  // field, switch this to read it.
  return {
    speaker: 'nana',
    image: theme.companion.spriteKeys.idle,
    message,
  };
}

/**
 * Build a UI-layer SpeakerConfig descriptor from the theme's companion.
 * Returns a plain object the UI module can adopt (matches the shape of
 * `ui/TalkingHeads`'s `SpeakerConfig` without importing it here).
 */
export function getCompanionSpeaker(companion: CompanionSpec): {
  name: string;
  image: string;
  side: 'left' | 'right';
} {
  return {
    name: companion.name.toUpperCase(),
    image: companion.spriteKeys.idle,
    side: 'left',
  };
}
