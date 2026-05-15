/**
 * Debug: Arrow-key level navigation with zone interstitial preview.
 *
 * → Right within zone:       next level, no interstitials
 * → Right crossing zone:     zone outro (completed) → zone intro (new) → start level
 * ← Left within zone:        prev level, no interstitials
 * ← Left crossing zone:      zone intro (re-entered) → start level
 *
 * Only active in dev mode.
 */

import type { ClearpopDatabase } from '../ClearpopPlugin';
import { getLevelZone, isZoneFirstLevel } from '../themes/zone-helpers';

const MIN_LEVEL = 1;
const MAX_LEVEL = 100;

export interface LevelNavDebugCallbacks {
  restartLevel: () => void;
  showZoneIntro?: (zone: number, onComplete: () => void) => void;
  showZoneOutro?: (zone: number, onComplete: () => void) => void;
}

export function attachLevelNavDebug(
  db: ClearpopDatabase,
  callbacks: LevelNavDebugCallbacks | (() => void),
): () => void {
  const { restartLevel, showZoneIntro, showZoneOutro } =
    typeof callbacks === 'function'
      ? { restartLevel: callbacks, showZoneIntro: undefined, showZoneOutro: undefined }
      : callbacks;

  // Locked only while a zone intro or outro interstitial is playing.
  // Normal level-start quips don't set this — arrows remain free during them.
  let interstitialLocked = false;

  function onKeyDown(e: KeyboardEvent): void {
    if (interstitialLocked) return;
    const current = db.resources.level;

    if (e.key === 'ArrowRight') {
      const next = Math.min(current + 1, MAX_LEVEL);
      if (next === current) return;
      db.transactions.setLevel(next);

      if (isZoneFirstLevel(next) && (showZoneOutro || showZoneIntro)) {
        // Crossing into a new zone: outro current zone → intro new zone → start level
        const completedZone = getLevelZone(current);
        const newZone       = getLevelZone(next);
        interstitialLocked = true;
        if (showZoneOutro) {
          showZoneOutro(completedZone, () => {
            if (showZoneIntro) {
              showZoneIntro(newZone, () => { interstitialLocked = false; restartLevel(); });
            } else {
              interstitialLocked = false;
              restartLevel();
            }
          });
        } else if (showZoneIntro) {
          showZoneIntro(newZone, () => { interstitialLocked = false; restartLevel(); });
        }
      } else {
        restartLevel();
      }

    } else if (e.key === 'ArrowLeft') {
      const prev = Math.max(current - 1, MIN_LEVEL);
      if (prev === current) return;
      db.transactions.setLevel(prev);

      if (isZoneFirstLevel(current) && showZoneIntro) {
        // Crossing back into previous zone: intro that zone → start level
        const reEnteredZone = getLevelZone(prev);
        interstitialLocked = true;
        showZoneIntro(reEnteredZone, () => { interstitialLocked = false; restartLevel(); });
      } else {
        restartLevel();
      }
    }
  }

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
