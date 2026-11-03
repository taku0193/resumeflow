import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { cliFixture } from './fixture';
test('CLI-E2E-delete: refusal preserves bytes and approval removes only the selected record', async () => {
  const fixture = await cliFixture();
  try {
    const first = JSON.parse(fixture.call(['save', '--format', 'json']).stdout).data;
    const second = JSON.parse(fixture.call(['save', '--format', 'json']).stdout).data;
    const source = join(fixture.project, 'source.txt'); await writeFile(source, 'SOURCE_UNCHANGED');
    const path = join(fixture.data, 'checkpoints.json'); const original = await readFile(path);
    const refused = fixture.call(['delete', first.id, '--format', 'json']);
    assert.equal(refused.status, 2); assert.equal(refused.stdout, '');
    assert.equal(JSON.parse(refused.stderr).error.code, 'CONFIRMATION_REQUIRED');
    assert.deepEqual(await readFile(path), original);
    const foreign = fixture.call(['delete', first.id, '--yes', '--format', 'json'], fixture.other);
    assert.equal(foreign.status, 1); assert.deepEqual(await readFile(path), original);
    const deleted = fixture.call(['delete', first.id, '--yes', '--format', 'json']);
    assert.equal(deleted.status, 0, deleted.stderr); assert.equal(JSON.parse(deleted.stdout).data.deleted, true);
    const list = JSON.parse(fixture.call(['list', '--format', 'json']).stdout).data;
    assert.deepEqual(list.map((record: { id: string }) => record.id), [second.id]);
    assert.equal(await readFile(source, 'utf8'), 'SOURCE_UNCHANGED');
  } finally { await fixture.dispose(); }
});
test('CLI-E2E-delete-corrupt: deletion cannot overwrite a damaged collection', async () => {
  const fixture = await cliFixture();
  try {
    const checkpoint = JSON.parse(fixture.call(['save', '--format', 'json']).stdout).data;
    const path = join(fixture.data, 'checkpoints.json'); const original = Buffer.from('{ damaged');
    await writeFile(path, original);
    const deleted = fixture.call(['delete', checkpoint.id, '--yes', '--format', 'json']);
    assert.equal(deleted.status, 1); assert.equal(deleted.stdout, '');
    assert.equal(JSON.parse(deleted.stderr).error.code, 'INVALID_JSON');
    assert.deepEqual(await readFile(path), original);
  } finally { await fixture.dispose(); }
});
