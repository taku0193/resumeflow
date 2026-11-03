import type { CliCheckpoint, CliGitSnapshot } from '../models/cliCheckpoint';
export interface SaveInput { workspaceUri: string; workspaceName: string; note: string; nextAction: string; git: CliGitSnapshot }
export function createCliCheckpoint(input: SaveInput, clock: () => Date, idGenerator: () => string): CliCheckpoint {
  const createdAt = clock().toISOString();
  return {
    id: idGenerator(), schemaVersion: 2, createdAt,
    title: `${input.workspaceName} — ${createdAt}`,
    workspaceUri: input.workspaceUri, workspaceName: input.workspaceName,
    note: input.note, nextAction: input.nextAction, git: input.git,
    editorCapture: 'not-connected', openFiles: [], activeFileUri: null, cursor: null, unsavedFileUris: [],
  };
}
