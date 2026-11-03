import type { CheckpointStorage } from './checkpointStore';
import { CheckpointError } from '../models/checkpointError';

export interface CollectionCodec<T> {
  empty(): T;
  parse(contents: string): T;
  validate(collection: T): void;
}

/** Shared I/O/error handling; codecs own schema and compatibility decisions. */
export class JsonCollectionStore<T> {
  constructor(private readonly storage: CheckpointStorage, private readonly codec: CollectionCodec<T>) {}

  async load(): Promise<T> {
    let contents: string | undefined;
    try { contents = await this.storage.read(); }
    catch (cause) {
      throw new CheckpointError('READ_FAILED', 'チェックポイントを読み込めません。保存先へのアクセスを確認してください。', { cause });
    }
    return contents === undefined ? this.codec.empty() : this.codec.parse(contents);
  }

  async save(collection: T): Promise<void> {
    this.codec.validate(collection);
    try { await this.storage.writeAtomic(JSON.stringify(collection, null, 2)); }
    catch (cause) {
      throw new CheckpointError('WRITE_FAILED', 'チェックポイントを保存できません。空き容量とアクセス権を確認してください。', { cause });
    }
  }
}
