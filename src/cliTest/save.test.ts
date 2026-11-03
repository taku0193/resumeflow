import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
const cli = resolve(__dirname, '../cli/main.js');
test('CLI-E2E-save: a real CLI process saves Japanese metadata without any editor', async () => {
  const root = await mkdtemp(join(tmpdir(), 'resumeflow-cli-'));
  try {
    const project = join(root, 'project'); const data = join(root, 'data');
    await mkdir(project);
    await writeFile(join(project, 'source.txt'), 'SOURCE_BODY_NOT_COLLECTED');
    const result = spawnSync(process.execPath, [cli, 'save', '--project', project, '--data-dir', data, '--note', '調査中\n再開', '--format', 'json'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes('"ok":true'), 'one JSON success result is required');
    assert.equal(result.stderr, '');
    const saved = JSON.parse(await readFile(join(data, 'checkpoints.json'), 'utf8'));
    assert.equal(saved.schemaVersion, 2);
    assert.equal(saved.checkpoints[0].note, '調査中\n再開');
    assert.equal(saved.checkpoints[0].editorCapture, 'not-connected');
    assert.equal(saved.checkpoints[0].git.error, 'NOT_ALLOWED');
    assert.ok(!JSON.stringify(saved).includes('SOURCE_BODY_NOT_COLLECTED'));
    assert.equal(await readFile(join(project, 'source.txt'), 'utf8'), 'SOURCE_BODY_NOT_COLLECTED');
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('CLI-E2E-help: help and invalid arguments need no project or storage', () => {
  const help = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0); assert.ok(help.stdout.includes('save'));
  const invalid = spawnSync(process.execPath, [cli, 'save', '--unknown'], { encoding: 'utf8' });
  assert.equal(invalid.status, 2); assert.equal(invalid.stdout, '');
  assert.equal(JSON.parse(invalid.stderr).error.code, 'USAGE');
});
test('CLI-E2E-corrupt: corrupted data bytes survive a real save failure', async () => {
  const root = await mkdtemp(join(tmpdir(), 'resumeflow-corrupt-'));
  try {
    const data = join(root, 'data'); await mkdir(data);
    const bytes = Buffer.from([0xff]); await writeFile(join(data, 'checkpoints.json'), bytes);
    const result = spawnSync(process.execPath, [cli, 'save', '--project', root, '--data-dir', data, '--format', 'json'], { encoding: 'utf8' });
    assert.equal(result.status, 1); assert.equal(result.stdout, '');
    assert.equal(JSON.parse(result.stderr).error.code, 'READ_FAILED');
    assert.deepEqual(await readFile(join(data, 'checkpoints.json')), bytes);
  } finally { await rm(root, { recursive: true, force: true }); }
});
