import { type } from "arktype";

// ============================================================================
// SESSION EVENTS (automatic — template fires these)
// ============================================================================

/**
 * Schema for session_start event.
 * Fires once on page load.
 */
export const sessionStartSchema = type({
  entry_screen: "string",
});

/**
 * Schema for session_pause event.
 * Fires when the browser tab is hidden.
 */
export const sessionPauseSchema = type({
  pause_reason: "'tab_hidden' | 'window_blur' | 'app_background'",
});

/**
 * Schema for session_resume event.
 * Fires when the tab becomes visible again.
 */
export const sessionResumeSchema = type({
  resume_reason: "'tab_visible' | 'window_focus' | 'app_foreground'",
  pause_duration: "number",
});

/**
 * Schema for session_end event.
 * Fires when the user leaves. Should include a snapshot of last-known game state.
 * Games should extend this with their own session-level context properties.
 */
export const sessionEndSchema = type({
  session_end_reason: "'user_close' | 'timeout' | 'navigation_away'",
});

/**
 * Creates an extended session_end schema with game-specific properties.
 * @param extraProperties - Additional arktype property definitions
 */
export function extendSessionEndSchema(
  extraProperties: Record<string, string>
): ReturnType<typeof type> {
  return type({
    session_end_reason: "'user_close' | 'timeout' | 'navigation_away'",
    ...extraProperties,
  });
}

// ============================================================================
// NAVIGATION EVENTS (automatic — template fires these)
// ============================================================================

/**
 * Schema for screen_enter event.
 * Fires when a screen becomes active.
 */
export const screenEnterSchema = type({
  screen_name: "string",
  "previous_screen?": "string",
});

/**
 * Schema for screen_exit event.
 * Fires when a screen is left.
 */
export const screenExitSchema = type({
  screen_name: "string",
  time_on_screen: "number",
});

// ============================================================================
// LOADING EVENTS (automatic — template fires these)
// ============================================================================

/**
 * Schema for loading_start event.
 * Fires when asset loading begins.
 */
export const loadingStartSchema = type({
  asset_count: "number",
});

/**
 * Schema for loading_complete event.
 * Fires when asset loading finishes.
 */
export const loadingCompleteSchema = type({
  asset_count: "number",
  load_duration: "number",
});

/**
 * Schema for loading_abandon event.
 * Fires if the user leaves during loading.
 */
export const loadingAbandonSchema = type({
  assets_loaded: "number",
  assets_total: "number",
  load_duration: "number",
});

// ============================================================================
// SYSTEM EVENTS (automatic — template fires these)
// ============================================================================

/**
 * Schema for error_captured event.
 * Fires automatically on errors.
 */
export const errorCapturedSchema = type({
  error_type: "string",
  user_id: "string",
  session_id: "string",
});

/**
 * Schema for audio_setting_changed event.
 * Fires when audio settings change.
 */
export const audioSettingChangedSchema = type({
  setting_type: "'volume' | 'mute'",
  old_value: "unknown",
  new_value: "unknown",
  screen_name: "string",
});

// ============================================================================
// GAMEPLAY LIFECYCLE EVENTS (AI agent wires these)
// ============================================================================

/**
 * Schema for game_start event.
 * Fires when the player starts playing.
 */
export const gameStartSchema = type({
  start_source: "string",
  is_returning_player: "boolean",
});

/**
 * Schema for level_start event.
 * Fires when a level becomes interactive.
 */
export const levelStartSchema = type({
  level_id: "string",
  "level_order?": "number",
  "is_replay?": "boolean",
});

/**
 * Schema for level_complete event.
 * Fires when a level is finished successfully.
 */
export const levelCompleteSchema = type({
  level_id: "string",
  "level_order?": "number",
  time_to_complete: "number",
  "score?": "number",
});

/**
 * Schema for level_fail event.
 * Fires when a level ends without completion.
 */
export const levelFailSchema = type({
  level_id: "string",
  "level_order?": "number",
  fail_reason: "string",
  time_played: "number",
});

/**
 * Schema for level_restart event.
 * Fires when a player restarts a level.
 */
export const levelRestartSchema = type({
  level_id: "string",
  "level_order?": "number",
  restart_count: "number",
});

/**
 * Schema for chapter_start event.
 * Fires when a new chapter or stage begins.
 */
export const chapterStartSchema = type({
  chapter_id: "string",
  "chapter_order?": "number",
});

/**
 * Schema for chapter_complete event.
 * Fires when all levels in a chapter are done.
 */
export const chapterCompleteSchema = type({
  chapter_id: "string",
  "chapter_order?": "number",
  levels_completed: "number",
  time_to_complete: "number",
});

// ============================================================================
// CLEARPOP CUSTOM EVENTS (game-specific — wired from GameController/screens)
// ============================================================================
//
// All events automatically receive base params (game_name, game_slug,
// environment, session_elapsed) plus PostHog auto-properties (distinct_id,
// $session_id, $browser, $os, etc). Don't redeclare them here.

/**
 * level_start (ClearPop) — extends framework levelStartSchema with
 * difficulty + retry context. Fires when a level becomes interactive.
 */
