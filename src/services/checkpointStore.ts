import type { Checkpoint, CheckpointCollection } from '../models/checkpoint';
import { assertCheckpointCollection, parseCheckpointCollection } from '../models/checkpointSchema';
import { JsonCollectionStore } from './jsonCollectionStore';

/** I/O boundary: undefined means the data file does not exist. */
export interface CheckpointStorage {
  read(): Promise<string | undefined>;
  writeAtomic(contents: string): Promise<void>;
}

export class CheckpointStore extends JsonCollectionStore<CheckpointCollection> {
  constructor(storage: CheckpointStorage) {
    super(storage, {
      empty: () => ({ schemaVersion: 1, checkpoints: [] }),
      parse: parseCheckpointCollection,
      validate: assertCheckpointCollection,
    });
  }

  async append(checkpoint: Checkpoint): Promise<void> {
    const current = await this.load();
    const updated: CheckpointCollection = {
      schemaVersion: 1,
      checkpoints: [...current.checkpoints, checkpoint],
    };
    await this.save(updated);
  }
}
