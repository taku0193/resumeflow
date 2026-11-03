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
