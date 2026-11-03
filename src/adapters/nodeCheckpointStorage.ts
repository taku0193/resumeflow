import type { CheckpointStorage } from '../services/checkpointStore';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { decodeCheckpointText } from '../models/checkpointEncoding';

export class NodeCheckpointStorage implements CheckpointStorage {
  constructor(readonly directory: string) {}
  async read(): Promise<string | undefined> {
    try { return decodeCheckpointText(await readFile(join(this.directory, 'checkpoints.json'))); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
  }
  async writeAtomic(contents: string): Promise<void> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const temporary = join(this.directory, `checkpoints.json.${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, contents, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      await rename(temporary, join(this.directory, 'checkpoints.json'));
    } finally {
      try { await unlink(temporary); } catch { /* Never mask the write failure. */ }
    }
  }
}
