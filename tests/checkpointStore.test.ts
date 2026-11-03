import { expect, test, vi } from 'vitest';
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
    .map((field): [string, unknown] => [`non-string ${field}`, { ...validCheckpoint, [field]: 17 }]),
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
    .map((field): [string, unknown] => [`non-string Git ${field}`, { ...validCheckpoint, git: { ...validCheckpoint.git, [field]: 3 } }]),
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

test.each([
  ['UUID', { ...validCheckpoint, id: 'not-a-uuid' }],
  ['non-ISO date', { ...validCheckpoint, createdAt: '2026-11-03' }],
  ['invalid calendar date', { ...validCheckpoint, createdAt: '2026-02-30T00:00:00.000Z' }],
  ['non-UTC timestamp', { ...validCheckpoint, createdAt: '2026-11-03T09:00:00+09:00' }],
  ['malformed URI', { ...validCheckpoint, workspaceUri: 'not-a-uri' }],
  ['non-file workspace', { ...validCheckpoint, workspaceUri: 'https://example.com/project' }],
  ['non-file tab', { ...validCheckpoint, openFiles: ['untitled:buffer'] }],
  ['non-file dirty URI', { ...validCheckpoint, unsavedFileUris: ['untitled:buffer'] }],
  ['non-file Git root', { ...validCheckpoint, git: { ...validCheckpoint.git, repoRootUri: 'https://example.com/project' } }],
  ['file URI query', { ...validCheckpoint, workspaceUri: 'file:///projects/my-app?mode=unsafe' }],
  ['file URI fragment', { ...validCheckpoint, workspaceUri: 'file:///projects/my-app#fragment' }],
  ['negative line', { ...validCheckpoint, cursor: { line: -1, character: 0 } }],
  ['fractional character', { ...validCheckpoint, cursor: { line: 0, character: 0.5 } }],
  ['unsafe integer', { ...validCheckpoint, cursor: { line: Number.MAX_SAFE_INTEGER + 1, character: 0 } }],
  ['active URI outside open files', { ...validCheckpoint, activeFileUri: 'file:///projects/my-app/other.ts' }],
  ['duplicate open tabs', { ...validCheckpoint, openFiles: [...validCheckpoint.openFiles, ...validCheckpoint.openFiles] }],
])('P1-04c: rejects invalid field values (%s)', async (_description, checkpoint) => {
  const storage = new MemoryStorage(JSON.stringify({ schemaVersion: 1, checkpoints: [checkpoint] }));
  await expect(new CheckpointStore(storage).load()).rejects.toMatchObject({ code: 'INVALID_SCHEMA' });
});

test('P1-04c: rejects duplicate checkpoint IDs', async () => {
  const storage = new MemoryStorage(JSON.stringify({ schemaVersion: 1, checkpoints: [validCheckpoint, validCheckpoint] }));
  await expect(new CheckpointStore(storage).load()).rejects.toMatchObject({ code: 'INVALID_SCHEMA' });
});

test.each([
  ['Windows', 'file:///C:/projects/my%20app'],
  ['macOS', 'file:///Users/example/%E9%96%8B%E7%99%BA'],
  ['Linux', 'file:///home/example/project'],
  ['UNC', 'file://server/share/project'],
])('P1-04c: preserves valid nullable metadata and %s file URIs', async (_os, workspaceUri) => {
  const checkpoint = checkpointFixture({
    workspaceUri, createdAt: '2026-11-03T00:00:00Z',
    openFiles: [], activeFileUri: null, cursor: null, unsavedFileUris: [],
    git: { available: false, repoRootUri: null, branch: null, headCommit: null, changes: [], error: 'NOT_A_REPOSITORY' },
  });
  const expected = { schemaVersion: 1, checkpoints: [checkpoint] };
  await expect(new CheckpointStore(new MemoryStorage(JSON.stringify(expected))).load()).resolves.toEqual(expected);
});

const nextCheckpoint = checkpointFixture({ id: 'b9b2c3d4-1111-4222-8333-123456789abc' });
test.each([
  ['unknown file body', { ...nextCheckpoint, fileBody: 'private marker' }],
  ['invalid UUID', checkpointFixture({ id: 'not-a-uuid' })],
  ['duplicate ID', validCheckpoint],
])('P1-04d: refuses invalid appends without writing (%s)', async (_description, checkpoint) => {
  const original = JSON.stringify({ schemaVersion: 1, checkpoints: [validCheckpoint] });
  const storage = new MemoryStorage(original);
  const write = vi.spyOn(storage, 'writeAtomic');

  await expect(new CheckpointStore(storage).append(checkpoint)).rejects.toMatchObject({ code: 'INVALID_SCHEMA' });
  expect(write).not.toHaveBeenCalled();
  expect(storage.contents).toBe(original);
});

test.each([
  ['', 'INVALID_JSON'],
  ['  ', 'INVALID_JSON'],
  ['{"schemaVersion":1,"checkpoints":[', 'INVALID_JSON'],
  ['private-marker is not JSON', 'INVALID_JSON'],
  ['{"schemaVersion":2,"checkpoints":[]}', 'INVALID_SCHEMA'],
  ['null', 'INVALID_SCHEMA'],
])('P1-05: preserves corrupted data after load and append fail (%j)', async (original, code) => {
  const storage = new MemoryStorage(original);
  const write = vi.spyOn(storage, 'writeAtomic');
  const store = new CheckpointStore(storage);
  const loadError = await store.load().catch(error => error);
  const appendError = await store.append(nextCheckpoint).catch(error => error);

  expect(write).not.toHaveBeenCalled();
  expect(storage.contents).toBe(original);
  expect(loadError).toMatchObject({ name: 'CheckpointError', code });
  expect(appendError).toMatchObject({ name: 'CheckpointError', code });
  expect(loadError.message).not.toContain('private-marker');
});
