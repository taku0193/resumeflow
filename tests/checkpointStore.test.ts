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
