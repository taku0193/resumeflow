import type { CliCheckpoint, CliCollection } from '../models/cliCheckpoint';
import { assertCliCollection, parseCliCollection } from '../models/cliSchema';
import type { CheckpointStorage } from './checkpointStore';
import { JsonCollectionStore } from './jsonCollectionStore';
import { CliError } from '../models/cliError';

export class CliCheckpointStore extends JsonCollectionStore<CliCollection> {
  constructor(storage: CheckpointStorage) {
    super(storage, { empty: () => ({ schemaVersion: 2, checkpoints: [] }), parse: parseCliCollection, validate: assertCliCollection });
  }
  async append(checkpoint: CliCheckpoint): Promise<void> {
    const current = await this.load();
    requireWritable(current);
    await this.save({ schemaVersion: 2, checkpoints: [...current.checkpoints, checkpoint] });
  }
}

export function requireWritable(collection: CliCollection): void {
  if (collection.schemaVersion === 1) {
    throw new CliError('LEGACY_READ_ONLY', 'スキーマ1は読取専用です。新しい --data-dir を指定してください。');
  }
}
