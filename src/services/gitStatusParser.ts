import type { CliGitChange } from '../models/cliCheckpoint';
export function parseGitStatus(output: string): CliGitChange[] {
  if (output === '') return [];
  return output.split('\0').slice(0, -1).map(record => ({
    path: record.slice(3), status: record.slice(0, 2), originalPath: null,
  }));
}
