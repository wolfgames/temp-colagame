/**
 * Schema for scaffold evaluation run results.
 * Used for before/after comparison and reporting.
 */

export interface EvaluationTestResult {
  /** Playwright test title (suite + test name) */
  testName: string;
  /** Full title path for uniqueness */
  titlePath: string[];
  passed: boolean;
  durationMs: number;
  error?: string;
}

export interface EvaluationRunResult {
  runId: string;
  gameName: string;
  modificationId: string;
  modificationDescription: string;
  phase: 'before' | 'after';
  timestamp: string;
  durationMs: number;
  results: EvaluationTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

export interface EvaluationComparisonReport {
  gameName: string;
  modificationId: string;
  modificationDescription: string;
  beforeRunId: string;
  afterRunId: string;
  beforeTimestamp: string;
  afterTimestamp: string;
  /** Tests that failed before and pass after */
  fixed: EvaluationTestResult[];
  /** Tests that passed before and fail after */
  regressions: EvaluationTestResult[];
  /** Tests that were added (only in after) */
  added: EvaluationTestResult[];
  /** Tests that were removed (only in before) */
  removed: EvaluationTestResult[];
  /** Unchanged (same pass/fail in both) */
  unchanged: Array<{ testName: string; passed: boolean }>;
  summary: {
    before: { total: number; passed: number; failed: number };
    after: { total: number; passed: number; failed: number };
    fixedCount: number;
    regressionCount: number;
    addedCount: number;
    removedCount: number;
  };
}
