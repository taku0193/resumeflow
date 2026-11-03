import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, vi } from 'vitest';
import { captureGit, GitCommandError } from '../src/services/gitCapture';
const root = resolve('/synthetic/repo');
const sha = 'a'.repeat(40);
function runner() {
  return { run: vi.fn(async (_directory: string, args: readonly string[]) => {
    if (args[0] === 'status') return ' M file.ts\0';
    if (args[0] === 'symbolic-ref') return 'main\n';
    return args.includes('--show-toplevel') ? `${root}\n` : `${sha}\n`;
  }) };
}
test('P1-12a: captures only root, branch, HEAD and porcelain metadata', async () => {
  const git = runner();
  expect(await captureGit(root, true, git)).toEqual({
    available: true, repoRootUri: pathToFileURL(root).toString(), branch: 'main', headCommit: sha,
    changes: [{ path: 'file.ts', status: ' M', originalPath: null }], error: null,
  });
  expect(git.run.mock.calls.map(([, args]) => args)).toEqual([
    ['rev-parse', '--show-toplevel'], ['symbolic-ref', '--quiet', '--short', 'HEAD'],
    ['rev-parse', '--verify', '--quiet', 'HEAD'], ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
  ]);
});
test('P1-13 regression: without explicit permission no Git command runs', async () => {
  const git = runner();
  expect(await captureGit(root, false, git)).toMatchObject({ available: false, error: 'NOT_ALLOWED' });
  expect(git.run).not.toHaveBeenCalled();
});
