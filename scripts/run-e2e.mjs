import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ExTester, ReleaseQuality } from 'vscode-extension-tester';
import { packageForE2e, projectRoot } from './package-e2e.mjs';

// The user requested no local VS Code launch. Fail before any GUI setup.
if (process.env.GITHUB_ACTIONS !== 'true') {
  console.error('E2E は GitHub Actions の Xvfb 上で実行してください。ローカル VS Code は起動しません。');
  process.exit(1);
}

const testRoot = join(projectRoot, '.test-data/e2e');
await mkdir(testRoot, { recursive: true });
const runRoot = await mkdtemp(join(testRoot, 'run-'));
const workspace = join(runRoot, 'workspace');
await mkdir(workspace);
await writeFile(join(workspace, 'README.txt'), 'ResumeFlow E2E: synthetic test workspace only.\n');
const settingsPath = join(runRoot, 'settings.json');
await writeFile(settingsPath, JSON.stringify({
  'telemetry.telemetryLevel': 'off',
  'update.mode': 'none',
  'extensions.autoUpdate': false,
  'extensions.autoCheckUpdates': false,
  'workbench.startupEditor': 'none',
  'security.workspace.trust.enabled': false,
}));

// Pin the UI baseline to the newest version tested by ExTester 8.28.1.
// Extension Host integration tests independently exercise VS Code stable.
const vscodeVersion = process.env.RESUMEFLOW_VSCODE_VERSION || '1.140.0';
const tester = new ExTester(join(runRoot, 'resources'), ReleaseQuality.Stable, join(runRoot, 'extensions'));
const vsix = await packageForE2e(join(runRoot, 'resumeflow.vsix'));
await tester.downloadCode(vscodeVersion);
await tester.downloadChromeDriver(vscodeVersion);
await tester.installVsix({ vsixFile: vsix });
process.exitCode = await tester.runTests(['dist/e2e/**/*.test.js'], {
  vscodeVersion,
  resources: [workspace],
  settings: settingsPath,
  config: join(projectRoot, 'e2e.mocharc.json'),
});
