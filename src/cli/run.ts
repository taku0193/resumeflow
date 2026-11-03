import { parseCliArguments, type CliOptions } from './arguments';
import type { CliCheckpointStore } from '../services/cliCheckpointStore';
import type { GitRunner } from '../services/gitCapture';
import { captureGit } from '../services/gitCapture';
import { createCliCheckpoint } from '../services/createCliCheckpoint';
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
  const context = await factory(options);
  const checkpoint = await context.withLock(async () => {
    const git = await captureGit(context.project.path, options.allowGit, context.gitRunner);
    const record = createCliCheckpoint({
      workspaceUri: context.project.uri, workspaceName: context.project.name,
      note: options.note, nextAction: options.nextAction, git,
    }, context.clock, context.idGenerator);
    await context.store.append(record);
    return record;
  });
  return {
    exitCode: 0, stderr: '', stdout: options.format === 'json'
      ? `${JSON.stringify({ ok: true, data: checkpoint })}\n` : `保存しました: ${checkpoint.id}\n`,
  };
}
