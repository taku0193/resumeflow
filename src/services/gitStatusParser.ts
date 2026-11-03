import type { CliGitChange } from '../models/cliCheckpoint';
export function parseGitStatus(output: string): CliGitChange[] {
  if (output === '') return [];
  const records = output.split('\0').slice(0, -1);
  const changes: CliGitChange[] = [];
  for (let index = 0; index < records.length; index++) {
    const record = records[index]!;
    const status = record.slice(0, 2);
    const originalPath = /[RC]/.test(status) ? records[++index] ?? null : null;
    changes.push({ path: record.slice(3), status, originalPath });
  }
  return changes;
}
