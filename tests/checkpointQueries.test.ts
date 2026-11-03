import { expect, test } from 'vitest';
import { listProjectCheckpoints } from '../src/services/checkpointQueries';
import { cliCheckpointFixture as fixture } from '../src/test/fixtures/cliCheckpointFixture';
test('C10-01: lists only the current project in newest-first order without changing the input', () => {
  const old = fixture({ createdAt: '2026-11-02T00:00:00Z' });
  const recent = fixture({ id: 'b9b2c3d4-1111-4222-8333-123456789abc', createdAt: '2026-11-03T00:00:00Z' });
  const other = fixture({ workspaceUri: 'file:///other' });
  const collection = { schemaVersion: 2 as const, checkpoints: [old, other, recent] };
  expect(listProjectCheckpoints(collection, old.workspaceUri)).toEqual([recent, old]);
  expect(collection.checkpoints).toEqual([old, other, recent]);
  expect(listProjectCheckpoints(collection, 'file:///missing')).toEqual([]);
});
