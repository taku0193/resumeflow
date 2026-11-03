import { expect, test, vi } from 'vitest';
import { runCli } from '../src/cli/run';
import { cliContextFixture } from './cliContextFixture';
import { CheckpointError } from '../src/models/checkpointError';
import { cliCheckpointFixture } from '../src/test/fixtures/cliCheckpointFixture';
test('C9-04a: help returns usage without creating any project or storage context', async () => {
  const factory = vi.fn(async () => cliContextFixture());
  const result = await runCli(['help'], factory);
  expect(result.stdout).toContain('save');
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe('');
  expect(factory).not.toHaveBeenCalled();
});
test('C9-04b: save waits for persistence and returns one JSON result without running unapproved Git', async () => {
  const context = cliContextFixture();
  const result = await runCli(['save', '--note', 'メモ\n次', '--format', 'json'], async () => context);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe('');
  expect(result.stdout).toContain('"ok":true');
  const data = JSON.parse(result.stdout).data;
  expect(data).toMatchObject({ note: 'メモ\n次', editorCapture: 'not-connected', git: { error: 'NOT_ALLOWED' } });
  expect((await context.store.load()).checkpoints).toEqual([data]);
  expect(context.gitRunner.run).not.toHaveBeenCalled();
});
test('C9-04c: storage failure returns stderr with no success and no native data', async () => {
  const context = cliContextFixture();
  context.store.append = vi.fn(async () => { throw new CheckpointError('WRITE_FAILED', '保存できません。', { cause: new Error('SENSITIVE_BODY') }); });
  const pending = runCli(['save', '--format', 'json'], async () => context);
  await expect(pending).resolves.toMatchObject({ exitCode: 1, stdout: '' });
  const result = await pending;
  expect(result.exitCode).toBe(1);
  expect(result.stdout).toBe('');
  expect(JSON.parse(result.stderr)).toMatchObject({ ok: false, error: { code: 'WRITE_FAILED' } });
  expect(result.stderr).not.toContain('SENSITIVE_BODY');
});
test('C9-04c: usage errors exit2 without accessing data', async () => {
  const factory = vi.fn(async () => cliContextFixture());
  const pending = runCli(['save', '--unknown'], factory);
  await expect(pending).resolves.toMatchObject({ exitCode: 2, stdout: '' });
  const result = await pending;
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe('');
  expect(JSON.parse(result.stderr).error.code).toBe('USAGE');
  expect(factory).not.toHaveBeenCalled();
});
test('C10-05: list/show/context read current project data without saving or executing Git', async () => {
  const context = cliContextFixture();
  const checkpoint = cliCheckpointFixture({ workspaceUri: context.project.uri });
  await context.store.append(checkpoint);
  const append = vi.spyOn(context.store, 'append');
  const factory = async () => context;
  const list = await runCli(['list', '--format', 'json'], factory);
  expect(list.exitCode).toBe(0);
  expect(JSON.parse(list.stdout).data).toEqual([checkpoint]);
  const show = await runCli(['show', checkpoint.id, '--format', 'json'], factory);
  expect(JSON.parse(show.stdout).data).toEqual(checkpoint);
  const markdown = await runCli(['context', checkpoint.id], factory);
  expect(markdown.stdout).toContain('再開用コンテキスト');
  expect(append).not.toHaveBeenCalled();
  expect(context.gitRunner.run).not.toHaveBeenCalled();
});
test('C10-05: an empty project is a successful empty list', async () => {
  const result = await runCli(['list'], async () => cliContextFixture());
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('ありません');
});
test('C13-02: a project name containing a newline cannot add fake list rows', async () => {
  const context = cliContextFixture();
  await context.store.append(cliCheckpointFixture({ workspaceUri: context.project.uri, workspaceName: 'project\nFAKE_ROW' }));
  const result = await runCli(['list'], async () => context);
  expect(result.exitCode).toBe(0);
  expect(result.stdout.trimEnd().split('\n')).toHaveLength(1);
  expect(result.stdout).toContain('project\\nFAKE_ROW');
});
