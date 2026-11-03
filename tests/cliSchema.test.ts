import { expect, test } from 'vitest';
import { parseCliCollection, assertCliCollection } from '../src/models/cliSchema';
import type { CliCheckpoint } from '../src/models/cliCheckpoint';
import { checkpointFixture } from '../src/test/fixtures/checkpointFixture';

export function cliFixture(overrides: Partial<CliCheckpoint> = {}): CliCheckpoint {
  const legacy = checkpointFixture();
  return {
    ...legacy, schemaVersion: 2, editorCapture: 'not-connected',
    openFiles: [], activeFileUri: null, cursor: null, unsavedFileUris: [],
    git: { ...legacy.git, changes: [{ path: 'new name.ts', status: 'R ', originalPath: 'old name.ts' }] },
    ...overrides,
  };
}

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
