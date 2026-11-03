import { expect, test, vi } from 'vitest';
import { CliCheckpointStore } from '../src/services/cliCheckpointStore';
import { cliCheckpointFixture as fixture } from '../src/test/fixtures/cliCheckpointFixture';
import { checkpointFixture } from '../src/test/fixtures/checkpointFixture';
import { MemoryStorage } from './memoryStorage';
test('C11-01: removes only the selected project record and preserves every other record', async () => {
  const first = fixture();
  const second = fixture({ id: 'b9b2c3d4-1111-4222-8333-123456789abc' });
  const storage = new MemoryStorage(JSON.stringify({ schemaVersion: 2, checkpoints: [first, second] }));
  const store = new CliCheckpointStore(storage);
  await store.remove(first.id.toUpperCase(), first.workspaceUri);
  expect((await store.load()).checkpoints).toEqual([second]);
  const before = storage.contents;
  await expect(store.remove(second.id, 'file:///other')).rejects.toMatchObject({ code: 'PROJECT_MISMATCH' });
  expect(storage.contents).toBe(before);
});
test('C11-01: deletion preserves legacy data rather than migrating it', async () => {
  const record = checkpointFixture();
  const original = JSON.stringify({ schemaVersion: 1, checkpoints: [record] });
  const storage = new MemoryStorage(original);
  await expect(new CliCheckpointStore(storage).remove(record.id, record.workspaceUri)).rejects.toMatchObject({ code: 'LEGACY_READ_ONLY' });
  expect(storage.contents).toBe(original);
});
