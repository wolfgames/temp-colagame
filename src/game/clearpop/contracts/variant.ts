/**
 * Variant Contract
 *
 * A Variant is one complete ClearPop game: a Topology (mechanic shape) plus
 * a Theme (presentation skin) plus the per-level Recipes (parameter fills).
 *
 * The translator skill emits a Variant. The runtime loads one and hands it
 * to GameController, which never imports theme files directly.
 */

import type { Topology } from './topology';
import type { Theme } from './theme';
import type { Recipe } from './recipe';

export interface Variant {
  /** Topology library id (e.g. 'rect-orth-down', 'hex-down', 'radial-in'). */
  topologyId: string;
  topology: Topology;
  theme: Theme;
  recipes: Recipe[];
}
