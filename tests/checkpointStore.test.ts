import { expect, test } from 'vitest';
import { CheckpointStore } from '../src/services/checkpointStore';
import { MemoryStorage } from './memoryStorage';
import { checkpointFixture } from './checkpointFixture';

test('P1-01: missing storage returns an empty versioned collection', async () => {
  const storage = new MemoryStorage();
  const store = new CheckpointStore(storage);

  expect(await store.load()).toEqual({ schemaVersion: 1, checkpoints: [] });
  expect(storage.contents).toBeUndefined();
});

test('P1-02: a saved checkpoint survives reading from a new store instance', async () => {
  const storage = new MemoryStorage();
  const checkpoint = checkpointFixture();
  const expected = { schemaVersion: 1, checkpoints: [checkpoint] };

  await new CheckpointStore(storage).append(checkpoint);

  expect(await new CheckpointStore(storage).load()).toEqual(expected);
  expect(JSON.parse(storage.contents!)).toEqual(expected);
});

test('P1-03: appending a new ID preserves existing checkpoints and their contents', async () => {
  const first = checkpointFixture();
  const second = checkpointFixture({
    id: 'b9b2c3d4-1111-4222-8333-123456789abc',
    createdAt: '2026-11-03T01:00:00.000Z',
    title: 'my-app — 2026-11-03 10:00',
    note: '',
    nextAction: '',
  });
  const storage = new MemoryStorage(JSON.stringify({ schemaVersion: 1, checkpoints: [first] }));

  await new CheckpointStore(storage).append(second);

  const reloaded = await new CheckpointStore(storage).load();
  expect(reloaded).toEqual({ schemaVersion: 1, checkpoints: [first, second] });
  expect(reloaded.checkpoints.map(checkpoint => checkpoint.id)).toEqual([first.id, second.id]);
});

test.each([
  ['null', null],
  ['array', []],
  ['missing checkpoints', { schemaVersion: 1 }],
  ['unknown schema version', { schemaVersion: 2, checkpoints: [] }],
  ['non-array checkpoints', { schemaVersion: 1, checkpoints: {} }],
  ['unexpected data', { schemaVersion: 1, checkpoints: [], fileBody: 'must not be accepted' }],
])('P1-04a: rejects an invalid collection (%s)', async (_description, value) => {
  const store = new CheckpointStore(new MemoryStorage(JSON.stringify(value)));
  await expect(store.load()).rejects.toMatchObject({ name: 'CheckpointError', code: 'INVALID_SCHEMA' });
});

const validCheckpoint = checkpointFixture();
test.each([
  ['null checkpoint', null],
  ['missing fields', {}],
  ['checkpoint schema', { ...validCheckpoint, schemaVersion: 2 }],
  ...['id', 'createdAt', 'title', 'workspaceUri', 'workspaceName', 'note', 'nextAction']
    .map(field => [`non-string ${field}`, { ...validCheckpoint, [field]: 17 }]),
  ['non-array openFiles', { ...validCheckpoint, openFiles: '' }],
  ['non-string openFiles entry', { ...validCheckpoint, openFiles: [4] }],
  ['non-array unsavedFileUris', { ...validCheckpoint, unsavedFileUris: null }],
  ['non-string unsaved URI', { ...validCheckpoint, unsavedFileUris: [false] }],
  ['non-string active URI', { ...validCheckpoint, activeFileUri: 2 }],
  ['missing cursor coordinate', { ...validCheckpoint, cursor: { line: 1 } }],
  ['string cursor coordinate', { ...validCheckpoint, cursor: { line: '1', character: 0 } }],
  ['missing Git fields', { ...validCheckpoint, git: {} }],
  ['non-boolean Git availability', { ...validCheckpoint, git: { ...validCheckpoint.git, available: 'true' } }],
  ...['repoRootUri', 'branch', 'headCommit', 'error']
    .map(field => [`non-string Git ${field}`, { ...validCheckpoint, git: { ...validCheckpoint.git, [field]: 3 } }]),
  ['non-array Git changes', { ...validCheckpoint, git: { ...validCheckpoint.git, changes: {} } }],
  ['non-string Git change path', { ...validCheckpoint, git: { ...validCheckpoint.git, changes: [{ path: 8, status: ' M' }] } }],
  ['non-string Git change status', { ...validCheckpoint, git: { ...validCheckpoint.git, changes: [{ path: 'a.ts', status: null }] } }],
  ['unexpected file body', { ...validCheckpoint, fileBody: 'do not persist this' }],
  ['unexpected Git diff', { ...validCheckpoint, git: { ...validCheckpoint.git, changes: [{ path: 'a.ts', status: ' M', diff: 'do not persist' }] } }],
])('P1-04b: rejects an invalid checkpoint structure (%s)', async (_description, checkpoint) => {
  const storage = new MemoryStorage(JSON.stringify({ schemaVersion: 1, checkpoints: [checkpoint] }));
  await expect(new CheckpointStore(storage).load()).rejects.toMatchObject({
    name: 'CheckpointError', code: 'INVALID_SCHEMA',
  });
});
