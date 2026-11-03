import type { CliCheckpoint, CliCollection } from './cliCheckpoint';
import { assertCheckpointCollection } from './checkpointSchema';
import { CheckpointError } from './checkpointError';

function requireFormat(condition: unknown): asserts condition {
  if (!condition) throw new CheckpointError('INVALID_SCHEMA', 'CLI チェックポイントの形式が正しくありません。');
}
function object(value: unknown): asserts value is Record<string, unknown> {
  requireFormat(typeof value === 'object' && value !== null && !Array.isArray(value));
}

export function assertCliCollection(collection: CliCollection): void {
  object(collection);
  requireFormat(collection.schemaVersion === 2 && Object.keys(collection).length === 2 && Array.isArray(collection.checkpoints));
  const legacy = collection.checkpoints.map((entry: CliCheckpoint) => {
    object(entry);
    const { schemaVersion, editorCapture, git, ...base } = entry;
    requireFormat(schemaVersion === 2 && (editorCapture === 'not-connected' || editorCapture === 'legacy-unknown'));
    if (editorCapture === 'not-connected') {
      requireFormat(Array.isArray(entry.openFiles) && entry.openFiles.length === 0
        && Array.isArray(entry.unsavedFileUris) && entry.unsavedFileUris.length === 0
        && entry.activeFileUri === null && entry.cursor === null);
    }
    object(git);
    requireFormat(Array.isArray(git.changes));
    const changes = Array.from(git.changes, change => {
      object(change);
      requireFormat(Object.keys(change).length === 3 && Object.hasOwn(change, 'originalPath')
        && (change.originalPath === null || typeof change.originalPath === 'string'));
      return { ...change, originalPath: undefined };
    }).map(({ originalPath: _ignored, ...change }) => change);
    return { ...base, schemaVersion: 1, git: { ...git, changes } };
  });
  // Reuse all v1 field, value, URI and uniqueness constraints.
  assertCheckpointCollection({ schemaVersion: 1, checkpoints: legacy });
}

export function parseCliCollection(contents: string): CliCollection {
  let value: unknown;
  try { value = JSON.parse(contents); }
  catch { throw new CheckpointError('INVALID_JSON', 'チェックポイントの JSON を読み込めません。元データは変更していません。'); }
  object(value);
  assertCliCollection(value as unknown as CliCollection);
  return value as unknown as CliCollection;
}
