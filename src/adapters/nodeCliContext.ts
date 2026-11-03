import type { CliContext } from '../cli/run';
import type { CliOptions } from '../cli/arguments';
import { realpath, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { CliError } from '../models/cliError';
import { NodeCheckpointStorage } from './nodeCheckpointStorage';
import { NodeGitRunner } from './nodeGitRunner';
import { CliCheckpointStore } from '../services/cliCheckpointStore';
import { defaultDataDirectory } from '../services/cliPaths';
export async function createNodeCliContext(options: CliOptions): Promise<CliContext> {
  let path: string;
  try {
    path = await realpath(resolve(options.project ?? process.cwd()));
    if (!(await stat(path)).isDirectory()) throw new Error('not a directory');
  } catch { throw new CliError('INVALID_PROJECT', '存在するプロジェクトのディレクトリを指定してください。'); }
  const directory = options.dataDirectory === null ? defaultDataDirectory(process.platform, homedir()) : resolve(options.dataDirectory);
  const storage = new NodeCheckpointStorage(directory);
  return {
    project: { path, uri: pathToFileURL(path).toString(), name: basename(path) || path },
    store: new CliCheckpointStore(storage), withLock: action => storage.withLock(action),
    gitRunner: new NodeGitRunner(), clock: () => new Date(), idGenerator: randomUUID,
  };
}
