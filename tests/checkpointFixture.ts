import type { Checkpoint } from '../src/models/checkpoint';

export function checkpointFixture(overrides: Partial<Checkpoint> = {}): Checkpoint {
  return {
    id: 'a9b2c3d4-1111-4222-8333-123456789abc',
    schemaVersion: 1,
    createdAt: '2026-11-03T00:00:00.000Z',
    title: 'my-app — 2026-11-03 09:00',
    workspaceUri: 'file:///projects/my-app',
    workspaceName: 'my-app',
    note: 'API レスポンス形式を調査中\n期待値の確認が必要',
    nextAction: 'テストの期待値を確認する',
    openFiles: ['file:///projects/my-app/src/api.ts'],
    activeFileUri: 'file:///projects/my-app/src/api.ts',
    cursor: { line: 42, character: 8 },
    unsavedFileUris: ['file:///projects/my-app/src/api.ts'],
    git: {
      available: true,
      repoRootUri: 'file:///projects/my-app',
      branch: 'feature/api',
      headCommit: '1234567890abcdef1234567890abcdef12345678',
      changes: [{ path: 'src/api.ts', status: ' M' }],
      error: null,
    },
    ...overrides,
  };
}
