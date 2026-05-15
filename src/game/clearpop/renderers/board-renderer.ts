/**
 * Board Renderer
 *
 * Manages the visual grid: positions block visuals, handles resize,
 * and provides coordinate conversion between screen/grid space.
 */

import gsap from 'gsap';
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { calculateTileSize, calculateMaxGridSize } from '~/core/config/viewport';
import type { BoardState, GridPos, ObstacleType, PowerUpType, RocketDirection } from '../state/types';
import { OBSTACLE_MAX_HP } from '../state/types';
import { findAllGroups } from '../state/game-logic';
import { getCellById } from '../state/board-state';
import type { Topology, CellId } from '../contracts/topology';
import { createRectOrthDownTopology, cellIdOf, parseCellId } from '../topologies/rect-orth-down';
import { BlockRenderer, BLOCK_IDLE_ALPHA, type BlockVisual } from './block-renderer';
import type { SpriteTextures } from './sprite-assets';
import { getObstacleTextureKey, OBSTACLE_VISUAL_SCALE } from './sprite-assets';

/** Map 4-way rocket direction to sprite rotation (sprite default = pointing right). */
function rocketRotation(dir: RocketDirection): number {
  switch (dir) {
    case 'right': return 0;
    case 'left':  return Math.PI;
    case 'up':    return -Math.PI / 2;
    case 'down':  return Math.PI / 2;
  }
}

export interface BoardLayout {
  tileSize: number;
  boardWidth: number;
  boardHeight: number;
  offsetX: number;
  offsetY: number;
  gap: number;
}

export class BoardRenderer {
  readonly container = new Container();
  private background = new Graphics();
  private blockLayer = new Container();
  private obstacleLayer = new Container();
  private powerupLayer = new Container();
  private blockRenderer = new BlockRenderer();
  private blockVisualsById = new Map<CellId, BlockVisual | null>();
  private obstacleSprites: Container[] = [];
  private obstaclePositionMap = new Map<CellId, Container>();
  private obstacleContainerMap = new Map<CellId, Container>();
  private powerupSprites: Container[] = [];
  private powerupPositionMap = new Map<CellId, Container>();
  private textures: SpriteTextures | null = null;
  private validMask = new Map<CellId, boolean>();
  private topology: Topology | null = null;
  private layout: BoardLayout = {
    tileSize: 0,
    boardWidth: 0,
    boardHeight: 0,
    offsetX: 0,
    offsetY: 0,
    gap: 0,
  };

  constructor(private gap: number = 0) {
    this.layout.gap = gap;
    this.container.addChild(this.background);
    this.container.addChild(this.blockLayer);
    this.container.addChild(this.obstacleLayer);
    this.container.addChild(this.powerupLayer);
    this.blockLayer.eventMode = 'passive';
    this.obstacleLayer.eventMode = 'none';
    this.powerupLayer.eventMode = 'none';
  }

  setTextures(textures: SpriteTextures): void {
    this.textures = textures;
    const colorTextures = new Map<import('../state/types').BlockColor, import('pixi.js').Texture>();
    const blue   = textures.obstacles.get('base_block_blue');
    const red    = textures.obstacles.get('base_block_red');
    const yellow = textures.obstacles.get('base_block_yellow');
    if (blue)   colorTextures.set('blue',   blue);
    if (red)    colorTextures.set('red',    red);
    if (yellow) colorTextures.set('yellow', yellow);
    const fallback = textures.obstacles.get('base_block');
    this.blockRenderer.setBlockTextures(colorTextures, fallback ?? undefined);
  }

