import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { NodeGitRunner } from '../adapters/nodeGitRunner';
import { captureGit } from '../services/gitCapture';
const exec = promisify(execFile);

test('real Git: unborn, rename metadata, unchanged index/source and detached HEAD', async () => {
  const root = await mkdtemp(join(tmpdir(), 'resumeflow-git-'));
  const repo = join(root, 'repo');
  const hooks = join(root, 'empty-hooks');
  await mkdir(repo); await mkdir(hooks);
  // Git mutations here prepare synthetic fixtures only; product code is read-only.
  const git = (args: string[]) => exec('git', [
    '-c', `core.hooksPath=${hooks}`, '-c', 'core.fsmonitor=false', '-c', 'commit.gpgsign=false',
    '-c', 'user.name=ResumeFlow Test', '-c', 'user.email=test@example.invalid', ...args,
  ], { cwd: repo, timeout: 5000 });
  try {
    await git(['init', '-b', 'main']);
    const runner = new NodeGitRunner();
    assert.equal((await captureGit(repo, true, runner)).headCommit, null);
    await writeFile(join(repo, 'old name.txt'), 'synthetic fixture body\n');
    await git(['add', '.']); await git(['commit', '-m', 'fixture']);
    await rename(join(repo, 'old name.txt'), join(repo, '日本語 new.txt'));
    await git(['add', '-A']);
    const index = await readFile(join(repo, '.git', 'index'));
    const state = await captureGit(repo, true, runner);
    assert.equal(state.available, true);
    assert.equal(state.branch, 'main');
    assert.deepEqual(state.changes, [{ path: '日本語 new.txt', status: 'R ', originalPath: 'old name.txt' }]);
    assert.deepEqual(await readFile(join(repo, '.git', 'index')), index);
    assert.equal(await readFile(join(repo, '日本語 new.txt'), 'utf8'), 'synthetic fixture body\n');
    await git(['checkout', '--detach']);
    const detached = await captureGit(repo, true, runner);
    assert.equal(detached.available, true);
    assert.equal(detached.branch, null);
    assert.ok(detached.headCommit);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('real Git: nonrepository and disabled collection remain nonfatal', async () => {
  const root = await mkdtemp(join(tmpdir(), 'resumeflow-no-git-'));
  try {
    const runner = new NodeGitRunner();
    assert.equal((await captureGit(root, true, runner)).error, 'NOT_A_REPOSITORY');
    assert.equal((await captureGit(root, false, runner)).error, 'NOT_ALLOWED');
  } finally { await rm(root, { recursive: true, force: true }); }
});
