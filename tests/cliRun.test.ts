import { expect, test, vi } from 'vitest';
import { runCli } from '../src/cli/run';
import { cliContextFixture } from './cliContextFixture';
import { CheckpointError } from '../src/models/checkpointError';
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
  const result = await runCli(['save', '--format', 'json'], async () => context);
  expect(result.exitCode).toBe(1);
  expect(result.stdout).toBe('');
  expect(JSON.parse(result.stderr)).toMatchObject({ ok: false, error: { code: 'WRITE_FAILED' } });
  expect(result.stderr).not.toContain('SENSITIVE_BODY');
});
test('C9-04c: usage errors exit2 without accessing data', async () => {
  const factory = vi.fn(async () => cliContextFixture());
  const result = await runCli(['save', '--unknown'], factory);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe('');
  expect(JSON.parse(result.stderr).error.code).toBe('USAGE');
  expect(factory).not.toHaveBeenCalled();
});
