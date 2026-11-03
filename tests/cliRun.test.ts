import { expect, test, vi } from 'vitest';
import { runCli } from '../src/cli/run';
import { cliContextFixture } from './cliContextFixture';
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