  init(
    board: BoardState,
    viewportWidth: number,
    viewportHeight: number,
    reservedTop: number = 140,
    reservedBottom: number = 80,
    topology?: Topology,
  ): void {
    // Build a rect topology fallback when none provided. For rect, tileSize
    // and gap have to flow back into the topology so layout helpers
    // (cellToScreen) report the same coordinates the renderer uses.
    const resolved = topology ?? createRectOrthDownTopology({
      cols: board.cols,
      rows: board.rows,
      tileSize: 0,  // initial — replaced after computeLayout
      gap: 0,
    });
    this.topology = resolved;
    this.computeLayout(resolved, board, viewportWidth, viewportHeight, reservedTop, reservedBottom);
    // For rect topologies we rebuild with the computed tileSize so the
    // topology's own cellToScreen matches the renderer's grid spacing.
    if (resolved.id === 'rect-orth-down' && !topology) {
      this.topology = createRectOrthDownTopology({
        cols: board.cols,
        rows: board.rows,
        tileSize: this.layout.tileSize,
        gap: this.layout.gap,
      });
    }
    this.blockRenderer.setTileSize(this.layout.tileSize);
    this.drawBackground(board.cols, board.rows);
    this.syncBoard(board);
  }

  /** The topology used for rendering positions. Set in init(). */
  getTopology(): Topology | null {
    return this.topology;
  }

  resize(
    board: BoardState,
    viewportWidth: number,
    viewportHeight: number,
    reservedTop: number = 140,
    reservedBottom: number = 80,
    topology?: Topology,
  ): void {
    this.blockRenderer.releaseAll();
    this.blockLayer.removeChildren();
    const resolved = topology ?? this.topology;
    if (!resolved) return;
    this.topology = resolved;
    this.computeLayout(resolved, board, viewportWidth, viewportHeight, reservedTop, reservedBottom);
    if (resolved.id === 'rect-orth-down') {
      this.topology = createRectOrthDownTopology({
        cols: board.cols,
        rows: board.rows,
        tileSize: this.layout.tileSize,
        gap: this.layout.gap,
      });
    }
    this.blockRenderer.setTileSize(this.layout.tileSize);
    this.drawBackground(board.cols, board.rows);
    this.syncBoard(board);
  }

  syncBoard(board: BoardState): void {
    this.blockRenderer.releaseAll();
    this.blockLayer.removeChildren();
    this.clearObstacleSprites();
    this.clearPowerupSprites();
    this.blockVisualsById.clear();

    const topology = this.topology;
    if (!topology) return;

    for (const id of topology.cells) {
      const cell = getCellById(board, id);
      if (!cell) { this.blockVisualsById.set(id, null); continue; }
      const { x, y } = this.cellToScreen(id);
      const { row, col } = parseCellId(id);

      if (cell.kind === 'block') {
        const visual = this.blockRenderer.acquire(cell.color, row, col);
        visual.container.x = x;
        visual.container.y = y;
        this.blockLayer.addChild(visual.container);
        this.blockVisualsById.set(id, visual);
      } else if (cell.kind === 'obstacle') {
        this.placeObstacleSprite(cell.obstacleType, cell.hp, x, y, row, col);
        this.blockVisualsById.set(id, null);
      } else if (cell.kind === 'powerup') {
        this.placePowerupSprite(cell.powerUpType, x, y, row, col, cell.rocketDirection);
        this.blockVisualsById.set(id, null);
      } else {
        this.blockVisualsById.set(id, null);
      }
    }
  }

  addObstacleAt(type: ObstacleType, hp: number, row: number, col: number): void {
    const { x, y } = this.gridToScreen(row, col);
    this.placeObstacleSprite(type, hp, x, y, row, col);
  }

  replaceObstacleAt(row: number, col: number, type: ObstacleType, hp: number): void {
    this.removeObstacleAt(row, col);
    this.addObstacleAt(type, hp, row, col);
  }

  removeObstacleAt(row: number, col: number): void {
    const key = cellIdOf(row, col);
    const old = this.obstacleContainerMap.get(key);
    if (old) {
      gsap.killTweensOf(old);
      old.parent?.removeChild(old);
      old.destroy({ children: true });
      this.obstacleContainerMap.delete(key);
      this.obstaclePositionMap.delete(key);
      const idx = this.obstacleSprites.indexOf(old);
      if (idx >= 0) this.obstacleSprites.splice(idx, 1);
    }
  }

