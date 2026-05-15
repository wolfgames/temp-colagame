/**
 * Pass 2: Convert mask 'bubble' cells to marshmallow obstacles,
 * 'gem' cells to empty (filled later by color-gems pass).
 */

import type { LevelGenContext } from '../types';
import { OBSTACLE_MAX_HP } from '../../types';
import { setCellById } from '../../board-state';
import { cellIdOf } from '../../../topologies/rect-orth-down';

export function placeBubblesPass(ctx: LevelGenContext): LevelGenContext | null {
  const { mask, board, config } = ctx;
  if (!mask) return null;

  const bubblesAllowed = config.obstacleTypes.includes('marshmallow');

  for (let r = 0; r < config.rows; r++) {
    for (let c = 0; c < config.cols; c++) {
      if (mask[r]![c] === 'bubble' && bubblesAllowed) {
        setCellById(board, cellIdOf(r, c), {
          kind: 'obstacle',
          obstacleType: 'marshmallow',
          hp: OBSTACLE_MAX_HP.marshmallow,
        });
      } else {
        setCellById(board, cellIdOf(r, c), { kind: 'empty' });
      }
    }
  }

  return ctx;
}
