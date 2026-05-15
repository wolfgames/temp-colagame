#!/usr/bin/env bun
/**
 * Compare before/after evaluation runs and produce a report.
 * Usage: bun run evaluation/compare.ts -- [--game <gameName>] [--modification <id>] [--before <path>] [--after <path>]
 *
 * If --game and --modification are given, reads evaluation-results/<game>/<modification>/before.json and after.json.
 * Otherwise --before and --after must be explicit file paths.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type {
  EvaluationComparisonReport,
  EvaluationRunResult,
  EvaluationTestResult,
} from './types.js';

const ROOT = join(import.meta.dirname, '..');
const RESULTS_DIR = join(ROOT, 'evaluation-results');

function parseArgs(): {
  gameName?: string;
  modificationId?: string;
  beforePath?: string;
  afterPath?: string;
  output?: string;
} {
  const args = process.argv.slice(2);
  let gameName: string | undefined;
  let modificationId: string | undefined;
  let beforePath: string | undefined;
  let afterPath: string | undefined;
  let output: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--game' && args[i + 1]) gameName = args[++i];
    else if (args[i] === '--modification' && args[i + 1]) modificationId = args[++i];
    else if (args[i] === '--before' && args[i + 1]) beforePath = args[++i];
    else if (args[i] === '--after' && args[i + 1]) afterPath = args[++i];
    else if (args[i] === '--output' && args[i + 1]) output = args[++i];
  }

  if (gameName && modificationId && !beforePath && !afterPath) {
    beforePath = join(RESULTS_DIR, gameName, modificationId, 'before.json');
    afterPath = join(RESULTS_DIR, gameName, modificationId, 'after.json');
  }

  return { gameName, modificationId, beforePath, afterPath, output };
}

function byTestName(a: EvaluationTestResult, b: EvaluationTestResult): number {
  return (a.testName ?? '').localeCompare(b.testName ?? '');
}

function compare(
  before: EvaluationRunResult,
  after: EvaluationRunResult
): EvaluationComparisonReport {
  const beforeMap = new Map(before.results.map((r) => [r.testName, r]));
  const afterMap = new Map(after.results.map((r) => [r.testName, r]));
  const allNames = new Set([...beforeMap.keys(), ...afterMap.keys()]);

  const fixed: EvaluationTestResult[] = [];
  const regressions: EvaluationTestResult[] = [];
  const added: EvaluationTestResult[] = [];
  const removed: EvaluationTestResult[] = [];
  const unchanged: Array<{ testName: string; passed: boolean }> = [];

  for (const name of allNames) {
    const b = beforeMap.get(name);
    const a = afterMap.get(name);
    if (!b && a) {
      added.push(a);
    } else if (b && !a) {
      removed.push(b);
    } else if (b && a) {
      if (!b.passed && a.passed) fixed.push(a);
      else if (b.passed && !a.passed) regressions.push(a);
      else unchanged.push({ testName: name, passed: a.passed });
    }
  }

  return {
    gameName: after.gameName,
    modificationId: after.modificationId,
    modificationDescription: after.modificationDescription,
    beforeRunId: before.runId,
    afterRunId: after.runId,
    beforeTimestamp: before.timestamp,
    afterTimestamp: after.timestamp,
    fixed: fixed.sort(byTestName),
    regressions: regressions.sort(byTestName),
    added: added.sort(byTestName),
    removed: removed.sort(byTestName),
    unchanged,
    summary: {
      before: before.summary,
      after: after.summary,
      fixedCount: fixed.length,
      regressionCount: regressions.length,
      addedCount: added.length,
      removedCount: removed.length,
    },
  };
}

function formatReport(report: EvaluationComparisonReport): string {
  const s = report.summary;
  const lines: string[] = [
    `# Scaffold evaluation report`,
    '',
    `- **Game:** ${report.gameName}`,
    `- **Modification:** ${report.modificationId}`,
    `- **Description:** ${report.modificationDescription}`,
    `- **Before:** ${report.beforeTimestamp} (${report.beforeRunId})`,
    `- **After:** ${report.afterTimestamp} (${report.afterRunId})`,
    '',
    '## Summary',
    '',
    '| | Before | After |',
    '|---|--------|-------|',
    `| Total | ${s.before.total} | ${s.after.total} |`,
    `| Passed | ${s.before.passed} | ${s.after.passed} |`,
    `| Failed | ${s.before.failed} | ${s.after.failed} |`,
    '',
    `- **Fixed:** ${s.fixedCount} (failed before, pass after)`,
    `- **Regressions:** ${s.regressionCount} (passed before, fail after)`,
    `- **Added:** ${s.addedCount} (new tests in after)`,
    `- **Removed:** ${s.removedCount} (tests only in before)`,
    '',
  ];

  if (report.regressions.length > 0) {
    lines.push('## Regressions', '');
    for (const r of report.regressions) {
      lines.push(`- **${r.testName}** — ${r.error ?? 'failed'}`);
    }
    lines.push('');
  }

  if (report.fixed.length > 0) {
    lines.push('## Fixed', '');
    for (const r of report.fixed) {
      lines.push(`- **${r.testName}**`);
    }
    lines.push('');
  }

  if (report.added.length > 0) {
    lines.push('## Added (new in after)', '');
    for (const r of report.added) {
      lines.push(`- **${r.testName}** — ${r.passed ? 'passed' : 'failed'}`);
    }
    lines.push('');
  }

  if (report.removed.length > 0) {
    lines.push('## Removed (only in before)', '');
    for (const r of report.removed) {
      lines.push(`- **${r.testName}**`);
    }
  }

  return lines.join('\n');
}

async function main() {
  const { beforePath, afterPath, output } = parseArgs();

  if (!beforePath || !afterPath) {
    console.error('Usage: bun run evaluation/compare.ts -- --game <gameName> --modification <id>');
    console.error('   or: bun run evaluation/compare.ts -- --before <path> --after <path>');
    console.error('Optional: --output <path> to write report file.');
    process.exit(1);
  }

  let beforeJson: string;
  let afterJson: string;
  try {
    beforeJson = await readFile(beforePath, 'utf-8');
    afterJson = await readFile(afterPath, 'utf-8');
  } catch (e) {
    console.error('Failed to read result files:', e);
    process.exit(1);
  }

  const before = JSON.parse(beforeJson) as EvaluationRunResult;
  const after = JSON.parse(afterJson) as EvaluationRunResult;
  const report = compare(before, after);
  const markdown = formatReport(report);

  console.log(markdown);

  if (output) {
    const { writeFile } = await import('fs/promises');
    await writeFile(output, markdown, 'utf-8');
    console.log(`\nReport written to ${output}`);
  }

  process.exit(report.summary.regressionCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
