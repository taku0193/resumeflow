import { expect, test } from 'vitest';
import { parseCliArguments } from '../src/cli/arguments';
test('C9-01: parses save metadata without changing Japanese, newlines or empty strings', () => {
  expect(parseCliArguments(['save', '--note', '調査中\n次を確認', '--next=', '--project', '/project', '--data-dir', '/data', '--allow-git', '--format', 'json'])).toMatchObject({
    command: 'save', note: '調査中\n次を確認', nextAction: '', project: '/project', dataDirectory: '/data', allowGit: true, format: 'json',
  });
  expect(parseCliArguments(['save'])).toMatchObject({ command: 'save', note: '', nextAction: '', allowGit: false });
  expect(parseCliArguments([]).command).toBe('help');
});
test.each([
  ['erase'], ['save', 'extra'], ['save', '--unknown'], ['save', '--note'],
  ['save', '--format', 'xml'], ['save', '--format', 'markdown'], ['save', '--note=a', '--note=b'],
  ['help', '--note', 'secret'], ['save', '--project='], ['save', '--data-dir='],
])('C9-02: rejects invalid or ambiguous arguments %j as usage errors', (...args) => {
  let error: unknown;
  try { parseCliArguments(args); } catch (caught) { error = caught; }
  expect(error).toMatchObject({ code: 'USAGE', usage: true });
});
test('C10-04: parses read commands with exact UUIDs and context default Markdown', () => {
  const id = 'a9b2c3d4-1111-4222-8333-123456789abc';
  expect(() => parseCliArguments(['list'])).not.toThrow();
  expect(parseCliArguments(['list']).command).toBe('list');
  expect(parseCliArguments(['show', id])).toMatchObject({ command: 'show', id, format: 'text' });
  expect(parseCliArguments(['context', id])).toMatchObject({ command: 'context', id, format: 'markdown' });
  expect(() => parseCliArguments(['context', 'bad-id'])).toThrow();
  expect(() => parseCliArguments(['list', '--allow-git'])).toThrow();
});
