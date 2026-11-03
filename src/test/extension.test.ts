import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import type { Checkpoint } from '../models/checkpoint';
import { CheckpointStore } from '../services/checkpointStore';
import { VscodeCheckpointStorage } from '../adapters/vscodeCheckpointStorage';

suite('S0: Extension Development Host', () => {
  test('the extension activates in VS Code', async () => {
    const extension = vscode.extensions.getExtension('resumeflow-local.resumeflow');
    assert.ok(extension, 'ResumeFlow extension must be discoverable');
    const store = await extension.activate();
    assert.equal(extension.isActive, true);
    assert.ok(store instanceof CheckpointStore, 'activation must wire the local storage service');
  });
});

suite('S1: real VS Code storage adapter', () => {
  test('stores JSON and reloads it using a fresh adapter and service', async () => {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspace, 'runner must provide its isolated test workspace');
    const directory = vscode.Uri.joinPath(workspace.uri, 'checkpoint-storage');
    const checkpoint: Checkpoint = {
      id: 'c9b2c3d4-1111-4222-8333-123456789abc',
      schemaVersion: 1,
      createdAt: '2026-11-03T00:00:00.000Z',
      title: 'test-workspace — 2026-11-03 09:00',
      workspaceUri: workspace.uri.toString(),
      workspaceName: workspace.name,
      note: '統合テスト専用の架空メモ',
      nextAction: '',
      openFiles: [],
      activeFileUri: null,
      cursor: null,
      unsavedFileUris: [],
      git: {
        available: false,
        repoRootUri: null,
        branch: null,
        headCommit: null,
        changes: [],
        error: null,
      },
    };

    try {
      const store = new CheckpointStore(new VscodeCheckpointStorage(directory));
      assert.deepEqual(await store.load(), { schemaVersion: 1, checkpoints: [] });
      await store.append(checkpoint);

      const freshStore = new CheckpointStore(new VscodeCheckpointStorage(directory));
      assert.deepEqual(await freshStore.load(), { schemaVersion: 1, checkpoints: [checkpoint] });
      const raw = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(directory, 'checkpoints.json'));
      assert.deepEqual(JSON.parse(Buffer.from(raw).toString('utf8')), {
        schemaVersion: 1,
        checkpoints: [checkpoint],
      });
      const files = await vscode.workspace.fs.readDirectory(directory);
      assert.deepEqual(files.map(([name]) => name), ['checkpoints.json']);
    } finally {
      await vscode.workspace.fs.delete(directory, { recursive: true, useTrash: false });
    }
  });
});
