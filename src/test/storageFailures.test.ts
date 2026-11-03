import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { VscodeCheckpointStorage } from '../adapters/vscodeCheckpointStorage';
import { CheckpointStore } from '../services/checkpointStore';
import { checkpointFixture } from './fixtures/checkpointFixture';

async function inTestDirectory(name: string, action: (directory: vscode.Uri) => Promise<void>): Promise<void> {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspace, 'runner must supply an isolated test workspace');
  const directory = vscode.Uri.joinPath(workspace.uri, name);
  await vscode.workspace.fs.createDirectory(directory);
  try {
    await action(directory);
  } finally {
    await vscode.workspace.fs.delete(directory, { recursive: true, useTrash: false });
  }
}

suite('S2: real storage failure protection', () => {
  for (const kind of ['json', 'utf8'] as const) {
    test(`keeps corrupt ${kind} bytes unchanged after load and append`, async () => {
      await inTestDirectory(`s2-corrupt-${kind}`, async directory => {
        const original = kind === 'json'
          ? Buffer.from('{"schemaVersion":1,"checkpoints":[', 'utf8')
          : Buffer.from(JSON.stringify({ schemaVersion: 1, checkpoints: [checkpointFixture({ note: 'UTF8_MARKER' })] }), 'utf8');
        if (kind === 'utf8') original[original.indexOf('UTF8_MARKER')] = 0xff;
        const dataFile = vscode.Uri.joinPath(directory, 'checkpoints.json');
        await vscode.workspace.fs.writeFile(dataFile, original);
        const store = new CheckpointStore(new VscodeCheckpointStorage(directory));
        const code = kind === 'json' ? 'INVALID_JSON' : 'READ_FAILED';

        await assert.rejects(store.load(), { code });
        await assert.rejects(store.append(checkpointFixture()), { code });
        assert.deepEqual(Buffer.from(await vscode.workspace.fs.readFile(dataFile)), original);
        const entries = await vscode.workspace.fs.readDirectory(directory);
        assert.deepEqual(entries.map(([name]) => name), ['checkpoints.json']);
      });
    });
  }

  test('cleans up a temporary file and preserves the target when replacement fails', async () => {
    await inTestDirectory('s2-failed-replacement', async directory => {
      const target = vscode.Uri.joinPath(directory, 'checkpoints.json');
      const marker = vscode.Uri.joinPath(target, 'original.txt');
      const original = Buffer.from('synthetic fixture: preserve this existing directory', 'utf8');
      // A file cannot replace a non-empty directory on the local filesystem.
      await vscode.workspace.fs.createDirectory(target);
      await vscode.workspace.fs.writeFile(marker, original);

      await assert.rejects(new VscodeCheckpointStorage(directory).writeAtomic('{"schemaVersion":1,"checkpoints":[]}'));

      assert.deepEqual(Buffer.from(await vscode.workspace.fs.readFile(marker)), original);
      const entries = await vscode.workspace.fs.readDirectory(directory);
      assert.deepEqual(entries.map(([name]) => name), ['checkpoints.json']);
    });
  });
});