  private placeObstacleSprite(type: ObstacleType, hp: number, x: number, y: number, row: number, col: number): void {
    const s = this.layout.tileSize;
    const scale = OBSTACLE_VISUAL_SCALE[type] ?? 1.0;
    const sized = s * scale;
    const offset = (s - sized) / 2;
    const key = cellIdOf(row, col);

    if (type === 'egg') {
      const wrapper = new Container();
      wrapper.x = x + offset;
      wrapper.y = y + offset;

      const nestTex = this.textures?.obstacles.get('egg_nest');
      if (nestTex) {
        const nest = new Sprite(nestTex);
        nest.width = sized;
        nest.height = sized;
        wrapper.addChild(nest);
      }

      const eggTexKey = getObstacleTextureKey(type, hp);
      const eggTex = this.textures?.obstacles.get(eggTexKey);
      let eggArt: Container;
      if (eggTex) {
        const eggSprite = new Sprite(eggTex);
        eggSprite.width = sized;
        eggSprite.height = sized;
        eggArt = eggSprite;
      } else {
        const g = new Graphics();
        g.roundRect(2, 2, s - 4, s - 4, (s - 4) * 0.18)
          .fill({ color: 0x888888, alpha: 0.7 });
        eggArt = g;
      }
      wrapper.addChild(eggArt);

      this.obstacleLayer.addChild(wrapper);
      this.obstacleSprites.push(wrapper);
      this.obstaclePositionMap.set(key, eggArt);
      this.obstacleContainerMap.set(key, wrapper);

      return;
    }

    const maxHp = OBSTACLE_MAX_HP[type];
    const texKey = getObstacleTextureKey(type, hp, maxHp);
    const texture = this.textures?.obstacles.get(texKey);
    let element: Container;

    if (texture) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.width = sized;
      sprite.height = sized;
      sprite.x = x + s / 2;
      sprite.y = y + s / 2;
      if (type === 'ice') sprite.alpha = 0.88;
      element = sprite;
    } else {
      const g = new Graphics();
      g.roundRect(2, 2, s - 4, s - 4, (s - 4) * 0.18)
        .fill({ color: 0x888888, alpha: 0.7 });
      g.pivot.set(s / 2, s / 2);
      g.x = x + s / 2;
      g.y = y + s / 2;
      element = g;
    }

