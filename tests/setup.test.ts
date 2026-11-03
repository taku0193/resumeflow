import { expect, test } from 'vitest';

test('S0: Vitest can run without the VS Code runtime', () => {
  expect(typeof process.versions.node).toBe('string');
});