export const clearpopLevelStartSchema = type({
  level_id: "string",
  level_order: "number",
  level_difficulty: "'easy' | 'medium' | 'hard'",
  is_retry: "boolean",
  retry_count: "number",
});

/**
 * level_complete (ClearPop) — fires on a win. Replaces the spec's
 * `level_end` with `level_end_state: "win"`. Drops derivable totals.
 */
export const clearpopLevelCompleteSchema = type({
  level_id: "string",
  level_order: "number",
  level_difficulty: "'easy' | 'medium' | 'hard'",
  level_score: "number",
  level_duration: "number",
  stars_earned: "number",
  total_moves_made: "number",
});

/**
 * level_fail (ClearPop) — fires on a loss. `total_cells_cleared` is
 * derivable from move_made and intentionally excluded.
 */
export const clearpopLevelFailSchema = type({
  level_id: "string",
  level_order: "number",
  level_difficulty: "'easy' | 'medium' | 'hard'",
  fail_reason: "'moves_exhausted' | 'time_expired' | 'board_blocked'",
  level_duration: "number",
  total_moves_made: "number",
});

/**
 * game_end (ClearPop) — abnormal terminations only. Wins/losses are
 * already captured by level_complete / level_fail. Most rollup metrics
 * (levels_completed, total_score_earned, etc.) are derivable in HogQL
 * over the run's events and intentionally excluded.
 */
export const clearpopGameEndSchema = type({
  run_id: "string",
  game_end_state: "'exit' | 'abandoned' | 'error'",
  final_level_order: "number",
  run_duration: "number",
});

/**
 * move_made (ClearPop) — fires per successful tap. Highest-volume event;
 * keep slim. `current_score`, `win_progress`, `moves_remaining`,
 * `time_remaining` are derivable in HogQL and intentionally dropped.
 *
 * Combos are folded in as `move_type: "powerup_combo"` with `combo_pair`,
 * collapsing the spec's three-event flow.
 */
export const clearpopMoveMadeSchema = type({
  level_id: "string",
  move_order: "number",
  move_type: "'group_clear' | 'powerup_activation' | 'powerup_combo'",
  group_size: "number",
  score_earned: "number",
  response_time: "number",
  "cell_type?": "string",
  "powerup_type?": "'rocket' | 'bomb' | 'color_blast'",
  "combo_pair?": "string",
  "time_since_generated?": "number",
});

/**
 * powerup_generated — power-up cell created from a large clear.
 */
export const clearpopPowerupGeneratedSchema = type({
  level_id: "string",
  move_order: "number",
  powerup_type: "'rocket' | 'bomb' | 'color_blast'",
  trigger_group_size: "number",
});

/**
 * board_blocked — no valid moves remain after gravity/refill.
 * Followed immediately by level_fail with fail_reason: "board_blocked".
 */
export const clearpopBoardBlockedSchema = type({
  level_id: "string",
  move_order: "number",
});

/**
 * cascade_chain_completed — secondary clears triggered by gravity-driven
 * matches after the originating tap. Distinct from the originating tap's
 * group_size; cascade chain depth is the highest-engagement metric.
 */
export const clearpopCascadeChainCompletedSchema = type({
  level_id: "string",
  move_order: "number",
  chain_depth: "number",
  total_cells_cleared: "number",
  total_score_earned: "number",
});

/**
 * invalid_tap_summary — batched per level to avoid event volume.
 * Fires as part of level_complete/level_fail, NOT per invalid tap.
 */
export const clearpopInvalidTapSummarySchema = type({
  level_id: "string",
  count: "number",
  "last_response_time?": "number",
});

/**
 * game_pause / game_resume — explicit pause button (not tab-hidden).
 * Distinct from the framework's session_pause / session_resume.
 */
export const clearpopGamePauseSchema = type({
  level_id: "string",
  pause_source: "'pause_button' | 'menu' | 'settings'",
});

export const clearpopGameResumeSchema = type({
  level_id: "string",
  pause_duration: "number",
});

/**
 * tutorial_step — FTUE progression for drop-off analysis.
 */
export const clearpopTutorialStepSchema = type({
  step_id: "string",
  step_order: "number",
  outcome: "'completed' | 'skipped'",
});

/**
 * share_clicked / share_completed — Wolf-factor signal. Tracks share
 * intent and successful share separately for funnel analysis.
 */
export const clearpopShareClickedSchema = type({
  share_source: "'win_screen' | 'lose_screen' | 'pause_menu'",
  level_id: "string",
});

export const clearpopShareCompletedSchema = type({
  share_source: "'win_screen' | 'lose_screen' | 'pause_menu'",
  level_id: "string",
  share_target: "'native' | 'clipboard' | 'cancelled'",
});

/**
 * hint_used / booster_used — placeholder schemas wired now even if
 * unused. Cheap to surface in PostHog later.
 */
export const clearpopHintUsedSchema = type({
  level_id: "string",
  move_order: "number",
  hint_type: "string",
});

export const clearpopBoosterUsedSchema = type({
  level_id: "string",
  move_order: "number",
  booster_type: "string",
});
