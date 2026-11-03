import type { CliGitSnapshot } from '../models/cliCheckpoint';
import { pathToFileURL } from 'node:url';
import { parseGitStatus } from './gitStatusParser';
import { CliError } from '../models/cliError';
import { isAbsolute } from 'node:path';
export interface GitRunner { run(directory: string, args: readonly string[]): Promise<string> }
export class GitCommandError extends Error {
  constructor(readonly code: string, readonly exitCode?: number) { super('Git metadata command failed'); }
}
export function unavailableGit(error: string): CliGitSnapshot {
  return { available: false, repoRootUri: null, branch: null, headCommit: null, changes: [], error };
}
export async function captureGit(directory: string, allowed: boolean, runner: GitRunner): Promise<CliGitSnapshot> {
  if (!allowed) return unavailableGit('NOT_ALLOWED');
  let detected = false;
  try {
  const line = (value: string) => value.endsWith('\n') ? value.slice(0, -1) : value;
  const optional = async (args: readonly string[]): Promise<string | null> => {
    try { return line(await runner.run(directory, args)); }
    catch (error) { if (error instanceof GitCommandError && error.exitCode === 1) return null; throw error; }
  };
  const root = line(await runner.run(directory, ['rev-parse', '--show-toplevel']));
  detected = true;
  const branch = await optional(['symbolic-ref', '--quiet', '--short', 'HEAD']);
  const headCommit = await optional(['rev-parse', '--verify', '--quiet', 'HEAD']);
  if (!isAbsolute(root) || (headCommit !== null && !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(headCommit))) {
    throw new CliError('INVALID_GIT_OUTPUT', 'Git の状態情報を解析できません。');
  }
  const changes = parseGitStatus(await runner.run(directory, ['status', '--porcelain=v1', '-z', '--untracked-files=all']));
  return { available: true, repoRootUri: pathToFileURL(root).toString(), branch, headCommit, changes, error: null };
  } catch (error) {
    if (error instanceof GitCommandError) {
      return unavailableGit(!detected && error.exitCode === 128 ? 'NOT_A_REPOSITORY' : error.code);
    }
    return unavailableGit(error instanceof CliError ? error.code : 'GIT_FAILED');
  }
}
