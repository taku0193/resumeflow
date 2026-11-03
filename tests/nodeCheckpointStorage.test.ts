import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { NodeCheckpointStorage } from '../src/adapters/nodeCheckpointStorage';
import { CheckpointStore } from '../src/services/checkpointStore';
import { checkpointFixture } from '../src/test/fixtures/checkpointFixture';
import { cliCheckpointFixture } from '../src/test/fixtures/cliCheckpointFixture';
import { CliCheckpointStore } from '../src/services/cliCheckpointStore';

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

test('C6-02: a competing writer cannot enter the read-modify-write transaction', async () => {
  const root = await directory();
  const first = new NodeCheckpointStorage(root);
  const second = new NodeCheckpointStorage(root);
  await first.withLock(async () => {
    await expect(second.withLock(async () => 'entered')).rejects.toMatchObject({ code: 'DATA_BUSY' });
  });
  expect(await second.withLock(async () => 'released')).toBe('released');
  const failure = new Error('synthetic operation failure');
  await expect(first.withLock(async () => { throw failure; })).rejects.toBe(failure);
  expect(await readdir(root)).toEqual([]);
});

test.each([
  ['json', Buffer.from('{ broken'), 'INVALID_JSON'],
  ['utf8', Buffer.from([0xff]), 'READ_FAILED'],
])('C6 regression: keeps corrupt %s bytes unchanged', async (_name, bytes, code) => {
  const root = await directory();
  const path = join(root, 'checkpoints.json');
  await writeFile(path, bytes);
  const store = new CheckpointStore(new NodeCheckpointStorage(root));
  await expect(store.append(checkpointFixture())).rejects.toMatchObject({ code });
  expect(await readFile(path)).toEqual(bytes);
});

test('C6 regression: failed replacement preserves a nonempty target directory and cleans temporary files', async () => {
  const root = await directory();
  const path = join(root, 'checkpoints.json');
  await mkdir(path);
  await writeFile(join(path, 'marker'), 'untouched');
  await expect(new NodeCheckpointStorage(root).writeAtomic('{}')).rejects.toBeDefined();
  expect(await readFile(join(path, 'marker'), 'utf8')).toBe('untouched');
  expect(await readdir(root)).toEqual(['checkpoints.json']);
});

test('C6-05: portable store appends schema2 through the common JSON store', async () => {
  const storage = new NodeCheckpointStorage(await directory());
  const first = cliCheckpointFixture();
  const second = cliCheckpointFixture({ id: 'b9b2c3d4-1111-4222-8333-123456789abc', note: 'second' });
  const store = new CliCheckpointStore(storage);
  await store.append(first);
  await store.append(second);
  expect((await new CliCheckpointStore(storage).load()).checkpoints).toEqual([first, second]);
});

test('C6-05: schema1 is readable but append refuses to alter its bytes', async () => {
  const root = await directory();
  const original = JSON.stringify({ schemaVersion: 1, checkpoints: [checkpointFixture()] });
  await writeFile(join(root, 'checkpoints.json'), original);
  const store = new CliCheckpointStore(new NodeCheckpointStorage(root));
  expect((await store.load()).checkpoints[0]?.editorCapture).toBe('legacy-unknown');
  await expect(store.append(cliCheckpointFixture())).rejects.toMatchObject({ code: 'LEGACY_READ_ONLY' });
  expect(await readFile(join(root, 'checkpoints.json'), 'utf8')).toBe(original);
});
