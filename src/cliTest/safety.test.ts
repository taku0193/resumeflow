import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { realpath } from 'node:fs/promises';
import { cliFixture } from './fixture';
import { checkpointFixture } from '../test/fixtures/checkpointFixture';

test('CLI-E2E-git: explicit permission collects actual Git metadata; missing Git is nonfatal', async () => {
  const fixture = await cliFixture();
  try {
    execFileSync('git', ['-c', 'core.fsmonitor=false', 'init', '-b', 'main'], { cwd: fixture.project, stdio: 'pipe' });
    await writeFile(join(fixture.project, '日本語 file.txt'), 'SOURCE_BODY');
    const result = fixture.call(['save', '--allow-git', '--format', 'json']);
    assert.equal(result.status, 0, result.stderr);
    const git = JSON.parse(result.stdout).data.git;
    assert.equal(git.available, true); assert.equal(git.branch, 'main'); assert.equal(git.headCommit, null);
    assert.deepEqual(git.changes, [{ path: '日本語 file.txt', status: '??', originalPath: null }]);
    const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) => name.toLowerCase() !== 'path'));
    const missing = spawnSync(process.execPath, [resolve(__dirname, '../cli/main.js'), 'save', '--allow-git', '--project', fixture.project,
      '--data-dir', fixture.data, '--format', 'json'], { encoding: 'utf8', env: { ...environment, PATH: '' } });
    assert.equal(missing.status, 0, missing.stderr);
    assert.equal(JSON.parse(missing.stdout).data.git.error, 'GIT_NOT_INSTALLED');
    assert.ok(!(await readFile(join(fixture.data, 'checkpoints.json'), 'utf8')).includes('SOURCE_BODY'));
  } finally { await fixture.dispose(); }
});
test('CLI-E2E-destination: a blocked storage path and an occupied lock preserve data', async () => {
  const fixture = await cliFixture();
  try {
    await writeFile(fixture.data, 'BLOCKED_DESTINATION');
    const blocked = fixture.call(['save', '--format', 'json']);
    assert.equal(blocked.status, 1); assert.equal(blocked.stdout, '');
    assert.equal(await readFile(fixture.data, 'utf8'), 'BLOCKED_DESTINATION');
  } finally { await fixture.dispose(); }
  const locked = await cliFixture();
  try {
    const saved = locked.call(['save', '--format', 'json']); assert.equal(saved.status, 0, saved.stderr);
    const before = await readFile(join(locked.data, 'checkpoints.json'));
    await writeFile(join(locked.data, '.write.lock'), 'fixture lock');
    const busy = locked.call(['save', '--format', 'json']);
    assert.equal(busy.status, 1); assert.equal(busy.stdout, ''); assert.equal(JSON.parse(busy.stderr).error.code, 'DATA_BUSY');
    assert.deepEqual(await readFile(join(locked.data, 'checkpoints.json')), before);
  } finally { await locked.dispose(); }
});
test('CLI-E2E-legacy: old checkpoints display unknown availability and remain read-only', async () => {
  const fixture = await cliFixture();
  try {
    await mkdir(fixture.data);
    const record = checkpointFixture({ workspaceUri: pathToFileURL(await realpath(fixture.project)).toString() });
    const original = JSON.stringify({ schemaVersion: 1, checkpoints: [record] });
    const path = join(fixture.data, 'checkpoints.json'); await writeFile(path, original);
    const shown = fixture.call(['show', record.id, '--format', 'json']);
    assert.equal(shown.status, 0, shown.stderr); assert.equal(JSON.parse(shown.stdout).data.editorCapture, 'legacy-unknown');
    assert.ok(fixture.call(['context', record.id]).stdout.includes('旧形式'));
    for (const args of [['save'], ['delete', record.id, '--yes']]) {
      const result = fixture.call([...args, '--format', 'json']);
      assert.equal(result.status, 1); assert.equal(result.stdout, ''); assert.equal(JSON.parse(result.stderr).error.code, 'LEGACY_READ_ONLY');
    }
    assert.equal(await readFile(path, 'utf8'), original);
  } finally { await fixture.dispose(); }
});
