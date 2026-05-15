/**
 * Game Controller — DOM mode template
 *
 * Called by screens/GameScreen.tsx — the bridge between Solid.js and your game.
 *
 * This template uses DOM elements (gameMode: 'dom') so it works without
 * sprite assets. For a PixiJS game, set gameMode: 'pixi' and see the
 * commented example below.
 */

import { createSignal } from 'solid-js';
import type {
  GameControllerDeps,
  GameController,
  SetupGame,
} from '~/game/mygame-contract';

export const setupGame: SetupGame = (_deps: GameControllerDeps): GameController => {
  const [ariaText, setAriaText] = createSignal('Game loading...');
  let wrapper: HTMLDivElement | null = null;

  return {
    gameMode: 'dom',

    init(container: HTMLDivElement) {
      setAriaText('Gameplay Screen');

      wrapper = document.createElement('div');
      wrapper.style.cssText =
        'display:flex;align-items:center;justify-content:center;height:100%;';

      const label = document.createElement('h1');
      label.textContent = 'Gameplay Screen';
      label.style.cssText =
        'font-size:2.5rem;font-weight:700;color:#fff;margin:0;font-family:system-ui,sans-serif;';

      wrapper.append(label);
      container.append(wrapper);
    },

    destroy() {
      wrapper?.remove();
      wrapper = null;
    },

    ariaText,
  };
};

// ---------------------------------------------------------------------------
// Pixi mode template (uncomment and replace the DOM version above):
// ---------------------------------------------------------------------------
//
// import { Application, Graphics } from 'pixi.js';
//
// export const setupGame: SetupGame = (deps: GameControllerDeps): GameController => {
//   const [ariaText, setAriaText] = createSignal('Game loading...');
//   let app: Application | null = null;
//
//   return {
//     gameMode: 'pixi',
//
//     init(container: HTMLDivElement) {
//       setAriaText('Gameplay Screen');
//
//       app = new Application();
//       void app.init({
//         resizeTo: container,
//         background: '#1a1a2e',
//       }).then(() => {
//         container.appendChild(app!.canvas as HTMLCanvasElement);
//
//         // Example: draw a simple rectangle
//         const rect = new Graphics()
//           .rect(0, 0, 100, 100)
//           .fill(0x4a8c1c);
//         rect.position.set(
//           app!.screen.width / 2 - 50,
//           app!.screen.height / 2 - 50,
//         );
//         app!.stage.addChild(rect);
//
//         // Example: game loop via ticker
//         app!.ticker.add((ticker) => {
//           rect.rotation += 0.01 * ticker.deltaTime;
//         });
//       });
//     },
//
//     destroy() {
//       app?.destroy(true, { children: true });
//       app = null;
//     },
//
//     ariaText,
//   };
// };
