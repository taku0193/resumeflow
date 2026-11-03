import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { readVscodeEditorSnapshot } from '../adapters/vscodeEditorSnapshot';
import { captureEditors } from '../services/editorCapture';

// Tab model updates can arrive after showTextDocument resolves. Wait on the
// actual observable state with a deadline; never rerun a failed test.
async function waitForState(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, 'VS Code editor state did not settle');
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
});
