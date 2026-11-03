import type { CliCheckpoint, CliCollection } from '../models/cliCheckpoint';
export function listProjectCheckpoints(collection: CliCollection, workspaceUri: string): CliCheckpoint[] {
  return collection.checkpoints.filter(checkpoint => checkpoint.workspaceUri === workspaceUri)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.id.localeCompare(right.id));
}
