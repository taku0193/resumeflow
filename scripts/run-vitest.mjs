import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assertNoDisabledTests, assertVitestComplete } from './test-gates.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
let temporary;
try {
  function inspect(directory) {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, item.name);
      if (item.isDirectory()) inspect(path);
      else if (item.name.endsWith('.test.ts')) assertNoDisabledTests(readFileSync(path, 'utf8'));
    }
  }
  inspect(join(root, 'tests'));
  mkdirSync(join(root, '.test-data'), { recursive: true });
  temporary = mkdtempSync(join(root, '.test-data/vitest-'));
  const report = join(temporary, 'result.json');
  const args = process.argv.slice(2);
  const result = spawnSync(process.execPath, [join(root, 'node_modules/vitest/vitest.mjs'), 'run', ...args,
    '--reporter=default', '--reporter=json', `--outputFile=${report}`], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  else assertVitestComplete(JSON.parse(readFileSync(report, 'utf8')), args.some(arg => arg === '-t' || arg === '--testNamePattern' || arg.startsWith('--testNamePattern=')));
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
finally { if (temporary) rmSync(temporary, { recursive: true, force: true }); }
