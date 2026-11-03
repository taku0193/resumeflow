import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { cliFixture } from './fixture';
test('C12-01: the skill bridge preserves literal memo data and retrieves CLI context', async () => {
  const fixture = await cliFixture();
  const bridge = resolve(__dirname, '../../skills/resumeflow-checkpoint/scripts/bridge.mjs');
  const requestFile = join(fixture.root, 'request.json');
  const marker = join(fixture.root, 'must-not-exist');
  const note = `literal $(touch '${marker}') ; "quoted"\n日本語`;
  async function call(request: object) {
    await writeFile(requestFile, JSON.stringify({ project: fixture.project, dataDirectory: fixture.data, ...request }));
    return spawnSync(process.execPath, [bridge, requestFile], { encoding: 'utf8', timeout: 10000 });
  }
  try {
    const saved = await call({ action: 'save', note, nextAction: '再開する' });
    assert.equal(saved.status, 0, saved.stderr); assert.ok(saved.stdout.includes('"ok":true'));
    const record = JSON.parse(saved.stdout).data;
    assert.equal(record.note, note); assert.equal(record.git.error, 'NOT_ALLOWED');
    await assert.rejects(stat(marker), { code: 'ENOENT' });
    const list = await call({ action: 'list' }); assert.equal(list.status, 0, list.stderr);
    assert.equal(JSON.parse(list.stdout).data[0].id, record.id);
    const resumed = await call({ action: 'resume', id: record.id });
    assert.equal(resumed.status, 0, resumed.stderr); assert.ok(resumed.stdout.includes('再開用コンテキスト'));
    const before = await readFile(join(fixture.data, 'checkpoints.json'));
    const refused = await call({ action: 'delete', id: record.id });
    assert.equal(refused.status, 2); assert.equal(refused.stdout, '');
    const invalid = await call({ action: 'save', allowGit: 'true' });
    assert.equal(invalid.status, 2);
    assert.deepEqual(await readFile(join(fixture.data, 'checkpoints.json')), before);
  } finally { await fixture.dispose(); }
});
test('C12-02: a memo beginning with dashes remains literal option data', async () => {
  const fixture = await cliFixture();
  try {
    const request = join(fixture.root, 'request.json');
    const note = '- bullet\n--allow-git';
    await writeFile(request, JSON.stringify({ action: 'save', project: fixture.project, dataDirectory: fixture.data, note, nextAction: '--not-an-option' }));
    const result = spawnSync(process.execPath, [resolve(__dirname, '../../skills/resumeflow-checkpoint/scripts/bridge.mjs'), request], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).data.note, note);
    assert.equal(JSON.parse(result.stdout).data.nextAction, '--not-an-option');
    assert.equal(JSON.parse(result.stdout).data.git.error, 'NOT_ALLOWED');
  } finally { await fixture.dispose(); }
});
