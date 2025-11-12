#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const DEFAULT_JSON_PATH = path.join('test-results', process.env.PLAYWRIGHT_JSON_OUTPUT_NAME || 'playwright-report.json');
const jsonPath = process.env.PLAYWRIGHT_JSON_PATH || DEFAULT_JSON_PATH;

if (!fs.existsSync(jsonPath)) {
  console.error(`[coverage] Playwright JSON report not found at ${jsonPath}. Ensure the JSON reporter is enabled.`);
  process.exit(1);
}

const raw = fs.readFileSync(jsonPath, 'utf-8');
const report = JSON.parse(raw);

let total = 0;
let skipped = 0;
let passed = 0;
let failed = 0;
let flaky = 0;

const classifyTest = (test) => {
  // Prefer result statuses over legacy outcome
  const results = Array.isArray(test.results) ? test.results : [];

  let status = null;
  for (const result of results) {
    const s = result.status;
    if (['failed', 'timedOut', 'interrupted'].includes(s)) {
      status = 'failed';
      break;
    }
    if (s === 'flaky') {
      status = 'flaky';
      // continue checking in case there's a hard failure later in results
      continue;
    }
    if (s === 'passed') {
      status = status === 'flaky' ? status : 'passed';
      continue;
    }
    if (s === 'skipped') {
      status = status ?? 'skipped';
    }
  }

  if (!status) {
    switch (test.outcome) {
      case 'skipped':
        status = 'skipped';
        break;
      case 'expected':
        status = 'passed';
        break;
      case 'flaky':
        status = 'flaky';
        break;
      case 'unexpected':
      case 'failed':
      case 'timedOut':
      case 'interrupted':
        status = 'failed';
        break;
      default:
        status = 'failed';
    }
  }

  return status;
};

const visitSuite = (suite) => {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      total += 1;
      const status = classifyTest(test);
      switch (status) {
        case 'skipped':
          skipped += 1;
          break;
        case 'passed':
          passed += 1;
          break;
        case 'flaky':
          flaky += 1;
          break;
        default:
          failed += 1;
      }
    }
  }
  for (const child of suite.suites ?? []) {
    visitSuite(child);
  }
};

for (const suite of report.suites ?? []) {
  visitSuite(suite);
}

const executed = total - skipped;
const executionCoverage = total === 0 ? 0 : executed / total;
const threshold = Number.parseFloat(process.env.PLAYWRIGHT_MINIMUM_COVERAGE ?? '0.75');

console.log('[coverage] Playwright execution summary');
console.log(`[coverage] total=${total}, executed=${executed}, passed=${passed}, flaky=${flaky}, failed=${failed}, skipped=${skipped}`);
console.log(`[coverage] execution coverage ${(executionCoverage * 100).toFixed(2)}% (threshold ${(threshold * 100).toFixed(2)}%)`);

if (executionCoverage < threshold) {
  console.error('[coverage] Execution coverage below threshold. Increase test coverage or reduce skipped tests.');
  process.exit(1);
}

if (failed > 0) {
  console.error('[coverage] Detected failed tests in report. Build should already have failed, but exiting for clarity.');
  process.exit(1);
}

process.exit(0);

