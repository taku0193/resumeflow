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

export function assertCheckpointCollection(value: unknown): asserts value is CheckpointCollection {
  const collection = record(value, ['schemaVersion', 'checkpoints'], 'data');
  requireSchema(collection.schemaVersion === 1, 'schemaVersion');
  requireSchema(Array.isArray(collection.checkpoints), 'checkpoints');
}
