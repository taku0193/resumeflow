import type { CheckpointCollection } from './checkpoint';
import { CheckpointError } from './checkpointError';

function requireSchema(condition: boolean, field: string): asserts condition {
  if (!condition) {
    throw new CheckpointError('INVALID_SCHEMA', `チェックポイントデータの形式が正しくありません（${field}）。`);
  }
}

function record(value: unknown, keys: readonly string[], field: string): Record<string, unknown> {
  requireSchema(typeof value === 'object' && value !== null && !Array.isArray(value), field);
  requireSchema(Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), field);
  return value as Record<string, unknown>;
}

function stringArray(value: unknown, field: string): void {
  requireSchema(Array.isArray(value) && value.every(entry => typeof entry === 'string'), field);
}

function nullableString(value: unknown, field: string): void {
  requireSchema(value === null || typeof value === 'string', field);
}

function checkpointStructure(value: unknown, field: string): void {
  const checkpoint = record(value, [
    'id', 'schemaVersion', 'createdAt', 'title', 'workspaceUri', 'workspaceName',
    'note', 'nextAction', 'openFiles', 'activeFileUri', 'cursor', 'unsavedFileUris', 'git',
  ], field);
  requireSchema(checkpoint.schemaVersion === 1, `${field}.schemaVersion`);
  for (const key of ['id', 'createdAt', 'title', 'workspaceUri', 'workspaceName', 'note', 'nextAction']) {
    requireSchema(typeof checkpoint[key] === 'string', `${field}.${key}`);
  }
  stringArray(checkpoint.openFiles, `${field}.openFiles`);
  stringArray(checkpoint.unsavedFileUris, `${field}.unsavedFileUris`);
  nullableString(checkpoint.activeFileUri, `${field}.activeFileUri`);
  if (checkpoint.cursor !== null) {
    const cursor = record(checkpoint.cursor, ['line', 'character'], `${field}.cursor`);
    requireSchema(typeof cursor.line === 'number' && typeof cursor.character === 'number', `${field}.cursor`);
  }
  const git = record(checkpoint.git, [
    'available', 'repoRootUri', 'branch', 'headCommit', 'changes', 'error',
  ], `${field}.git`);
  requireSchema(typeof git.available === 'boolean', `${field}.git.available`);
  for (const key of ['repoRootUri', 'branch', 'headCommit', 'error']) {
    nullableString(git[key], `${field}.git.${key}`);
  }
  requireSchema(Array.isArray(git.changes), `${field}.git.changes`);
  git.changes.forEach((value, index) => {
    const changeField = `${field}.git.changes[${index}]`;
    const change = record(value, ['path', 'status'], changeField);
    requireSchema(typeof change.path === 'string' && typeof change.status === 'string', changeField);
  });
}

export function assertCheckpointCollection(value: unknown): asserts value is CheckpointCollection {
  const collection = record(value, ['schemaVersion', 'checkpoints'], 'data');
  requireSchema(collection.schemaVersion === 1, 'schemaVersion');
  requireSchema(Array.isArray(collection.checkpoints), 'checkpoints');
  collection.checkpoints.forEach((checkpoint, index) => checkpointStructure(checkpoint, `checkpoints[${index}]`));
}
