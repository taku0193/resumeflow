import { expect, test } from 'vitest';
import { parseCliArguments } from '../src/cli/arguments';
test('C9-01: parses save metadata without changing Japanese, newlines or empty strings', () => {
  expect(parseCliArguments(['save', '--note', '調査中\n次を確認', '--next=', '--project', '/project', '--data-dir', '/data', '--allow-git', '--format', 'json'])).toMatchObject({
    command: 'save', note: '調査中\n次を確認', nextAction: '', project: '/project', dataDirectory: '/data', allowGit: true, format: 'json',
  });
  expect(parseCliArguments(['save'])).toMatchObject({ command: 'save', note: '', nextAction: '', allowGit: false });
  expect(parseCliArguments([]).command).toBe('help');
});
