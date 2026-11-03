import { parseCliArguments, type CliOptions } from './arguments';
import type { CliCheckpointStore } from '../services/cliCheckpointStore';
import type { GitRunner } from '../services/gitCapture';
import { captureGit } from '../services/gitCapture';
import { createCliCheckpoint } from '../services/createCliCheckpoint';
import { CliError } from '../models/cliError';
import { CheckpointError } from '../models/checkpointError';
import { findProjectCheckpoint, listProjectCheckpoints } from '../services/checkpointQueries';
import { displayText, renderContext } from '../services/contextMarkdown';
import { requireWritable } from '../services/cliCheckpointStore';
export interface CliContext {
  project: { path: string; uri: string; name: string };
  store: Pick<CliCheckpointStore, 'load' | 'append' | 'remove'>;
  withLock<T>(action: () => Promise<T>): Promise<T>;
  gitRunner: GitRunner;
  clock(): Date;
  idGenerator(): string;
  isInteractive: boolean;
  confirm(question: string): Promise<boolean>;
}
export interface CliResult { exitCode: number; stdout: string; stderr: string }
export async function runCli(args: readonly string[], factory: (options: CliOptions) => Promise<CliContext>): Promise<CliResult> {
  try {
    const options = parseCliArguments(args);
    if (options.command === 'help') return { exitCode: 0, stderr: '', stdout: 'ResumeFlow\n  save [--note TEXT] [--next TEXT] [--allow-git]\n  list\n  show UUID\n  context UUID\n  delete UUID [--yes]\n  help\n共通: --project DIR --data-dir DIR --format text|json\n' };
    const context = await factory(options);
    if (options.command === 'delete') {
      const collection = await context.store.load();
      requireWritable(collection);
      const target = findProjectCheckpoint(collection, options.id!, context.project.uri);
      if (!options.yes && !context.isInteractive) throw new CliError('CONFIRMATION_REQUIRED', '削除には対話確認、または明示の --yes が必要です。', true);
      const approved = options.yes || await context.confirm(`記録 ${target.id} を削除しますか？ [y/N] `);
      if (approved) await context.withLock(() => context.store.remove(target.id, context.project.uri));
      const data = { deleted: approved, id: target.id };
      return { exitCode: 0, stderr: '', stdout: options.format === 'json'
        ? `${JSON.stringify({ ok: true, data })}\n` : `${approved ? '削除しました' : 'キャンセルしました'}: ${target.id}\n` };
    }
    if (options.command !== 'save') {
      const collection = await context.store.load();
      const data = options.command === 'list' ? listProjectCheckpoints(collection, context.project.uri)
        : findProjectCheckpoint(collection, options.id!, context.project.uri);
      const text = Array.isArray(data) ? data.length === 0 ? 'チェックポイントはありません。\n'
        : data.map(entry => `${entry.id}\t${entry.createdAt}\t${displayText(entry.workspaceName).replace(/\n/g, '\\n').replace(/\t/g, '\\t')}`).join('\n') + '\n'
        : renderContext(data);
      return { exitCode: 0, stderr: '', stdout: options.format === 'json' ? `${JSON.stringify({ ok: true, data })}\n` : text };
    }
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
  } catch (error) {
    const known = error instanceof CliError || error instanceof CheckpointError;
    return {
      exitCode: error instanceof CliError && error.usage ? 2 : 1,
      stdout: '', stderr: `${JSON.stringify({ ok: false, error: {
        code: known ? error.code : 'OPERATION_FAILED', message: known ? error.message : '操作を完了できませんでした。',
      } })}\n`,
    };
  }
}
