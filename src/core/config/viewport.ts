/**
 * Viewport Constraints for Advance Games
 *
 * Based on:
 * - iPhone SE minimum width: 375px
 * - 10px side gaps for landing page/ad units
 * - 3:4 aspect ratio (standard camera photo ratio)
 */

import type { ViewportMode } from '../systems/tuning/types';

/** Parse viewport mode from URL params (?viewport=small, ?viewport=large, ?viewport=none) */
export function getViewportModeFromUrl(): ViewportMode | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('viewport');
  if (mode === 'small' || mode === 'large' || mode === 'none') {
    return mode;
  }
  return null;
}

/** Minimum supported viewport width in pixels */
export const VIEWPORT_MIN_WIDTH = 355;

/** Minimum supported viewport height in pixels (calculated from 3:4 ratio) */
export const VIEWPORT_MIN_HEIGHT = 473;

/** Target aspect ratio (width:height) */
export const ASPECT_RATIO = 3 / 4;

/** Safe padding from viewport edges */
export const SAFE_PADDING = 10;

/** Minimum touch target size per Apple HIG */
export const MIN_TOUCH_TARGET = 44;

/** Viewport constraints object for convenience */
export const VIEWPORT_CONSTRAINTS = {
  minWidth: VIEWPORT_MIN_WIDTH,
  minHeight: VIEWPORT_MIN_HEIGHT,
  aspectRatio: ASPECT_RATIO,
  safePadding: SAFE_PADDING,
  minTouchTarget: MIN_TOUCH_TARGET,
} as const;

/**
 * Calculate the maximum grid size that fits within the viewport
 * @param viewportWidth - Current viewport width
 * @param viewportHeight - Current viewport height
 * @param padding - Padding around the grid
 * @param reservedTop - Space reserved at top (HUD, progress bar)
 * @param reservedBottom - Space reserved at bottom (logo, controls)
 */
export function calculateMaxGridSize(
  viewportWidth: number,
  viewportHeight: number,
  padding: number = SAFE_PADDING,
  reservedTop: number = 80,
  reservedBottom: number = 100
): { width: number; height: number } {
  const availableWidth = viewportWidth - padding * 2;
  const availableHeight = viewportHeight - reservedTop - reservedBottom - padding * 2;

  return {
    width: Math.max(0, availableWidth),
    height: Math.max(0, availableHeight),
  };
}

/**
 * Calculate tile size to fit a grid within available space
 * @param gridSize - Number of tiles (e.g., 4 for 4x4 grid)
 * @param availableWidth - Available width for grid
 * @param availableHeight - Available height for grid
 * @param gap - Gap between tiles
 */
export function calculateTileSize(
  gridSize: number,
  availableWidth: number,
  availableHeight: number,
  gap: number = 0
): number {
  const totalGapWidth = gap * (gridSize - 1);
  const totalGapHeight = gap * (gridSize - 1);

  const maxTileWidth = (availableWidth - totalGapWidth) / gridSize;
  const maxTileHeight = (availableHeight - totalGapHeight) / gridSize;

  // Use the smaller dimension to ensure grid fits
  return Math.floor(Math.min(maxTileWidth, maxTileHeight));
}
