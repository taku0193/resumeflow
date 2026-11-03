import type { CheckpointStorage } from '../services/checkpointStore';
import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { decodeCheckpointText } from '../models/checkpointEncoding';
import { CliError } from '../models/cliError';

export class NodeCheckpointStorage implements CheckpointStorage {
  constructor(readonly directory: string) {}
  async withLock<T>(action: () => Promise<T>): Promise<T> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const path = join(this.directory, '.write.lock');
    let handle;
    try { handle = await open(path, 'wx', 0o600); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new CliError('DATA_BUSY', '別の保存処理が使用中です。終了後に再実行してください。');
      }
      throw error;
    }
    try { return await action(); }
    finally {
      try { await handle.close(); } finally {
        try { await unlink(path); } catch { /* Leave recovery to the user if cleanup fails. */ }
      }
    }
  }
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
