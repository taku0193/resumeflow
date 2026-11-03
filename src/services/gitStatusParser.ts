import type { CliGitChange } from '../models/cliCheckpoint';
import { CliError } from '../models/cliError';
function invalid(): never { throw new CliError('INVALID_GIT_OUTPUT', 'Git の状態情報を解析できません。'); }
export function parseGitStatus(output: string): CliGitChange[] {
  if (output === '') return [];
  if (!output.endsWith('\0')) invalid();
  const records = output.split('\0').slice(0, -1);
  const changes: CliGitChange[] = [];
  for (let index = 0; index < records.length; index++) {
    const record = records[index]!;
    const status = record.slice(0, 2);
    if (record.length < 4 || record[2] !== ' '
      || !(status === '??' || status === '!!' || (/^[ MADRCUT]{2}$/.test(status) && status !== '  '))) invalid();
    const originalPath = /[RC]/.test(status) ? records[++index] ?? null : null;
    if (/[RC]/.test(status) && !originalPath) invalid();
    changes.push({ path: record.slice(3), status, originalPath });
  }
  return changes;
}
