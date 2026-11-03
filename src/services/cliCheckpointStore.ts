import type { CliCheckpoint, CliCollection } from '../models/cliCheckpoint';
import { assertCliCollection, parseCliCollection } from '../models/cliSchema';
import type { CheckpointStorage } from './checkpointStore';
import { JsonCollectionStore } from './jsonCollectionStore';
import { CliError } from '../models/cliError';
import { findProjectCheckpoint } from './checkpointQueries';

export class CliCheckpointStore extends JsonCollectionStore<CliCollection> {
  constructor(storage: CheckpointStorage) {
    super(storage, { empty: () => ({ schemaVersion: 2, checkpoints: [] }), parse: parseCliCollection, validate: assertCliCollection });
  }
  async append(checkpoint: CliCheckpoint): Promise<void> {
    const current = await this.load();
    requireWritable(current);
    await this.save({ schemaVersion: 2, checkpoints: [...current.checkpoints, checkpoint] });
  }
  async remove(id: string, workspaceUri: string): Promise<void> {
    const current = await this.load();
    requireWritable(current);
    const target = findProjectCheckpoint(current, id, workspaceUri);
    await this.save({ schemaVersion: 2, checkpoints: current.checkpoints.filter(record => record.id !== target.id) });
  }
}

export function requireWritable(collection: CliCollection): void {
  if (collection.schemaVersion === 1) {
    throw new CliError('LEGACY_READ_ONLY', 'スキーマ1は読取専用です。新しい --data-dir を指定してください。');
  }
}
