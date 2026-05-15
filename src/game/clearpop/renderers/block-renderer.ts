/**
 * Block Renderer — Object Pool of Block Sprites
 *
 * Uses the glossy block sprite texture, tinted per block color.
 * Manages a pool for recycling block visuals without per-frame allocation.
 */

import gsap from 'gsap';
import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { BlockColor } from '../state/types';
import { BLOCK_THEMES } from './block-theme';

export const BLOCK_IDLE_ALPHA = 1;

export interface BlockVisual {
  container: Container;
  body: Sprite | Graphics;
  highlight: Graphics;
  color: BlockColor;
  gridRow: number;
  gridCol: number;
  inUse: boolean;
}

export class BlockRenderer {
  private pool: BlockVisual[] = [];
  private tileSize = 0;
  private blockTextures = new Map<BlockColor, Texture>();
  private fallbackTexture: Texture | null = null;

  setTileSize(size: number): void {
    this.tileSize = size;
  }

  setBlockTextures(textures: Map<BlockColor, Texture>, fallback?: Texture): void {
    this.blockTextures = textures;
    this.fallbackTexture = fallback ?? null;
  }

  acquire(color: BlockColor, row: number, col: number, hasPowerUp = false): BlockVisual {
    let visual = this.pool.find((v) => !v.inUse);
    if (!visual) {
      visual = this.createVisual(color);
      this.pool.push(visual);
    }

    visual.inUse = true;
    visual.gridRow = row;
    visual.gridCol = col;
    visual.color = color;
    this.drawBlock(visual, color, hasPowerUp);
    return visual;
  }

  release(visual: BlockVisual): void {
    gsap.killTweensOf(visual.container);
    gsap.killTweensOf(visual.container.scale);
    visual.inUse = false;
    visual.container.visible = false;
  }

  releaseAll(): void {
    for (const v of this.pool) {
      gsap.killTweensOf(v.container);
      gsap.killTweensOf(v.container.scale);
      v.inUse = false;
      v.container.visible = false;
    }
  }

  destroy(): void {
    for (const v of this.pool) {
      v.container.destroy({ children: true });
    }
    this.pool.length = 0;
  }

  private createVisual(color: BlockColor): BlockVisual {
    const texture = this.blockTextures.get(color) ?? this.fallbackTexture ?? null;
    const container = new Container();
    const body = texture ? new Sprite(texture) : new Graphics();
    const highlight = new Graphics();

    container.addChild(body);
    container.addChild(highlight);

    return {
      container,
      body,
      highlight,
      color,
      gridRow: 0,
      gridCol: 0,
      inUse: false,
    };
  }

  private drawBlock(visual: BlockVisual, color: BlockColor, hasPowerUp: boolean): void {
    const body = visual.body;
    const s = this.tileSize;

    const blockScale = 1.15;
    const blockSize = s * blockScale;
    if (body instanceof Sprite) {
      const texture = this.blockTextures.get(color) ?? this.fallbackTexture;
      if (texture) body.texture = texture;
      body.width = blockSize;
      body.height = blockSize;
      body.anchor.set(0.5);
      body.x = s / 2;
      body.y = s / 2;
      body.tint = 0xffffff;
      body.blendMode = 'normal';
    }

    visual.highlight.clear();

    visual.container.alpha = BLOCK_IDLE_ALPHA;
    visual.container.scale.set(1);
    visual.container.visible = true;
  }
}
