import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { NodeCheckpointStorage } from '../src/adapters/nodeCheckpointStorage';
import { CheckpointStore } from '../src/services/checkpointStore';
import { checkpointFixture } from '../src/test/fixtures/checkpointFixture';

const roots: string[] = [];
async function directory(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'resumeflow-storage-'));
  roots.push(root);
  return root;
}
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

test('C6-01: the Node adapter persists through the shared CheckpointStore without VS Code', async () => {
  const root = await directory();
  const store = new CheckpointStore(new NodeCheckpointStorage(root));
  expect(await store.load()).toEqual({ schemaVersion: 1, checkpoints: [] });
  const checkpoint = checkpointFixture();
  await store.append(checkpoint);
  expect(await new CheckpointStore(new NodeCheckpointStorage(root)).load()).toEqual({ schemaVersion: 1, checkpoints: [checkpoint] });
  expect(JSON.parse(await readFile(join(root, 'checkpoints.json'), 'utf8')).checkpoints).toEqual([checkpoint]);
});
