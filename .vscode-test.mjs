import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@vscode/test-cli';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const testRoot = join(projectRoot, '.test-data');
mkdirSync(testRoot, { recursive: true });
const runRoot = mkdtempSync(join(testRoot, 'run-'));
const userData = join(runRoot, 'user-data');
const workspace = join(runRoot, 'workspace');
mkdirSync(workspace);
mkdirSync(join(userData, 'User'), { recursive: true });
writeFileSync(join(userData, 'User', 'settings.json'), JSON.stringify({
  'telemetry.telemetryLevel': 'off',
  'update.mode': 'none',
  'extensions.autoUpdate': false,
  'extensions.autoCheckUpdates': false,
  'workbench.startupEditor': 'none',
}));

export default defineConfig({
  files: 'dist/test/**/*.test.js',
  workspaceFolder: workspace,
  ...(process.env.VSCODE_EXECUTABLE_PATH
    ? { useInstallation: { fromPath: process.env.VSCODE_EXECUTABLE_PATH } }
    : { version: 'stable' }),
  launchArgs: [
    '--disable-extensions',
    '--disable-workspace-trust',
    '--skip-welcome',
    '--skip-release-notes',
    `--user-data-dir=${userData}`,
    `--extensions-dir=${join(runRoot, 'extensions')}`,
  ],
  mocha: { ui: 'tdd', timeout: 15000 },
});
