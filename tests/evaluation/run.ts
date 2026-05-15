#!/usr/bin/env bun
/**
 * Scaffold evaluation runner.
 * Usage: bun run evaluation/run.ts -- --game <gameName> --modification <id> --phase before|after
 *
 * Starts the app (or uses EVALUATION_BASE_URL), runs the test suite for the given modification,
 * and writes a structured result to evaluation-results/<gameName>/<modificationId>/<phase>.json
 */

import { spawn } from 'child_process';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  getModificationSuite,
  listModificationIds,
  type ModificationSuite,
} from './modification-suites.js';
import type { EvaluationRunResult, EvaluationTestResult } from './types.js';

const ROOT = join(import.meta.dirname, '..');
const RESULTS_DIR = join(ROOT, 'evaluation-results');
const PLAYWRIGHT_RESULT_FILE = join(import.meta.dirname, '.playwright-result.json');

function parseArgs(): { gameName: string; modificationId: string; phase: 'before' | 'after' } {
  const args = process.argv.slice(2);
  let gameName = '';
  let modificationId = '';
  let phase: 'before' | 'after' = 'before';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--game' && args[i + 1]) {
      gameName = args[++i];
    } else if (args[i] === '--modification' && args[i + 1]) {
      modificationId = args[++i];
    } else if (args[i] === '--phase' && args[i + 1]) {
      const p = args[++i];
      if (p === 'before' || p === 'after') phase = p;
    }
  }

  if (!gameName || !modificationId) {
    console.error('Usage: bun run evaluation/run.ts -- --game <gameName> --modification <id> --phase before|after');
    console.error('  --game         Game name (e.g. mygame, dailydispatch)');
    console.error('  --modification Modification suite id (e.g. smoke, unload-bundles)');
    console.error('  --phase        before | after');
    console.error('');
    console.error('Available modification ids:', listModificationIds().join(', '));
    process.exit(1);
  }

  return { gameName, modificationId, phase };
}

/** Recursively collect test results from Playwright JSON report (flexible structure). */
function collectResults(node: unknown, titlePath: string[] = []): EvaluationTestResult[] {
  const results: EvaluationTestResult[] = [];
  if (!node || typeof node !== 'object') return results;

  const obj = node as Record<string, unknown>;
  const title = (obj.title as string) ?? '';
  const path = title ? [...titlePath, title] : titlePath;

  if (Array.isArray(obj.suites)) {
    for (const s of obj.suites) {
      results.push(...collectResults(s, path));
    }
  }
  if (Array.isArray(obj.specs)) {
    for (const spec of obj.specs) {
      const specTitle = (spec as Record<string, unknown>).title as string;
      const specPath = specTitle ? [...path, specTitle] : path;
      const tests = (spec as Record<string, unknown>).tests as Array<Record<string, unknown>> | undefined;
      if (tests) {
        for (const t of tests) {
          const testTitle = (t.title as string) ?? '';
          const testPath = testTitle ? [...specPath, testTitle] : specPath;
          const resList = (t.results as Array<Record<string, unknown>>) ?? [];
          const durationMs = resList.reduce((sum, r) => sum + ((r.duration as number) ?? 0), 0);
          const outcome = (resList[0]?.status as string) ?? 'unknown';
          const passed = outcome === 'passed';
          const errObj = resList[0]?.error as Record<string, unknown> | undefined;
          const error = errObj?.message as string | undefined;
          results.push({
            testName: testPath.join(' > ') || testTitle || 'unknown',
            titlePath: testPath,
            passed,
            durationMs: Math.round(durationMs),
            error: passed ? undefined : error,
          });
        }
      }
    }
  }

  return results;
}

function parsePlaywrightJson(json: string): EvaluationTestResult[] {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  const obj = data as Record<string, unknown>;
  const suites = (obj.suites as unknown[]) ?? [];
  const results: EvaluationTestResult[] = [];
  for (const s of suites) {
    results.push(...collectResults(s));
  }
  return results;
}

async function runPlaywright(suite: ModificationSuite): Promise<{ results: EvaluationTestResult[]; durationMs: number }> {
  const start = Date.now();
  const configPath = join(import.meta.dirname, 'playwright.config.ts');
  const args = [
    'playwright',
    'test',
    '--config',
    configPath,
    '--grep',
    suite.grep,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn('bunx', args, {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, CI: '1' },
    });
    child.on('close', async (code) => {
      const durationMs = Date.now() - start;
      let results: EvaluationTestResult[] = [];
      try {
        const raw = await readFile(PLAYWRIGHT_RESULT_FILE, 'utf-8');
        results = parsePlaywrightJson(raw);
      } catch {
        // no json or parse error
      }
      if (results.length === 0 && code !== 0) {
        results = [{ testName: 'run', titlePath: ['run'], passed: false, durationMs, error: `Playwright exited with code ${code}` }];
      }
      resolve({ results, durationMs });
    });
    child.on('error', reject);
  });
}

async function main() {
  const { gameName, modificationId, phase } = parseArgs();
  const suite = getModificationSuite(modificationId);
  if (!suite) {
    console.error(`Unknown modification: ${modificationId}. Available:`, listModificationIds().join(', '));
    process.exit(1);
  }

  console.log(`Running evaluation: game=${gameName} modification=${modificationId} phase=${phase}`);
  const { results, durationMs } = await runPlaywright(suite);

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const runId = `run-${Date.now()}-${phase}`;

  const runResult: EvaluationRunResult = {
    runId,
    gameName,
    modificationId,
    modificationDescription: suite.description,
    phase,
    timestamp: new Date().toISOString(),
    durationMs,
    results,
    summary: { total: results.length, passed, failed },
  };

  const outDir = join(RESULTS_DIR, gameName, modificationId);
  await mkdir(outDir, { recursive: true });
  const phaseFile = join(outDir, `${phase}.json`);
  await writeFile(phaseFile, JSON.stringify(runResult, null, 2), 'utf-8');
  console.log(`Wrote ${phaseFile}`);
  console.log(`Summary: ${passed}/${results.length} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
