import { expect, test, vi } from 'vitest';
import { decodeCheckpointText } from '../src/models/checkpointEncoding';
import { CheckpointStore } from '../src/services/checkpointStore';
import { checkpointFixture } from '../src/test/fixtures/checkpointFixture';

test('P1-05-UTF8: malformed bytes cannot be decoded and overwritten', async () => {
  const checkpoint = checkpointFixture({ note: 'UTF8_MARKER' });
  const original = Buffer.from(JSON.stringify({ schemaVersion: 1, checkpoints: [checkpoint] }));
  original[original.indexOf('UTF8_MARKER')] = 0xff;
  let bytes = Buffer.from(original);
  const writeAtomic = vi.fn(async (contents: string) => { bytes = Buffer.from(contents, 'utf8'); });
  const store = new CheckpointStore({ read: async () => decodeCheckpointText(bytes), writeAtomic });

  const loadError = await store.load().catch(error => error);
  const appendError = await store.append(checkpointFixture({ id: 'b9b2c3d4-1111-4222-8333-123456789abc' })).catch(error => error);

  expect(writeAtomic).not.toHaveBeenCalled();
  expect(bytes).toEqual(original);
  expect(loadError).toMatchObject({ code: 'READ_FAILED' });
  expect(appendError).toMatchObject({ code: 'READ_FAILED' });
});

test('P1-05-UTF8: valid Japanese checkpoint text is preserved', async () => {
  const collection = { schemaVersion: 1, checkpoints: [checkpointFixture()] };
  const store = new CheckpointStore({
    read: async () => decodeCheckpointText(Buffer.from(JSON.stringify(collection), 'utf8')),
    writeAtomic: vi.fn(),
  });
  await expect(store.load()).resolves.toEqual(collection);
});

test('P1-05-UTF8: a BOM is not silently stripped to allow an otherwise rejected JSON write', async () => {
  const writeAtomic = vi.fn();
  const bytes = Buffer.from('\uFEFF{"schemaVersion":1,"checkpoints":[]}', 'utf8');
  const store = new CheckpointStore({ read: async () => decodeCheckpointText(bytes), writeAtomic });
  await expect(store.append(checkpointFixture())).rejects.toMatchObject({ code: 'INVALID_JSON' });
  expect(writeAtomic).not.toHaveBeenCalled();
});
