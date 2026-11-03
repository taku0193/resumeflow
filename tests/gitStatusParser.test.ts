import { expect, test } from 'vitest';
import { parseGitStatus } from '../src/services/gitStatusParser';

test('P1-10a: parses ordinary, staged and untracked NUL records', () => {
  expect(parseGitStatus(' M src/a.ts\0A  src/b.ts\0?? new.txt\0')).toEqual([
    { path: 'src/a.ts', status: ' M', originalPath: null },
    { path: 'src/b.ts', status: 'A ', originalPath: null },
    { path: 'new.txt', status: '??', originalPath: null },
  ]);
  expect(parseGitStatus('')).toEqual([]);
});
