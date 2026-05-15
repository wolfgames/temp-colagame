import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pixi.js', () => {
  class MockContainer {
    children: MockContainer[] = [];
    x = 0;
    y = 0;
    alpha = 1;
    eventMode = 'none';
    scale = { set: vi.fn(), x: 1, y: 1 };
    pivot = { y: 0 };
    height = 0;
    destroyed = false;
    addChild(c: MockContainer) { this.children.push(c); }
    removeChild(c: MockContainer) {
      const idx = this.children.indexOf(c);
      if (idx >= 0) this.children.splice(idx, 1);
    }
    removeChildren() { this.children.length = 0; }
    destroy() { this.destroyed = true; }
    toLocal(p: { x: number; y: number }) { return p; }
    on() {}
    off() {}
  }
  class MockGraphics extends MockContainer {
    clear() { return this; }
    roundRect() { return this; }
    rect() { return this; }
    circle() { return this; }
    ellipse() { return this; }
    moveTo() { return this; }
    lineTo() { return this; }
    closePath() { return this; }
    fill() { return this; }
    stroke() { return this; }
  }
  class MockSprite extends MockContainer {
    width = 0;
    height = 0;
    anchor = { set: vi.fn() };
    constructor(public texture?: unknown) { super(); }
  }
  return {
    Container: MockContainer,
    Graphics: MockGraphics,
    Sprite: MockSprite,
    FillGradient: class { addColorStop() { return this; } },
  };
});

vi.mock('gsap', () => ({
  default: {
    to: vi.fn(),
    fromTo: vi.fn(),
    killTweensOf: vi.fn(),
    delayedCall: vi.fn(),
    timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis(), onComplete: vi.fn() })),
  },
}));

vi.mock('~/core/config/viewport', () => ({
  calculateTileSize: () => 50,
  calculateMaxGridSize: () => ({ width: 500, height: 500 }),
}));

import { BoardRenderer } from '~/game/clearpop/renderers/board-renderer';
import type { BoardState, BoardCell, PowerUpType } from '~/game/clearpop/state/types';
import { setCellById } from '~/game/clearpop/state/board-state';
import { cellIdOf } from '~/game/clearpop/topologies/rect-orth-down';

function makeBoard(rows: number, cols: number): BoardState {
  const cellsById = new Map<string, BoardCell>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cellsById.set(cellIdOf(r, c), { kind: 'block', color: 'purple' as never });
    }
  }
  return { cellsById, rows, cols };
}

describe('BoardRenderer power-up sprite tracking', () => {
  let br: BoardRenderer;

  beforeEach(() => {
    br = new BoardRenderer(3);
    const board = makeBoard(8, 8);
    br.init(board, 500, 800);
    br.setTextures({
      obstacles: new Map(),
      powerups: new Map<PowerUpType, unknown>([
        ['rocket', { label: 'rocket-tex' }],
        ['bomb', { label: 'bomb-tex' }],
        ['color_burst', { label: 'burst-tex' }],
      ]) as never,
    });
  });

  it('addPowerupAt places a sprite retrievable by position', () => {
    br.addPowerupAt('rocket', 3, 4);
    const sprite = br.getPowerupSpriteAt(3, 4);
    expect(sprite).not.toBeNull();
  });

  it('getPowerupSpriteAt returns null for empty position', () => {
    expect(br.getPowerupSpriteAt(0, 0)).toBeNull();
  });

  it('removePowerupAt removes the sprite so it is no longer retrievable', () => {
    br.addPowerupAt('bomb', 2, 5);
    expect(br.getPowerupSpriteAt(2, 5)).not.toBeNull();
    br.removePowerupAt(2, 5);
    expect(br.getPowerupSpriteAt(2, 5)).toBeNull();
  });

  it('movePowerupSprite updates tracking from old to new position', () => {
    br.addPowerupAt('color_burst', 1, 3);
    br.movePowerupSprite(1, 3, 5, 3);
    expect(br.getPowerupSpriteAt(1, 3)).toBeNull();
    expect(br.getPowerupSpriteAt(5, 3)).not.toBeNull();
  });

  it('syncBoard clears manually-added power-up sprites', () => {
    br.addPowerupAt('rocket', 4, 4);
    expect(br.getPowerupSpriteAt(4, 4)).not.toBeNull();
    const board = makeBoard(8, 8);
    br.syncBoard(board);
    expect(br.getPowerupSpriteAt(4, 4)).toBeNull();
  });

  it('syncBoard registers powerup sprites in the position map', () => {
    const board = makeBoard(8, 8);
    setCellById(board, cellIdOf(2, 3), {
      kind: 'powerup',
      powerUpType: 'bomb',
      color: 'purple' as never,
    });
    br.syncBoard(board);
    expect(br.getPowerupSpriteAt(2, 3)).not.toBeNull();
  });

  it('removePowerupAt works for sprites placed by syncBoard', () => {
    const board = makeBoard(8, 8);
    setCellById(board, cellIdOf(1, 5), {
      kind: 'powerup',
      powerUpType: 'rocket',
      color: 'red',
    });
    br.syncBoard(board);
    expect(br.getPowerupSpriteAt(1, 5)).not.toBeNull();
    br.removePowerupAt(1, 5);
    expect(br.getPowerupSpriteAt(1, 5)).toBeNull();
  });

  it('detachPowerupSprite works for sprites placed by syncBoard', () => {
    const board = makeBoard(8, 8);
    setCellById(board, cellIdOf(4, 2), {
      kind: 'powerup',
      powerUpType: 'color_burst' as never,
      color: 'green' as never,
    });
    br.syncBoard(board);
    expect(br.getPowerupSpriteAt(4, 2)).not.toBeNull();
    const detached = br.detachPowerupSprite(4, 2);
    expect(detached).not.toBeNull();
    expect(br.getPowerupSpriteAt(4, 2)).toBeNull();
  });
});
