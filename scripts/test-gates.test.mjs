import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertTapComplete, assertVitestComplete, assertNoDisabledTests } from './test-gates.mjs';
const tap = (overrides = {}) => Object.entries({ tests: 2, pass: 2, fail: 0, cancelled: 0, skipped: 0, todo: 0, ...overrides }).map(([name, count]) => `# ${name} ${count}`).join('\n');
test('test gates: successful complete reports pass', () => {
  assert.doesNotThrow(() => assertTapComplete(tap(), 0));
  assert.doesNotThrow(() => assertVitestComplete({ success: true, numTotalTests: 2, numPassedTests: 2, numFailedTests: 0, numPendingTests: 0, numTodoTests: 0 }));
});
test('test gates: zero, failure, skipped, cancelled and todo cannot produce success', () => {
  for (const counts of [{ tests: 0, pass: 0 }, { fail: 1 }, { skipped: 1 }, { cancelled: 1 }, { todo: 1 }, { pass: 1 }]) {
    assert.throws(() => assertTapComplete(tap(counts), 0));
  }
  assert.throws(() => assertTapComplete(tap(), 1));
  assert.throws(() => assertTapComplete('', 0));
  const report = { success: true, numTotalTests: 2, numPassedTests: 1, numFailedTests: 0, numPendingTests: 1, numTodoTests: 0 };
  assert.throws(() => assertVitestComplete(report));
  assert.doesNotThrow(() => assertVitestComplete(report, true));
  assert.throws(() => assertVitestComplete({ ...report, numPassedTests: 0 }, true));
});
test('test gates: focused/disabled declarations are rejected', () => {
  for (const source of ['test.only("x", fn)', 'test.skip("x", fn)', 'test.todo("x")', 'test("x", {skip:true}, fn)']) {
    assert.throws(() => assertNoDisabledTests(source));
  }
  assert.doesNotThrow(() => assertNoDisabledTests('test("x", fn)'));
});
