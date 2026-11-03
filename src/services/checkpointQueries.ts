import type { CliCheckpoint, CliCollection } from '../models/cliCheckpoint';
import { CliError } from '../models/cliError';
export function listProjectCheckpoints(collection: CliCollection, workspaceUri: string): CliCheckpoint[] {
  return collection.checkpoints.filter(checkpoint => checkpoint.workspaceUri === workspaceUri)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.id.localeCompare(right.id));
}
export function findProjectCheckpoint(collection: CliCollection, id: string, workspaceUri: string): CliCheckpoint {
  const checkpoint = collection.checkpoints.find(entry => entry.id.toLowerCase() === id.toLowerCase());
  if (!checkpoint) throw new CliError('NOT_FOUND', 'チェックポイントが見つかりません。');
  if (checkpoint.workspaceUri !== workspaceUri) throw new CliError('PROJECT_MISMATCH', '別のプロジェクトの記録です。--project を確認してください。');
  return checkpoint;
}
