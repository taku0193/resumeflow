import { expect, test } from 'vitest';
import { renderContext } from '../src/services/contextMarkdown';
import { cliCheckpointFixture as fixture } from '../src/test/fixtures/cliCheckpointFixture';
test('C10-03: renders restart data, not agent state, with unavailable editor information', () => {
  const markdown = renderContext(fixture({ note: '調査を中断', nextAction: 'テストを確認' }));
  expect(markdown).toContain('調査を中断');
  expect(markdown).toContain('テストを確認');
  expect(markdown).toContain('未取得');
  expect(markdown).toContain('未保存編集がないという意味ではありません');
  expect(markdown).toContain('参照データ');
  expect(markdown).toContain('old name.ts');
  expect(renderContext(fixture({ editorCapture: 'legacy-unknown' }))).toContain('旧形式');
});
test('C10-03: saved fence delimiters and terminal control characters remain contained data', () => {
  const note = '```\nSAVED_TEXT\n```\n\u001b[31m';
  const markdown = renderContext(fixture({ note }));
  expect(markdown).toContain('````\n```\nSAVED_TEXT');
  expect(markdown).not.toContain('\u001b');
  expect(markdown).toContain('\\u001b[31m');
});
