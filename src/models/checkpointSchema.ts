import type { Checkpoint, CheckpointCollection } from './checkpoint';
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
  requireSchema(Array.isArray(value) && Array.from(value).every(entry => typeof entry === 'string'), field);
}

function nullableString(value: unknown, field: string): void {
  requireSchema(value === null || typeof value === 'string', field);
}

function checkpointStructure(value: unknown, field: string): asserts value is Checkpoint {
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
  for (const [index, value] of git.changes.entries()) {
    const changeField = `${field}.git.changes[${index}]`;
    const change = record(value, ['path', 'status'], changeField);
    requireSchema(typeof change.path === 'string' && typeof change.status === 'string', changeField);
  }
}

function isFileUri(value: string): boolean {
  try {
    const uri = new URL(value);
    return value.startsWith('file://') && uri.protocol === 'file:'
      && uri.pathname.startsWith('/') && uri.search === '' && uri.hash === '';
  } catch {
    return false;
  }
}

function isUtcTimestamp(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|\+00:00)$/.test(value)) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 19) === value.slice(0, 19);
}

function checkpointValues(checkpoint: Checkpoint, field: string): void {
  requireSchema(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(checkpoint.id), `${field}.id`);
  requireSchema(isUtcTimestamp(checkpoint.createdAt), `${field}.createdAt`);
  requireSchema(isFileUri(checkpoint.workspaceUri), `${field}.workspaceUri`);
  requireSchema(checkpoint.openFiles.every(isFileUri), `${field}.openFiles`);
  requireSchema(checkpoint.unsavedFileUris.every(isFileUri), `${field}.unsavedFileUris`);
  requireSchema(new Set(checkpoint.openFiles).size === checkpoint.openFiles.length, `${field}.openFiles`);
  if (checkpoint.activeFileUri !== null) {
    requireSchema(checkpoint.openFiles.includes(checkpoint.activeFileUri), `${field}.activeFileUri`);
  }
  if (checkpoint.cursor !== null) {
    for (const coordinate of [checkpoint.cursor.line, checkpoint.cursor.character]) {
      requireSchema(Number.isSafeInteger(coordinate) && coordinate >= 0, `${field}.cursor`);
    }
  }
  if (checkpoint.git.repoRootUri !== null) {
    requireSchema(isFileUri(checkpoint.git.repoRootUri), `${field}.git.repoRootUri`);
  }
}

export function assertCheckpointCollection(value: unknown): asserts value is CheckpointCollection {
  const collection = record(value, ['schemaVersion', 'checkpoints'], 'data');
  requireSchema(collection.schemaVersion === 1, 'schemaVersion');
  requireSchema(Array.isArray(collection.checkpoints), 'checkpoints');
  const ids = new Set<string>();
  for (const [index, checkpoint] of collection.checkpoints.entries()) {
    const field = `checkpoints[${index}]`;
    checkpointStructure(checkpoint, field);
    checkpointValues(checkpoint, field);
    requireSchema(!ids.has(checkpoint.id), `${field}.id`);
    ids.add(checkpoint.id);
  }
}

export function parseCheckpointCollection(contents: string): CheckpointCollection {
  let collection: unknown;
  try {
    collection = JSON.parse(contents);
  } catch {
    // A native SyntaxError may quote the input. Do not expose stored text.
    throw new CheckpointError('INVALID_JSON', 'チェックポイントの JSON を読み込めません。元データは変更していません。');
  }
  assertCheckpointCollection(collection);
  return collection;
}
