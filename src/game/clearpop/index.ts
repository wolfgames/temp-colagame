/**
 * ClearPop — Game Entry Point
 *
 * Exports setupGame and setupStartScreen per the mygame contract.
 */

import type { SetupGame } from '~/game/mygame-contract';
import { createGameController } from './GameController';
import { getActiveVariant } from './variants';

export const setupGame: SetupGame = (deps) => createGameController(deps, getActiveVariant());

export { setupStartScreen } from '~/game/mygame/screens/startView';
