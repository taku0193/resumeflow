import type { Checkpoint, GitSnapshot } from './checkpoint';

export interface CliGitChange { path: string; status: string; originalPath: string | null }
export interface CliGitSnapshot extends Omit<GitSnapshot, 'changes'> { changes: CliGitChange[] }
export interface CliCheckpoint extends Omit<Checkpoint, 'schemaVersion' | 'git'> {
  schemaVersion: 2;
  editorCapture: 'not-connected' | 'legacy-unknown';
  git: CliGitSnapshot;
}
/** v1 is normalized for display only; writers must reject it. */
export interface CliCollection { schemaVersion: 1 | 2; checkpoints: CliCheckpoint[] }
