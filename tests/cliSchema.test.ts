import { expect, test } from 'vitest';
import { parseCliCollection, assertCliCollection } from '../src/models/cliSchema';
import { checkpointFixture } from '../src/test/fixtures/checkpointFixture';
import { cliCheckpointFixture as cliFixture } from '../src/test/fixtures/cliCheckpointFixture';

test('C6-03: schema2 retains rename metadata and explicit unavailable editor state', () => {
  const collection = { schemaVersion: 2 as const, checkpoints: [cliFixture()] };
  expect(parseCliCollection(JSON.stringify(collection))).toEqual(collection);
  expect(() => assertCliCollection(collection)).not.toThrow();
});

test.each([
  ['syntax', '{ bad'],
  ['version', JSON.stringify({ schemaVersion: 3, checkpoints: [] })],
  ['extra payload', JSON.stringify({ schemaVersion: 2, checkpoints: [{ ...cliFixture(), body: 'never collect' }] })],
  ['unknown editor state', JSON.stringify({ schemaVersion: 2, checkpoints: [cliFixture({ editorCapture: 'wrong' as never })] })],
  ['false editor claim', JSON.stringify({ schemaVersion: 2, checkpoints: [cliFixture({ openFiles: ['file:///a'] })] })],
  ['invalid rename field', JSON.stringify({ schemaVersion: 2, checkpoints: [cliFixture({ git: { ...cliFixture().git, changes: [{ path: 'a', status: 'R ', originalPath: 42 as never }] } })] })],
  ['duplicate ID', JSON.stringify({ schemaVersion: 2, checkpoints: [cliFixture(), cliFixture()] })],
])('C6-03: rejects %s without quoting saved input', (_name, contents) => {
  expect(() => parseCliCollection(contents)).toThrow();
});

test('C6-04: reads schema1 as legacy-unknown without changing the original representation', () => {
  const checkpoint = checkpointFixture();
  const original = JSON.stringify({ schemaVersion: 1, checkpoints: [checkpoint] });
  expect(() => parseCliCollection(original)).not.toThrow();
  const loaded = parseCliCollection(original);
  expect(loaded.schemaVersion).toBe(1);
  expect(loaded.checkpoints[0]).toEqual({
    ...checkpoint, schemaVersion: 2, editorCapture: 'legacy-unknown',
    git: { ...checkpoint.git, changes: checkpoint.git.changes.map(change => ({ ...change, originalPath: null })) },
  });
});
