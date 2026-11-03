import type { CheckpointStorage } from '../src/services/checkpointStore';

export class MemoryStorage implements CheckpointStorage {
  constructor(public contents?: string) {}

  async read(): Promise<string | undefined> {
    return this.contents;
  }

  async writeAtomic(contents: string): Promise<void> {
    this.contents = contents;
  }
}
