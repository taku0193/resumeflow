import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node', allowOnly: false, passWithNoTests: false,
    include: ['tests/nodeCheckpointStorage.test.ts', 'tests/nodeCliContext.test.ts'],
  },
});
