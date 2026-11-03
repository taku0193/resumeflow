import { expect, test } from 'vitest';
import { createCliCheckpoint } from '../src/services/createCliCheckpoint';
import { unavailableGit } from '../src/services/gitCapture';
test.each(['', '調査中\n続きはこちら'])('C9-03: builds a checkpoint from explicit metadata with no editor claim', note => {
  const input = { workspaceUri: 'file:///project', workspaceName: 'project', note, nextAction: '', git: unavailableGit('NOT_ALLOWED') };
  const id = 'a9b2c3d4-1111-4222-8333-123456789abc';
  expect(createCliCheckpoint(input, () => new Date('2026-11-03T00:00:00Z'), () => id)).toEqual({
    ...input, id, schemaVersion: 2, createdAt: '2026-11-03T00:00:00.000Z', title: 'project — 2026-11-03T00:00:00.000Z',
    editorCapture: 'not-connected', openFiles: [], activeFileUri: null, cursor: null, unsavedFileUris: [],
  });
});
