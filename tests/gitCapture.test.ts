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

test.each([
  [new GitCommandError('GIT_NOT_INSTALLED'), 'GIT_NOT_INSTALLED'],
  [new GitCommandError('GIT_FAILED', 128), 'NOT_A_REPOSITORY'],
  [new GitCommandError('GIT_TIMEOUT'), 'GIT_TIMEOUT'],
  [new GitCommandError('GIT_OUTPUT_LIMIT'), 'GIT_OUTPUT_LIMIT'],
  [new Error('SENSITIVE_NATIVE_MESSAGE'), 'GIT_FAILED'],
])('P1-12b: acquisition failure yields a concise state and allows later saving', async (error, code) => {
  const git = runner();
  git.run.mockRejectedValueOnce(error);
  await expect(captureGit(root, true, git)).resolves.toMatchObject({ available: false, error: code, changes: [] });
});

test.each(['detached', 'unborn'])('P1-12c: represents %s without failing the capture', async state => {
  const git = runner();
  const original = git.run.getMockImplementation()!;
  git.run.mockImplementation(async (directory, args) => {
    if ((state === 'detached' && args[0] === 'symbolic-ref') || (state === 'unborn' && args.includes('--verify'))) {
      throw new GitCommandError('GIT_FAILED', 1);
    }
    return original(directory, args);
  });
  expect(await captureGit(root, true, git)).toMatchObject({
    available: true, branch: state === 'detached' ? null : 'main', headCommit: state === 'unborn' ? null : sha, error: null,
  });
});

test.each(['root', 'sha', 'status'])('P1-12d: rejects invalid %s output without persisting it', async field => {
  const git = runner();
  const original = git.run.getMockImplementation()!;
  git.run.mockImplementation(async (directory, args) => {
    if (field === 'root' && args.includes('--show-toplevel')) return 'not-absolute\n';
    if (field === 'sha' && args.includes('--verify')) return 'not-a-sha\n';
    if (field === 'status' && args[0] === 'status') return 'truncated';
    return original(directory, args);
  });
  expect(await captureGit(root, true, git)).toMatchObject({ available: false, error: 'INVALID_GIT_OUTPUT' });
});
