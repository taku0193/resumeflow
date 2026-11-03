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

test('P1-10b: rename and copy preserve destination and original as separate paths', () => {
  expect(parseGitStatus('R  new name.ts\0old name.ts\0C  copied.ts\0source.ts\0')).toEqual([
    { path: 'new name.ts', status: 'R ', originalPath: 'old name.ts' },
    { path: 'copied.ts', status: 'C ', originalPath: 'source.ts' },
  ]);
});

test.each(['日本語 file.ts', ' leading and trailing ', 'two\nlines.ts', '"quoted".ts', '--name;$(nothing).ts'])('P1-11 regression: preserves the literal path %j', path => {
  expect(parseGitStatus(`?? ${path}\0`)).toEqual([{ path, status: '??', originalPath: null }]);
});

test.each([' M truncated', 'XX bad\0', ' M \0', ' M good\0\0', 'R  new\0', 'R  new\0\0', '  unchanged\0', '??missing-space\0'])('P1-10c: rejects malformed or truncated porcelain %j', output => {
  expect(() => parseGitStatus(output)).toThrow();
});