    this.obstacleLayer.addChild(element);
    this.obstacleSprites.push(element);
    this.obstaclePositionMap.set(key, element);
    this.obstacleContainerMap.set(key, element);

  }

  private addHpLabel(parent: Container, hp: number, tileSize: number): void {
    const label = new Text({
      text: String(hp),
      style: {
        fontSize: Math.max(20, tileSize * 0.55),
        fill: 0xffffff,
        fontWeight: '900',
        stroke: { color: 0x000000, width: 4 },
        dropShadow: { alpha: 0.6, blur: 2, distance: 1, color: 0x000000 },
      },
    });
    label.anchor.set(0.5);
    label.x = 0;
    label.y = 0;
    parent.addChild(label);
  }

  moveObstacleSprite(fromRow: number, fromCol: number, toRow: number, toCol: number): Container | null {
    const key = cellIdOf(fromRow, fromCol);
    const art = this.obstaclePositionMap.get(key);
    const wrapper = this.obstacleContainerMap.get(key);
    if (!art && !wrapper) return null;

    this.obstaclePositionMap.delete(key);
    this.obstacleContainerMap.delete(key);
    const newKey = cellIdOf(toRow, toCol);
    if (art) this.obstaclePositionMap.set(newKey, art);
    if (wrapper) this.obstacleContainerMap.set(newKey, wrapper);

    return wrapper ?? art ?? null;
  }

  getObstacleSpriteAt(row: number, col: number): Container | null {
    return this.obstacleContainerMap.get(cellIdOf(row, col)) ?? this.obstaclePositionMap.get(cellIdOf(row, col)) ?? null;
  }

  private placePowerupSprite(type: PowerUpType, x: number, y: number, row: number, col: number, rocketDir?: RocketDirection): void {
    const s = this.layout.tileSize;
    const texture = this.textures?.powerups.get(type);
    const scale = type === 'bomb' ? 1.35 : type === 'rocket' ? 1.35 : 1;

    if (texture) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.width = s * scale;
      sprite.height = s * scale;
      sprite.x = x + s / 2;
      sprite.y = y + s / 2;
      if (type === 'rocket' && rocketDir) {
        sprite.rotation = rocketRotation(rocketDir);
      }
      this.powerupLayer.addChild(sprite);
      this.powerupSprites.push(sprite);
      this.powerupPositionMap.set(cellIdOf(row, col), sprite);
    }
  }

  private clearObstacleSprites(): void {
    for (const s of this.obstacleSprites) {
      gsap.killTweensOf(s);
      gsap.killTweensOf(s.scale);
      for (const child of s.children) {
        gsap.killTweensOf(child);
        gsap.killTweensOf(child.scale);
      }
      s.destroy({ children: true });
    }
    this.obstacleSprites.length = 0;
    this.obstaclePositionMap.clear();
    this.obstacleContainerMap.clear();
    this.obstacleLayer.removeChildren();
  }

  private clearPowerupSprites(): void {
    for (const s of this.powerupSprites) {
      gsap.killTweensOf(s);
      gsap.killTweensOf(s.scale);
      s.destroy();
    }
    this.powerupSprites.length = 0;
    this.powerupPositionMap.clear();
    this.powerupLayer.removeChildren();
  }

  addPowerupAt(type: PowerUpType, row: number, col: number, rocketDir?: RocketDirection): void {
    const { x, y } = this.gridToScreen(row, col);
    const s = this.layout.tileSize;
    const texture = this.textures?.powerups.get(type);
    if (!texture) return;

    const scale = type === 'bomb' ? 1.35 : type === 'rocket' ? 1.35 : 1;
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.width = s * scale;
    sprite.height = s * scale;
    const fitScaleX = sprite.scale.x;
    const fitScaleY = sprite.scale.y;
    sprite.x = x + s / 2;
    sprite.y = y + s / 2;
    if (type === 'rocket' && rocketDir) {
      sprite.rotation = rocketRotation(rocketDir);
    }
    sprite.alpha = 0;
    sprite.scale.set(0);
    this.powerupLayer.addChild(sprite);
    this.powerupSprites.push(sprite);
    this.powerupPositionMap.set(cellIdOf(row, col), sprite);

    gsap.to(sprite, { alpha: 1, duration: 0.15, ease: 'power2.out' });
    gsap.to(sprite.scale, { x: fitScaleX, y: fitScaleY, duration: 0.25, ease: 'back.out(2)' });
  }

  removePowerupAt(row: number, col: number): void {
    const key = cellIdOf(row, col);
    const sprite = this.powerupPositionMap.get(key);
    if (!sprite) return;

    this.powerupPositionMap.delete(key);
    const idx = this.powerupSprites.indexOf(sprite);
    if (idx >= 0) this.powerupSprites.splice(idx, 1);

    gsap.killTweensOf(sprite);
    gsap.killTweensOf(sprite.scale);
    sprite.parent?.removeChild(sprite);
    sprite.destroy();
  }

  /**
   * Detach a powerup sprite: removes it from tracking and the powerup layer
   * but does NOT destroy it. The caller takes ownership.
   */
  detachPowerupSprite(row: number, col: number): Container | null {
    const key = cellIdOf(row, col);
    const sprite = this.powerupPositionMap.get(key);
    if (!sprite) return null;

    this.powerupPositionMap.delete(key);
    const idx = this.powerupSprites.indexOf(sprite);
    if (idx >= 0) this.powerupSprites.splice(idx, 1);

    gsap.killTweensOf(sprite);
    gsap.killTweensOf(sprite.scale);
    sprite.parent?.removeChild(sprite);
    return sprite;
  }

  getPowerupSpriteAt(row: number, col: number): Container | null {
    return this.powerupPositionMap.get(cellIdOf(row, col)) ?? null;
  }

  getPowerupTexture(type: PowerUpType): import('pixi.js').Texture | null {
    return this.textures?.powerups.get(type) ?? null;
  }

  getObstacleAt(row: number, col: number): Container | null {
    return this.obstaclePositionMap.get(cellIdOf(row, col)) ?? null;
  }

  getObstacleContainerAt(row: number, col: number): Container | null {
    return this.obstacleContainerMap.get(cellIdOf(row, col)) ?? null;
  }

  swapObstacleTexture(row: number, col: number, textureKey: string): void {
    const sprite = this.obstaclePositionMap.get(cellIdOf(row, col));
    if (!sprite || !(sprite instanceof Sprite)) return;
    const tex = this.textures?.obstacles.get(textureKey);
    if (tex) (sprite as Sprite).texture = tex;
  }

  movePowerupSprite(fromRow: number, fromCol: number, toRow: number, toCol: number): void {
    const key = cellIdOf(fromRow, fromCol);
    const sprite = this.powerupPositionMap.get(key);
    if (!sprite) return;
    this.powerupPositionMap.delete(key);
    this.powerupPositionMap.set(cellIdOf(toRow, toCol), sprite);
  }

  getVisual(row: number, col: number): BlockVisual | null {
    return this.blockVisualsById.get(cellIdOf(row, col)) ?? null;
  }

  setVisual(row: number, col: number, visual: BlockVisual | null): void {
    const id = cellIdOf(row, col);
    if (!this.blockVisualsById.has(id)) return;
    this.blockVisualsById.set(id, visual);
  }

  addBlockVisual(visual: BlockVisual): void {
    this.blockLayer.addChild(visual.container);
  }

  getBlockRenderer(): BlockRenderer {
    return this.blockRenderer;
  }

  getLayout(): Readonly<BoardLayout> {
    return this.layout;
  }

  gridToScreen(row: number, col: number): { x: number; y: number } {
    return this.cellToScreen(cellIdOf(row, col));
  }

  /**
   * Topology-driven cell positioning. Returns the cell's TOP-LEFT corner
   * in the board container's local coordinate space (the board container
   * is itself translated by `layout.offsetX/offsetY`).
   *
   * The topology returns cell CENTERS; we subtract tileSize/2 to land on
   * top-left, matching the renderer's sprite anchor convention.
   */
  cellToScreen(id: CellId): { x: number; y: number } {
    const { tileSize, boardWidth, boardHeight, gap } = this.layout;
    if (!this.topology) {
      // Early-init fallback: pre-topology callers get rect math directly.
      const step = tileSize + gap;
      const { row, col } = parseCellId(id);
      return { x: col * step, y: row * step };
    }
    const center = this.topology.cellToScreen(id, {
      x: 0,
      y: 0,
      width: boardWidth,
      height: boardHeight,
    });
    const half = tileSize / 2;
    return { x: center.x - half, y: center.y - half };
  }

  /**
   * Resolve `topology.refillEntryPath(spawn, target, viewport)` against the
   * renderer's bound viewport so animators don't have to assemble the rect.
   * Returns the same Waypoint[] the topology declares — first entry is the
   * inbound start, last is the target cell centre.
   */
  refillEntryPath(spawnId: CellId, targetId: CellId): { x: number; y: number }[] {
    const topology = this.topology;
    if (!topology) return [];
    const { boardWidth, boardHeight } = this.layout;
    return topology.refillEntryPath(spawnId, targetId, {
      x: 0, y: 0, width: boardWidth, height: boardHeight,
    });
  }

  /**
   * Pick the topology cell whose centre is closest to (localX, localY) in the
   * board container's local space. Returns null if no cell is within the
   * board bounds. Works for any topology — rect, hex, radial.
   */
  screenToCellId(localX: number, localY: number): CellId | null {
    const topology = this.topology;
    if (!topology) return null;
    const { tileSize, boardWidth, boardHeight, gap } = this.layout;
    const half = tileSize / 2;
    let bestId: CellId | null = null;
    let bestDist = Infinity;
    for (const id of topology.cells) {
      const c = topology.cellToScreen(id, { x: 0, y: 0, width: boardWidth, height: boardHeight });
      const dx = c.x - localX;
      const dy = c.y - localY;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist) {
        bestDist = d2;
        bestId = id;
      }
    }
    // Reject taps that land further than one tile from the nearest cell —
    // keeps the gutter around the board un-tappable.
    if (bestDist > (half + gap) ** 2) return null;
    return bestId;
  }

  /** Legacy rect-only helper: returns (row, col) parsed from the nearest cell id. */
  screenToGrid(localX: number, localY: number): GridPos | null {
    const id = this.screenToCellId(localX, localY);
    return id ? parseCellId(id) : null;
  }

  /**
   * Highlight valid groups with a subtle breathing scale pulse.
   * Only touches cells whose valid state changed to avoid redundant tweens.
   * Matches reference GridLayer `highlightGroups`.
   */
  highlightGroups(board: BoardState, minGroupSize: number, topology?: Topology): void {
    const groups = findAllGroups(board, minGroupSize, topology);
    const newMask = new Map<CellId, boolean>();
    for (const group of groups) {
      for (const pos of group) {
        newMask.set(cellIdOf(pos.row, pos.col), true);
      }
    }

    for (const id of this.blockVisualsById.keys()) {
      const wasValid = this.validMask.get(id) ?? false;
      const isValid = newMask.get(id) ?? false;
      if (wasValid === isValid) continue;

      const visual = this.blockVisualsById.get(id);
      if (!visual) continue;

      if (!isValid) {
        gsap.killTweensOf(visual.container.scale);
        visual.container.scale.set(1);
      }
    }

    this.validMask = newMask;
  }

  /**
   * Kill all breathing highlight tweens. Called before pop animations.
   */
  clearHighlights(): void {
    for (const [id, valid] of this.validMask) {
      if (!valid) continue;
      const visual = this.blockVisualsById.get(id);
      if (visual) {
        gsap.killTweensOf(visual.container.scale);
        visual.container.scale.set(1);
      }
    }
    this.validMask.clear();
  }

  /**
   * Board entry: all cells drop in from above with row/col stagger.
   * Matches reference GridLayer `animateBoardEntry`.
   */
  animateBoardEntry(rows: number, cols: number): void {
    const step = this.layout.tileSize + this.layout.gap;
    void rows; void cols; // signature kept for back-compat; iteration uses topology

    for (const [id, visual] of this.blockVisualsById) {
      if (!visual) continue;
      const { row, col } = parseCellId(id);

      const targetY = visual.container.y;
      const delay = row * 0.03 + col * 0.015;

      visual.container.alpha = 0;
      gsap.fromTo(
        visual.container,
        { y: targetY - step * 3, alpha: 0 },
        { y: targetY, alpha: BLOCK_IDLE_ALPHA, duration: 0.4, delay, ease: 'back.out(1.2)' },
      );
    }
  }

  /**
   * Shuffle: fade all out, re-render, staggered drop+scale in.
   * Matches reference GridLayer `animateShuffle`.
   */
  async animateShuffle(board: BoardState): Promise<void> {
    await new Promise<void>((resolve) => {
      gsap.to(this.blockLayer, {
        alpha: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: resolve,
      });
    });

    this.syncBoard(board);
    this.blockLayer.alpha = 1;

    const promises: Promise<void>[] = [];
    let i = 0;
    for (const visual of this.blockVisualsById.values()) {
      if (!visual) { i++; continue; }

      const delay = i * 0.008 + Math.random() * 0.05;
      i++;
      visual.container.alpha = 0;
      visual.container.scale.set(0.5);

      promises.push(
        new Promise<void>((resolve) => {
          gsap.to(visual.container, {
            alpha: BLOCK_IDLE_ALPHA,
            duration: 0.25,
            delay,
            ease: 'power2.out',
          });
          gsap.to(visual.container.scale, {
            x: 1,
            y: 1,
            duration: 0.3,
            delay,
            ease: 'back.out(1.5)',
            onComplete: resolve,
          });
        }),
      );
    }

    if (promises.length > 0) await Promise.all(promises);
  }

  destroy(): void {
    this.blockRenderer.destroy();
    this.container.destroy({ children: true });
  }

  private computeLayout(
    topology: Topology,
    board: BoardState,
    vpW: number,
    vpH: number,
    reservedTop: number,
    reservedBottom: number,
  ): void {
    const { width: availW, height: availH } = calculateMaxGridSize(
      vpW,
      vpH,
      10,
      reservedTop,
      reservedBottom,
    );

    // For rect, preserve the existing tileSize calc — it ships eigenpop
    // 1:1 and the legacy helpers know its quirks (10-tile minimum, etc.).
    if (topology.id === 'rect-orth-down') {
      const cols = Math.max(1, board.cols);
      const rows = Math.max(1, board.rows);
      const tileSize = calculateTileSize(
        Math.max(cols, rows),
        availW,
        availH,
        this.gap,
      );
      const boardWidth = cols * tileSize + (cols - 1) * this.gap;
      const boardHeight = rows * tileSize + (rows - 1) * this.gap;
      this.layout = {
        tileSize,
        boardWidth,
        boardHeight,
        offsetX: Math.floor((vpW - boardWidth) / 2),
        offsetY: reservedTop + Math.floor((availH - boardHeight) / 2),
        gap: this.gap,
      };
      this.container.x = this.layout.offsetX;
      this.container.y = this.layout.offsetY;
      return;
    }

    // Non-rect topology: the topology's `cellToScreen` fits the cells into
    // whatever viewport we hand it. We pin that viewport to the available
    // box and use the same {width:boardWidth, height:boardHeight} every
    // time we ask the topology where a cell lives, so renderer ↔ plugin ↔
    // animator all agree. tileSize is derived from the smallest centre-to-
    // neighbour distance so square sprites tile without overlap.
    const boardWidth = Math.max(1, availW);
    const boardHeight = Math.max(1, availH);
    const probe = { x: 0, y: 0, width: boardWidth, height: boardHeight };
    let minStep = Infinity;
    for (const id of topology.cells) {
      const p = topology.cellToScreen(id, probe);
      for (const nId of topology.neighbors(id)) {
        const n = topology.cellToScreen(nId, probe);
        const d = Math.hypot(p.x - n.x, p.y - n.y);
        if (d > 0 && d < minStep) minStep = d;
      }
    }
    if (!isFinite(minStep) || minStep <= 0) minStep = Math.min(boardWidth, boardHeight) / 8;
    const tileSize = Math.max(8, Math.floor(minStep));

    this.layout = {
      tileSize,
      boardWidth,
      boardHeight,
      offsetX: Math.floor((vpW - boardWidth) / 2),
      offsetY: reservedTop + Math.floor((availH - boardHeight) / 2),
      gap: this.gap,
    };

    this.container.x = this.layout.offsetX;
    this.container.y = this.layout.offsetY;
  }

  private drawBackground(cols: number, rows: number): void {
    const { boardWidth, boardHeight } = this.layout;
    const pad = 8;
    this.background.clear();
    this.background
      .roundRect(-pad, -pad, boardWidth + pad * 2, boardHeight + pad * 2, 16)
      .fill({ color: 0x3d2b1f, alpha: 0.55 });
  }
}
