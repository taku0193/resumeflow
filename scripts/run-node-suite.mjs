import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assertNoDisabledTests, assertTapComplete } from './test-gates.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
try {
  const kind = process.argv[2];
  let files;
  if (kind === 'tools') files = [join(root, 'scripts/test-gates.test.mjs')];
  else {
    const directory = kind === 'cli' ? 'cliTest' : kind === 'integration' ? 'nodeTest' : null;
    if (directory === null) throw new Error('Unknown test suite');
    files = readdirSync(join(root, 'src', directory)).filter(name => name.endsWith('.test.ts')).map(name => {
      assertNoDisabledTests(readFileSync(join(root, 'src', directory, name), 'utf8'));
      return join(root, 'dist', directory, name.replace(/\.ts$/, '.js'));
    });
  }
  if (files.length === 0) throw new Error('No test files');
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...files], { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 20 * 1024 * 1024 });
  process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? '');
  assertTapComplete(result.stdout ?? '', result.status);
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
