import type { Checkpoint, CheckpointCollection } from '../models/checkpoint';
import { assertCheckpointCollection } from '../models/checkpointSchema';

/** I/O boundary: undefined means the data file does not exist. */
export interface CheckpointStorage {
  read(): Promise<string | undefined>;
  writeAtomic(contents: string): Promise<void>;
}

export class CheckpointStore {
  constructor(private readonly storage: CheckpointStorage) {}

  async load(): Promise<CheckpointCollection> {
    const contents = await this.storage.read();
    if (contents === undefined) return { schemaVersion: 1, checkpoints: [] };
    const collection: unknown = JSON.parse(contents);
    assertCheckpointCollection(collection);
    return collection;
  }

  async append(checkpoint: Checkpoint): Promise<void> {
    const current = await this.load();
    const updated: CheckpointCollection = {
      schemaVersion: 1,
      checkpoints: [...current.checkpoints, checkpoint],
    };
    await this.storage.writeAtomic(JSON.stringify(updated, null, 2));
  }
}
