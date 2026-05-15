/**
 * Variant Registry
 *
 * Wires Topology + Theme + Recipes into a single Variant per game. This
 * template repo holds exactly one game; `getActiveVariant()` returns it.
 * `bun run dev` boots that game with no env vars or prefixes — that is the
 * single-game contract every scaffolded repo must keep.
 *
 * `VITE_VARIANT` exists only as a dev escape hatch for engine self-tests
 * that exercise non-rect topologies:
 *
 *   VITE_VARIANT=hex-test       (hex-down + devtest theme)
 *   VITE_VARIANT=radial-test    (radial-in + devtest theme)
 *
 * In this template the active game is the `eigenpop` reference theme. The
 * `morph-clearpop` skill rewrites the active-game slot below when it morphs
 * a scaffolded repo into a new themed variant.
 */

import type { Variant } from '../contracts/variant';
import { createRectOrthDownTopology } from '../topologies/rect-orth-down';
import { createHexDownTopology } from '../topologies/hex-down';
import { createRadialInTopology } from '../topologies/radial-in';
import { eigenpopTheme } from '../themes/eigenpop';
import { devtestTheme } from '../themes/_devtest';

export type VariantId = 'eigenpop' | 'hex-test' | 'radial-test';

export function createEigenpopVariant(): Variant {
  return {
    topologyId: 'rect-orth-down',
    topology: createRectOrthDownTopology({ cols: 8, rows: 8 }),
    theme: eigenpopTheme,
    recipes: [],
  };
}

export function createHexTestVariant(): Variant {
  return {
    topologyId: 'hex-down',
    topology: createHexDownTopology({ radius: 4 }),
    theme: devtestTheme,
    recipes: [],
  };
}

export function createRadialTestVariant(): Variant {
  return {
    topologyId: 'radial-in',
    topology: createRadialInTopology(),
    theme: devtestTheme,
    recipes: [],
  };
}

/**
 * Resolve the active variant. `VITE_VARIANT` is only consulted for engine
 * self-tests; production `bun run dev` runs with no env var set and lands
 * on the `default` branch below.
 */
export function getActiveVariant(): Variant {
  const id = (import.meta.env.VITE_VARIANT ?? 'eigenpop') as VariantId;
  switch (id) {
    case 'hex-test':    return createHexTestVariant();
    case 'radial-test': return createRadialTestVariant();
    // Active-game slot — the variant `bun run dev` boots when no env var is
    // set. `morph-clearpop` rewrites this branch (and the matching VariantId
    // / factory above) when it morphs the template into a new game.
    case 'eigenpop':
    default:            return createEigenpopVariant();
  }
}
