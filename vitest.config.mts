import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    allowOnly: false,
    passWithNoTests: false,
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/nodeCheckpointStorage.test.ts', 'tests/nodeCliContext.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/services/**/*.ts', 'src/models/**/*.ts'],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: { statements: 80, branches: 80 },
    },
  },
});
