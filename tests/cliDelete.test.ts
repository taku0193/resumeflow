import { expect, test, vi } from 'vitest';
import { CliCheckpointStore } from '../src/services/cliCheckpointStore';
import { cliCheckpointFixture as fixture } from '../src/test/fixtures/cliCheckpointFixture';
import { checkpointFixture } from '../src/test/fixtures/checkpointFixture';
import { MemoryStorage } from './memoryStorage';
import { runCli } from '../src/cli/run';
import { cliContextFixture } from './cliContextFixture';
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
test.each(['unapproved', 'cancel', 'yes'] as const)('C11-03: deletion decision %s controls persistence', async decision => {
  const context = cliContextFixture();
  const record = fixture({ workspaceUri: context.project.uri });
  await context.store.append(record);
  context.isInteractive = decision === 'cancel';
  const result = await runCli(['delete', record.id, '--format', 'json', ...(decision === 'yes' ? ['--yes'] : [])], async () => context);
  expect(result.exitCode).toBe(decision === 'unapproved' ? 2 : 0);
  expect((await context.store.load()).checkpoints).toEqual(decision === 'yes' ? [] : [record]);
  if (decision === 'unapproved') expect(JSON.parse(result.stderr).error.code).toBe('CONFIRMATION_REQUIRED');
  else expect(JSON.parse(result.stdout).data.deleted).toBe(decision === 'yes');
  expect(context.confirm).toHaveBeenCalledTimes(decision === 'cancel' ? 1 : 0);
  expect(context.gitRunner.run).not.toHaveBeenCalled();
});
test('C11 regression: a failed delete write leaves the existing collection intact', async () => {
  const record = fixture();
  const original = JSON.stringify({ schemaVersion: 2, checkpoints: [record] });
  const storage = new MemoryStorage(original);
  storage.writeAtomic = vi.fn(async () => { throw new Error('synthetic write failure'); });
  await expect(new CliCheckpointStore(storage).remove(record.id, record.workspaceUri)).rejects.toMatchObject({ code: 'WRITE_FAILED' });
  expect(storage.contents).toBe(original);
});
