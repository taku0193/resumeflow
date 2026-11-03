import * as vscode from 'vscode';
import type { EditorSnapshot, EditorTabMetadata } from '../models/editorSnapshot';

function readTab(tab: vscode.Tab): EditorTabMetadata {
  if (!(tab.input instanceof vscode.TabInputText)) return { kind: 'other' };
  const { uri } = tab.input;
  return {
    kind: 'text',
    uri: uri.toString(),
    scheme: uri.scheme,
    workspaceUri: uri.scheme === 'file'
      ? vscode.workspace.getWorkspaceFolder(uri)?.uri.toString() ?? null : null,
    isDirty: tab.isDirty,
  };
}

export function readVscodeEditorSnapshot(): EditorSnapshot {
  // A synchronous snapshot: no file reads, document text, or event subscriptions.
  const activeInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
  const editor = vscode.window.activeTextEditor;
  return {
    tabs: vscode.window.tabGroups.all.flatMap(group => group.tabs.map(readTab)),
    activeTabUri: activeInput instanceof vscode.TabInputText ? activeInput.uri.toString() : null,
    activeEditor: editor ? {
      uri: editor.document.uri.toString(),
      cursor: { line: editor.selection.active.line, character: editor.selection.active.character },
    } : null,
  };
}
