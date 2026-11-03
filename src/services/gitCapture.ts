import type { CliGitSnapshot } from '../models/cliCheckpoint';
import { pathToFileURL } from 'node:url';
import { parseGitStatus } from './gitStatusParser';
export interface GitRunner { run(directory: string, args: readonly string[]): Promise<string> }
export class GitCommandError extends Error {
  constructor(readonly code: string, readonly exitCode?: number) { super('Git metadata command failed'); }
}
export function unavailableGit(error: string): CliGitSnapshot {
  return { available: false, repoRootUri: null, branch: null, headCommit: null, changes: [], error };
}
export async function captureGit(directory: string, allowed: boolean, runner: GitRunner): Promise<CliGitSnapshot> {
  if (!allowed) return unavailableGit('NOT_ALLOWED');
  const line = (value: string) => value.endsWith('\n') ? value.slice(0, -1) : value;
  const root = line(await runner.run(directory, ['rev-parse', '--show-toplevel']));
  const branch = line(await runner.run(directory, ['symbolic-ref', '--quiet', '--short', 'HEAD']));
  const headCommit = line(await runner.run(directory, ['rev-parse', '--verify', '--quiet', 'HEAD']));
  const changes = parseGitStatus(await runner.run(directory, ['status', '--porcelain=v1', '-z', '--untracked-files=all']));
  return { available: true, repoRootUri: pathToFileURL(root).toString(), branch, headCommit, changes, error: null };
}
