import type { Checkpoint, CheckpointCollection } from '../models/checkpoint';
import { assertCheckpointCollection, parseCheckpointCollection } from '../models/checkpointSchema';
import { CheckpointError } from '../models/checkpointError';

/** I/O boundary: undefined means the data file does not exist. */
export interface CheckpointStorage {
  read(): Promise<string | undefined>;
  writeAtomic(contents: string): Promise<void>;
}

export class CheckpointStore {
  constructor(private readonly storage: CheckpointStorage) {}

  async load(): Promise<CheckpointCollection> {
    let contents: string | undefined;
    try {
      contents = await this.storage.read();
    } catch (cause) {
      throw new CheckpointError('READ_FAILED', 'チェックポイントを読み込めません。保存先へのアクセスを確認してください。', { cause });
    }
    if (contents === undefined) return { schemaVersion: 1, checkpoints: [] };
    return parseCheckpointCollection(contents);
  }

  async append(checkpoint: Checkpoint): Promise<void> {
    const current = await this.load();
    const updated: CheckpointCollection = {
      schemaVersion: 1,
      checkpoints: [...current.checkpoints, checkpoint],
    };
    assertCheckpointCollection(updated);
    try {
      await this.storage.writeAtomic(JSON.stringify(updated, null, 2));
    } catch (cause) {
      throw new CheckpointError('WRITE_FAILED', 'チェックポイントを保存できません。空き容量とアクセス権を確認してください。', { cause });
    }
  }
}
