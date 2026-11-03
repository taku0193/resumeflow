import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { cliFixture } from './fixture';
test('CLI-E2E-read: save exits, then fresh processes list/show/context with project separation', async () => {
  const fixture = await cliFixture();
  try {
    const saved = fixture.call(['save', '--note', '中断メモ', '--next', 'テストを確認', '--format', 'json']);
    assert.equal(saved.status, 0, saved.stderr);
    const checkpoint = JSON.parse(saved.stdout).data;
    const original = await readFile(join(fixture.data, 'checkpoints.json'));
    const list = fixture.call(['list', '--format', 'json']);
    assert.equal(list.status, 0, list.stderr); assert.equal(JSON.parse(list.stdout).data[0].id, checkpoint.id);
    const show = fixture.call(['show', checkpoint.id, '--format', 'json']);
    assert.equal(show.status, 0, show.stderr); assert.deepEqual(JSON.parse(show.stdout).data, checkpoint);
    const context = fixture.call(['context', checkpoint.id]);
    assert.equal(context.status, 0, context.stderr);
    assert.ok(context.stdout.includes('中断メモ')); assert.ok(context.stdout.includes('テストを確認'));
    assert.ok(context.stdout.includes('未取得'));
    assert.deepEqual(JSON.parse(fixture.call(['list', '--format', 'json'], fixture.other).stdout).data, []);
    const foreign = fixture.call(['show', checkpoint.id, '--format', 'json'], fixture.other);
    assert.equal(foreign.status, 1); assert.equal(foreign.stdout, '');
    assert.equal(JSON.parse(foreign.stderr).error.code, 'PROJECT_MISMATCH');
    assert.deepEqual(await readFile(join(fixture.data, 'checkpoints.json')), original);
  } finally { await fixture.dispose(); }
});
test('CLI-E2E-empty: a read-only empty list creates no storage directory', async () => {
  const fixture = await cliFixture();
  try {
    const list = fixture.call(['list', '--format', 'json']);
    assert.equal(list.status, 0, list.stderr); assert.deepEqual(JSON.parse(list.stdout).data, []);
    await assert.rejects(stat(fixture.data), { code: 'ENOENT' });
  } finally { await fixture.dispose(); }
});
