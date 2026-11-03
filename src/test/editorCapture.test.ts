import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { readVscodeEditorSnapshot } from '../adapters/vscodeEditorSnapshot';
import { VscodeCheckpointStorage } from '../adapters/vscodeCheckpointStorage';
import { captureEditors } from '../services/editorCapture';
import { CheckpointStore } from '../services/checkpointStore';
import { checkpointFixture } from './fixtures/checkpointFixture';

// Tab model updates can arrive after showTextDocument resolves. Wait on the
// actual observable state with a deadline; never rerun a failed test.
async function waitForState(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, `VS Code editor state did not settle: ${JSON.stringify(
      vscode.window.tabGroups.all.map(group => ({
        active: group.isActive,
        tabs: group.tabs.map(tab => ({
          label: tab.label, active: tab.isActive,
          inputType: (tab.input as object | undefined)?.constructor?.name,
          input: tab.input,
        })),
      })))}`);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

suite('S3: real VS Code editor metadata', () => {
  let directory: vscode.Uri;
  let workspaceUri: string;

  setup(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    const workspace = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspace, 'runner must supply its isolated workspace');
    workspaceUri = workspace.uri.toString();
    directory = vscode.Uri.joinPath(workspace.uri, 'editor-capture');
    await vscode.workspace.fs.createDirectory(directory);
  });

  teardown(async () => {
    // These commands only discard synthetic edits created by this test suite.
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await vscode.workspace.fs.delete(directory, { recursive: true, useTrash: false });
  });

  async function fixture(name: string): Promise<vscode.Uri> {
    const uri = vscode.Uri.joinPath(directory, name);
    await vscode.workspace.fs.writeFile(uri, Buffer.from('line zero\nline one\nline two for selection\n'));
    return uri;
  }

  test('P1-07 API: captures background tabs, omits loaded-only documents, uses selection.active', async () => {
    const first = await fixture('first.txt');
    const second = await fixture('日本語 file.txt');
    await vscode.workspace.openTextDocument(await fixture('loaded-only.txt'));
    await vscode.window.showTextDocument(first, { preview: false });
    const editor = await vscode.window.showTextDocument(second, { preview: false });
    editor.selection = new vscode.Selection(new vscode.Position(1, 2), new vscode.Position(2, 7));
    await waitForState(() => vscode.window.tabGroups.all.flatMap(group => group.tabs).length === 2);

    const result = captureEditors(workspaceUri, readVscodeEditorSnapshot());
    assert.deepEqual(result.snapshot, {
      openFiles: [first.toString(), second.toString()], activeFileUri: second.toString(),
      cursor: { line: 2, character: 7 }, unsavedFileUris: [],
    });
    assert.deepEqual(result.warnings, { excludedTabCount: 0, unsavedUntitledCount: 0 });
  });

  test('P1-07 API: an empty editor area yields empty metadata', () => {
    assert.deepEqual(captureEditors(workspaceUri, readVscodeEditorSnapshot()), {
      snapshot: { openFiles: [], activeFileUri: null, cursor: null, unsavedFileUris: [] },
      warnings: { excludedTabCount: 0, unsavedUntitledCount: 0 },
    });
  });

  test('P1-08 API: deduplicates the same file opened in two groups', async () => {
    const uri = await fixture('split.txt');
    await vscode.window.showTextDocument(uri, { preview: false, viewColumn: vscode.ViewColumn.One });
    await vscode.window.showTextDocument(uri, { preview: false, viewColumn: vscode.ViewColumn.Two });
    await waitForState(() => vscode.window.tabGroups.all.filter(group => group.tabs.length > 0).length === 2);
    const result = captureEditors(workspaceUri, readVscodeEditorSnapshot());
    assert.deepEqual(result.snapshot.openFiles, [uri.toString()]);
    assert.equal(result.snapshot.activeFileUri, uri.toString());
    assert.equal(result.warnings.excludedTabCount, 0);
  });

  test('P1-08 API: excludes a sibling workspace-prefix directory', async () => {
    const workspace = vscode.workspace.workspaceFolders![0]!;
    const outside = vscode.Uri.joinPath(workspace.uri, '..', 'workspace-other');
    await vscode.workspace.fs.createDirectory(outside);
    try {
      const uri = vscode.Uri.joinPath(outside, 'private.txt');
      await vscode.workspace.fs.writeFile(uri, Buffer.from('SYNTHETIC_OUTSIDE_BODY'));
      await vscode.window.showTextDocument(uri, { preview: false });
      await waitForState(() => vscode.window.tabGroups.activeTabGroup.activeTab?.input instanceof vscode.TabInputText);
      const result = captureEditors(workspaceUri, readVscodeEditorSnapshot());
      assert.deepEqual(result.snapshot, { openFiles: [], activeFileUri: null, cursor: null, unsavedFileUris: [] });
      assert.deepEqual(result.warnings, { excludedTabCount: 1, unsavedUntitledCount: 0 });
      assert.ok(!JSON.stringify(result).includes('private.txt'));
    } finally {
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
      await vscode.workspace.fs.delete(outside, { recursive: true, useTrash: false });
    }
  });

  test('P1-08 API: excludes virtual text documents', async () => {
    const provider = vscode.workspace.registerTextDocumentContentProvider('resumeflow-test', {
      provideTextDocumentContent: () => 'SYNTHETIC_VIRTUAL_BODY',
    });
    try {
      const uri = vscode.Uri.parse('resumeflow-test:/virtual.txt');
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document, { preview: false });
      await waitForState(() => vscode.window.tabGroups.activeTabGroup.activeTab?.input instanceof vscode.TabInputText);
      const result = captureEditors(workspaceUri, readVscodeEditorSnapshot());
      assert.deepEqual(result.snapshot.openFiles, []);
      assert.equal(result.snapshot.activeFileUri, null);
      assert.equal(result.snapshot.cursor, null);
      assert.equal(result.warnings.excludedTabCount, 1);
    } finally {
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
      provider.dispose();
    }
  });

  test('P1-08 API: an active diff is excluded even when its file is a normal tab in another group', async () => {
    const first = await fixture('diff-original.txt');
    const second = await fixture('diff-modified.txt');
    await vscode.window.showTextDocument(first, { preview: false, viewColumn: vscode.ViewColumn.One });
    await vscode.commands.executeCommand('vscode.diff', second, first, 'S3 diff', {
      preview: false, viewColumn: vscode.ViewColumn.Two,
    });
    await waitForState(() => vscode.window.tabGroups.activeTabGroup.activeTab?.input instanceof vscode.TabInputTextDiff);
    const result = captureEditors(workspaceUri, readVscodeEditorSnapshot());
    assert.deepEqual(result.snapshot.openFiles, [first.toString()]);
    assert.equal(result.snapshot.activeFileUri, null);
    assert.equal(result.snapshot.cursor, null);
    assert.equal(result.warnings.excludedTabCount, 1);
  });

  test('P1-08 API: excludes a local image opened in the built-in image editor', async () => {
    const uri = vscode.Uri.joinPath(directory, 'pixel.png');
    await vscode.workspace.fs.writeFile(uri, Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGtkAAAAASUVORK5CYII=', 'base64'));
    await vscode.commands.executeCommand('vscode.openWith', uri, 'imagePreview.previewEditor', { preview: false });
    // Stable VS Code currently exposes its native image input as unknown;
    // older releases expose TabInputCustom. Wait for the actual image tab,
    // and require that the fixture did not fall back to a normal text editor.
    await waitForState(() => vscode.window.tabGroups.activeTabGroup.activeTab?.label === 'pixel.png');
    assert.ok(!(vscode.window.tabGroups.activeTabGroup.activeTab?.input instanceof vscode.TabInputText));
    const result = captureEditors(workspaceUri, readVscodeEditorSnapshot());
    assert.deepEqual(result.snapshot.openFiles, []);
    assert.equal(result.snapshot.activeFileUri, null);
    assert.equal(result.snapshot.cursor, null);
    assert.equal(result.warnings.excludedTabCount, 1);
  });

  test('P1-09 API: persists only dirty file metadata and leaves the source bytes unchanged', async () => {
    const uri = await fixture('dirty.txt');
    const original = await vscode.workspace.fs.readFile(uri);
    const editor = await vscode.window.showTextDocument(uri, { preview: false });
    assert.equal(await editor.edit(edit => edit.insert(new vscode.Position(0, 0), 'SYNTHETIC_UNSAVED_BODY\n')), true);
    await waitForState(() => vscode.window.tabGroups.activeTabGroup.activeTab?.isDirty === true);
    const result = captureEditors(workspaceUri, readVscodeEditorSnapshot());
    assert.deepEqual(result.snapshot.unsavedFileUris, [uri.toString()]);
    const storage = vscode.Uri.joinPath(directory, 'checkpoint-storage');
    const store = new CheckpointStore(new VscodeCheckpointStorage(storage));
    const checkpoint = checkpointFixture({ workspaceUri, ...result.snapshot });
    await store.append(checkpoint);
    assert.deepEqual((await store.load()).checkpoints, [checkpoint]);
    const saved = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(storage, 'checkpoints.json'));
    assert.ok(!Buffer.from(saved).toString('utf8').includes('SYNTHETIC_UNSAVED_BODY'));
    assert.deepEqual(await vscode.workspace.fs.readFile(uri), original);
    assert.equal(editor.document.isDirty, true, 'capture must not save or revert edits');
  });

  test('P1-09 API: an untitled buffer is counted without exposing its URI or body', async () => {
    const document = await vscode.workspace.openTextDocument({ content: 'SYNTHETIC_UNTITLED_BODY' });
    await vscode.window.showTextDocument(document, { preview: false });
    await waitForState(() => vscode.window.tabGroups.activeTabGroup.activeTab?.input instanceof vscode.TabInputText);
    const result = captureEditors(workspaceUri, readVscodeEditorSnapshot());
    assert.deepEqual(result, {
      snapshot: { openFiles: [], activeFileUri: null, cursor: null, unsavedFileUris: [] },
      warnings: { excludedTabCount: 1, unsavedUntitledCount: 1 },
    });
    assert.ok(!JSON.stringify(result).includes(document.uri.toString()));
    assert.ok(!JSON.stringify(result).includes('SYNTHETIC_UNTITLED_BODY'));
    assert.equal(document.isDirty, true, 'capture must leave unsaved edits alone');
  });
});
