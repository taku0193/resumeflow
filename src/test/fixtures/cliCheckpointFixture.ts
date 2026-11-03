import type { CliCheckpoint } from '../../models/cliCheckpoint';
import { checkpointFixture } from './checkpointFixture';
export function cliCheckpointFixture(overrides: Partial<CliCheckpoint> = {}): CliCheckpoint {
  const legacy = checkpointFixture();
  return {
    ...legacy, schemaVersion: 2, editorCapture: 'not-connected',
    openFiles: [], activeFileUri: null, cursor: null, unsavedFileUris: [],
    git: { ...legacy.git, changes: [{ path: 'new name.ts', status: 'R ', originalPath: 'old name.ts' }] },
    ...overrides,
  };
}
