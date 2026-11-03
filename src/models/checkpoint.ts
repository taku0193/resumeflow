export interface CursorPosition {
  line: number;
  character: number;
}

export interface GitChange {
  path: string;
  status: string;
}

export interface GitSnapshot {
  available: boolean;
  repoRootUri: string | null;
  branch: string | null;
  headCommit: string | null;
  changes: GitChange[];
  error: string | null;
}

export interface Checkpoint {
  id: string;
  schemaVersion: 1;
  createdAt: string;
  title: string;
  workspaceUri: string;
  workspaceName: string;
  note: string;
  nextAction: string;
  openFiles: string[];
  activeFileUri: string | null;
  cursor: CursorPosition | null;
  unsavedFileUris: string[];
  git: GitSnapshot;
}

export interface CheckpointCollection {
  schemaVersion: 1;
  checkpoints: Checkpoint[];
}
