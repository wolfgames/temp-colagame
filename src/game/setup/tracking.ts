import { useAnalyticsService } from '@wolfgames/components/solid';
import type { AnalyticsService } from '@wolfgames/game-kit';
import {
  gameStartSchema,
  audioSettingChangedSchema,
  screenEnterSchema,
  screenExitSchema,
  errorCapturedSchema,
  // ClearPop custom schemas
  clearpopLevelStartSchema,
  clearpopLevelCompleteSchema,
  clearpopLevelFailSchema,
  clearpopGameEndSchema,
  clearpopMoveMadeSchema,
  clearpopPowerupGeneratedSchema,
  clearpopBoardBlockedSchema,
  clearpopCascadeChainCompletedSchema,
  clearpopInvalidTapSummarySchema,
  clearpopGamePauseSchema,
  clearpopGameResumeSchema,
  clearpopTutorialStepSchema,
  clearpopShareClickedSchema,
  clearpopShareCompletedSchema,
  clearpopHintUsedSchema,
  clearpopBoosterUsedSchema,
} from './events';

// ============================================================================
// GAME TRACKING HOOK
// ============================================================================
//
// All trackers automatically receive base params (game_name, game_slug,
// environment, session_elapsed) via the ['base'] param-set reference.
// PostHog auto-attaches distinct_id, $session_id, $browser, $os, etc.
//
// Framework-owned events (NOT registered here, fire automatically):
//   session_start / session_pause / session_resume / session_end
//   loading_start / loading_complete / loading_abandon
//   screen_enter / screen_exit (registered for manual fire too)
//   error_captured / audio_setting_changed

export interface GameTracking {
  // ── Lifecycle (framework-aligned) ──
  trackGameStart: (params: typeof gameStartSchema.infer) => void;
  trackAudioSettingChanged: (params: typeof audioSettingChangedSchema.infer) => void;
  trackScreenView: (params: typeof screenEnterSchema.infer) => void;
  trackScreenExit: (params: typeof screenExitSchema.infer) => void;
  trackError: (params: typeof errorCapturedSchema.infer) => void;

  // ── ClearPop level lifecycle ──
  trackLevelStart: (params: typeof clearpopLevelStartSchema.infer) => void;
  trackLevelComplete: (params: typeof clearpopLevelCompleteSchema.infer) => void;
  trackLevelFail: (params: typeof clearpopLevelFailSchema.infer) => void;
  trackGameEnd: (params: typeof clearpopGameEndSchema.infer) => void;

  // ── ClearPop gameplay ──
  trackMoveMade: (params: typeof clearpopMoveMadeSchema.infer) => void;
  trackPowerupGenerated: (params: typeof clearpopPowerupGeneratedSchema.infer) => void;
  trackBoardBlocked: (params: typeof clearpopBoardBlockedSchema.infer) => void;
  trackCascadeChainCompleted: (params: typeof clearpopCascadeChainCompletedSchema.infer) => void;
  trackInvalidTapSummary: (params: typeof clearpopInvalidTapSummarySchema.infer) => void;

  // ── ClearPop session/UX ──
  trackGamePause: (params: typeof clearpopGamePauseSchema.infer) => void;
  trackGameResume: (params: typeof clearpopGameResumeSchema.infer) => void;
  trackTutorialStep: (params: typeof clearpopTutorialStepSchema.infer) => void;
  trackShareClicked: (params: typeof clearpopShareClickedSchema.infer) => void;
  trackShareCompleted: (params: typeof clearpopShareCompletedSchema.infer) => void;
  trackHintUsed: (params: typeof clearpopHintUsedSchema.infer) => void;
  trackBoosterUsed: (params: typeof clearpopBoosterUsedSchema.infer) => void;

  service: AnalyticsService;
}

export function useGameTracking(): GameTracking {
  const service = useAnalyticsService();

  return {
    trackGameStart: service.createTracker('game_start', gameStartSchema, ['base'], {}),
    trackAudioSettingChanged: service.createTracker('audio_setting_changed', audioSettingChangedSchema, ['base'], {}),
    trackScreenView: service.createTracker('screen_enter', screenEnterSchema, ['base'], {}),
    trackScreenExit: service.createTracker('screen_exit', screenExitSchema, ['base'], {}),
    trackError: service.createTracker('error_captured', errorCapturedSchema, ['base'], {}),

    trackLevelStart: service.createTracker('level_start', clearpopLevelStartSchema, ['base'], {}),
    trackLevelComplete: service.createTracker('level_complete', clearpopLevelCompleteSchema, ['base'], {}),
    trackLevelFail: service.createTracker('level_fail', clearpopLevelFailSchema, ['base'], {}),
    trackGameEnd: service.createTracker('game_end', clearpopGameEndSchema, ['base'], {}),

    trackMoveMade: service.createTracker('move_made', clearpopMoveMadeSchema, ['base'], {}),
    trackPowerupGenerated: service.createTracker('powerup_generated', clearpopPowerupGeneratedSchema, ['base'], {}),
    trackBoardBlocked: service.createTracker('board_blocked', clearpopBoardBlockedSchema, ['base'], {}),
    trackCascadeChainCompleted: service.createTracker('cascade_chain_completed', clearpopCascadeChainCompletedSchema, ['base'], {}),
    trackInvalidTapSummary: service.createTracker('invalid_tap_summary', clearpopInvalidTapSummarySchema, ['base'], {}),

    trackGamePause: service.createTracker('game_pause', clearpopGamePauseSchema, ['base'], {}),
    trackGameResume: service.createTracker('game_resume', clearpopGameResumeSchema, ['base'], {}),
    trackTutorialStep: service.createTracker('tutorial_step', clearpopTutorialStepSchema, ['base'], {}),
    trackShareClicked: service.createTracker('share_clicked', clearpopShareClickedSchema, ['base'], {}),
    trackShareCompleted: service.createTracker('share_completed', clearpopShareCompletedSchema, ['base'], {}),
    trackHintUsed: service.createTracker('hint_used', clearpopHintUsedSchema, ['base'], {}),
    trackBoosterUsed: service.createTracker('booster_used', clearpopBoosterUsedSchema, ['base'], {}),

    service,
  };
}
