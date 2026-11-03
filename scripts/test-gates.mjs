export function assertTapComplete(text, status) {
  const counts = Object.fromEntries(Array.from(text.matchAll(/^# (tests|pass|fail|cancelled|skipped|todo) (\d+)\s*$/gm), match => [match[1], Number(match[2])]));
  if (status !== 0 || !['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo'].every(name => Number.isSafeInteger(counts[name]))
    || counts.tests < 1 || counts.pass !== counts.tests || counts.fail || counts.cancelled || counts.skipped || counts.todo
    || /Warning:.*(?:\.only|'only')/i.test(text)) throw new Error('Test suite must pass all tests without only/skip/todo/zero cases');
}
export function assertVitestComplete(report, focused = false) {
  const fields = ['numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests', 'numTodoTests'];
  if (!report.success || !fields.every(name => Number.isSafeInteger(report[name])) || report.numTotalTests < 1
    || report.numPassedTests < 1 || report.numFailedTests !== 0
    || (!focused && (report.numPassedTests !== report.numTotalTests || report.numPendingTests !== 0 || report.numTodoTests !== 0))) {
    throw new Error('Vitest must execute and pass all selected tests');
  }
}
export function assertNoDisabledTests(source) {
  if (/\.\s*(?:only|skip|todo)\s*\(|\b(?:only|skip|todo)\s*:\s*true\b/.test(source)) throw new Error('Focused or disabled test declaration found');
}
