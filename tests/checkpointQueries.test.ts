import { expect, test } from 'vitest';
import { listProjectCheckpoints, findProjectCheckpoint } from '../src/services/checkpointQueries';
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
test('C10-02: lookup requires both ID and current project, including case-insensitive UUID input', () => {
  const checkpoint = fixture();
  const collection = { schemaVersion: 2 as const, checkpoints: [checkpoint] };
  expect(findProjectCheckpoint(collection, checkpoint.id.toUpperCase(), checkpoint.workspaceUri)).toEqual(checkpoint);
  expect(() => findProjectCheckpoint(collection, checkpoint.id, 'file:///other')).toThrow(/プロジェクト/);
  expect(() => findProjectCheckpoint(collection, 'b9b2c3d4-1111-4222-8333-123456789abc', checkpoint.workspaceUri)).toThrow(/見つかりません/);
});
