/**
 * Level Completion Controller - Simplified state machine for level completion.
 * 
 * Orchestrates the completion flow:
 * 1. Detect completion (all landmarks connected)
 * 2. Block input
 * 3. Trigger audio/VFX
 * 4. Show clue for 3 seconds
 * 5. Show continue button
 * 6. Reset level on continue
 */

/** Controller states */
export type CompletionState = 
  | 'playing'       // Normal gameplay
  | 'completing'    // Completion sequence in progress (input blocked)
  | 'complete';     // Sequence finished, ready to continue

/** Events emitted by the controller */
export interface CompletionEvents {
  /** Fires when completion sequence starts (show overlay or popup) */
  onCompletionStart: (clue: string, levelNumber: number) => void;
  
  /** Fires after clue timer expires (show continue button) */
  onClueTimerEnd: () => void;
  
  /** Fires when continue is clicked (ready to reset) */
  onCompletionEnd: () => void;
  
  /** Fires exactly once per level completion (for analytics, etc) */
  onLevelComplete: (payload: { levelId: number; moves: number; durationMs: number }) => void;
}

/** Controller configuration */
export interface LevelCompletionControllerConfig {
  events: CompletionEvents;
  celebrationDuration?: number;
  clueDuration?: number;
  /** Optional sound callback — keeps audio concerns out of shared layer */
  onPlaySound?: () => void;
}

/**
 * Level Completion Controller.
 * Minimal state machine with native setTimeout.
 */
export interface LevelCompletionController {
  /** Current state */
  readonly state: CompletionState;
  
  /** Whether input should be blocked */
  readonly isInputBlocked: boolean;
  
  /** Whether continue button should be shown */
  readonly canContinue: boolean;
  
  /**
   * Start the completion sequence.
   * Called exactly once when level is solved.
   */
  startCompletion(levelId: number, moves: number, durationMs: number, clue: string): void;
  
  /**
   * Handle continue action (called by UI when button clicked).
   */
  continue(): void;
  
  /**
   * Reset controller to initial state.
   */
  reset(): void;
  
  /**
   * Clean up resources (cancel timers).
   */
  destroy(): void;
}

/**
 * Play level completion sound effect with Web Audio API.
 * Exported so game-specific layers can pass it as onPlaySound callback.
 */
export function playLevelCompleteSound(): void {
  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Three-tone ascending chime (C5 → E5 → G5)
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch {
    // Web Audio API not available - fail silently
  }
}

/**
 * Create a level completion controller.
 */
export function createLevelCompletionController(
  config: LevelCompletionControllerConfig
): LevelCompletionController {
  const { events } = config;
  const celebrationDuration = config.celebrationDuration ?? 500;
  const clueDuration = config.clueDuration ?? 3000;
  
  // State
  let state: CompletionState = 'playing';
  let canContinue = false;
  let hasEmittedLevelComplete = false;
  
  // Active timer
  let timerId: number | null = null;
  
  /**
   * Clear active timer.
   */
  const clearTimer = (): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };
  
  /**
   * Start the completion sequence.
   */
  const startCompletion = (levelId: number, moves: number, durationMs: number, clue: string): void => {
    // Prevent double-trigger
    if (state !== 'playing') {
      return;
    }

    // Transition to completing state
    state = 'completing';
    canContinue = false;

    // Emit level complete event (exactly once)
    if (!hasEmittedLevelComplete) {
      hasEmittedLevelComplete = true;
      events.onLevelComplete({ levelId, moves, durationMs });
    }

    // Trigger audio (delegated to caller via callback)
    config.onPlaySound?.();

    // Delay before showing companion (let tile rotation finish)
    timerId = window.setTimeout(() => {
      timerId = null;

      // Notify UI to show overlay or popup (pass levelId so UI can determine chapter end)
      events.onCompletionStart(clue, levelId);

      // Schedule clue timer
      timerId = window.setTimeout(() => {
        timerId = null;
        canContinue = true;
        events.onClueTimerEnd();
      }, clueDuration);
    }, celebrationDuration);
  };
  
  /**
   * Handle continue action.
   */
  const continueAction = (): void => {
    // Can only continue from completing state after timer expires
    if (state !== 'completing' || !canContinue) {
      return;
    }
    
    // Clear any remaining timers
    clearTimer();
    
    // Transition to complete state
    state = 'complete';
    canContinue = false;
    
    // Notify listeners
    events.onCompletionEnd();
  };
  
  /**
   * Reset controller for next level.
   */
  const reset = (): void => {
    clearTimer();
    state = 'playing';
    canContinue = false;
    hasEmittedLevelComplete = false;
  };
  
  /**
   * Clean up resources.
   */
  const destroy = (): void => {
    clearTimer();
    state = 'playing';
    canContinue = false;
    hasEmittedLevelComplete = false;
  };
  
  // Return controller interface
  return {
    get state() {
      return state;
    },
    
    get isInputBlocked() {
      return state === 'completing';
    },
    
    get canContinue() {
      return canContinue;
    },
    
    startCompletion,
    continue: continueAction,
    reset,
    destroy,
  };
}
