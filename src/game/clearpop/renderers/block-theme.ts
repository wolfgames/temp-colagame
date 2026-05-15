/**
 * Block Color Theme
 *
 * Lighter / base / darker triplets for each BlockColor,
 * used to build Toy-Blast-style gradient fills.
 */

import type { BlockColor } from '../state/types';

export interface ColorTheme {
  lighter: number;
  base: number;
  darker: number;
}

export const BLOCK_THEMES: Record<BlockColor, ColorTheme> = {
  blue:   { lighter: 0x9b7ed8, base: 0x7c5cbf, darker: 0x5e3fa3 },
  red:    { lighter: 0xf04840, base: 0xd83830, darker: 0xb82820 },
  yellow: { lighter: 0xffa040, base: 0xf08020, darker: 0xd06810 },
};

export const BUBBLE_THEME: ColorTheme = {
  lighter: 0x8ecae6,
  base: 0x4da6d6,
  darker: 0x2874a0,
};
