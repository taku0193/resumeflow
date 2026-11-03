import { parseCliArguments, type CliOptions } from './arguments';
import type { CliCheckpointStore } from '../services/cliCheckpointStore';
import type { GitRunner } from '../services/gitCapture';
export interface CliContext {
  project: { path: string; uri: string; name: string };
  store: Pick<CliCheckpointStore, 'load' | 'append'>;
  withLock<T>(action: () => Promise<T>): Promise<T>;
  gitRunner: GitRunner;
  clock(): Date;
  idGenerator(): string;
}
export interface CliResult { exitCode: number; stdout: string; stderr: string }
export async function runCli(args: readonly string[], factory: (options: CliOptions) => Promise<CliContext>): Promise<CliResult> {
  const options = parseCliArguments(args);
  if (options.command === 'help') return { exitCode: 0, stderr: '', stdout: 'ResumeFlow\n  save [--note TEXT] [--next TEXT] [--allow-git]\n  help\n共通: --project DIR --data-dir DIR --format text|json\n' };
  return { exitCode: 0, stdout: '', stderr: '' };
}
