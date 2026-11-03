import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { cliFixture } from './fixture';
test('CLI-E2E-package: a packed installation runs outside the checkout without VS Code or dev tools', async () => {
  const fixture = await cliFixture();
  const root = resolve(__dirname, '../..');
  try {
    const npm = process.env.npm_execpath;
    assert.ok(npm, 'run this suite using npm run test:cli:e2e');
    const pack = spawnSync(process.execPath, [npm, 'pack', '--json', '--ignore-scripts', '--pack-destination', fixture.root,
      '--cache', join(fixture.root, 'cache')], { cwd: root, encoding: 'utf8', timeout: 30000 });
    assert.equal(pack.status, 0, pack.stderr);
    const metadata = JSON.parse(pack.stdout)[0];
    assert.ok(metadata.files.some((file: { path: string }) => file.path === 'dist/cli/main.js'));
    for (const file of metadata.files) assert.ok(!/(?:^|\/)(?:node_modules|tests?|cliTest|nodeTest|\.test-data)(?:\/|$)|checkpoints\.json/.test(file.path), file.path);
    const installation = join(fixture.root, 'installed');
    const install = spawnSync(process.execPath, [npm, 'install', '--offline', '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund',
      '--prefix', installation, '--cache', join(fixture.root, 'cache'), join(fixture.root, metadata.filename)], { encoding: 'utf8', timeout: 30000 });
    assert.equal(install.status, 0, install.stderr);
    const application = join(installation, 'node_modules/resumeflow');
    const manifest = JSON.parse(await readFile(join(application, 'package.json'), 'utf8'));
    assert.equal(manifest.bin.resumeflow, 'dist/cli/main.js');
    const entry = join(application, manifest.bin.resumeflow);
    assert.ok((await readFile(entry, 'utf8')).startsWith('#!/usr/bin/env node'));
    const saved = spawnSync(process.execPath, [entry, 'save', '--project', fixture.project, '--data-dir', fixture.data, '--format', 'json'], { cwd: fixture.other, encoding: 'utf8' });
    assert.equal(saved.status, 0, saved.stderr); assert.equal(JSON.parse(saved.stdout).ok, true);
    await assert.rejects(stat(join(installation, 'node_modules/vitest')), { code: 'ENOENT' });
    await assert.rejects(stat(join(installation, 'node_modules/vscode')), { code: 'ENOENT' });
    assert.ok((await readFile(join(application, 'skills/resumeflow-checkpoint/SKILL.md'), 'utf8')).includes('resumeflow-checkpoint'));
  } finally { await fixture.dispose(); }
});
