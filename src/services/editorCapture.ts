import type { EditorCapture, EditorSnapshot } from '../models/editorSnapshot';

export function captureEditors(workspaceUri: string, editors: EditorSnapshot): EditorCapture {
  const eligibleTabs = editors.tabs.flatMap(tab =>
    tab.kind === 'text' && tab.scheme === 'file' && tab.workspaceUri === workspaceUri ? [tab] : []);
  const openFiles = [...new Set(eligibleTabs.map(tab => tab.uri))];
  const candidate = editors.activeEditor;
  const active = candidate && candidate.uri === editors.activeTabUri && openFiles.includes(candidate.uri)
    ? candidate : null;
  return {
    snapshot: {
      openFiles,
      activeFileUri: active?.uri ?? null,
      cursor: active ? { line: active.cursor.line, character: active.cursor.character } : null,
      unsavedFileUris: [...new Set(eligibleTabs.filter(tab => tab.isDirty).map(tab => tab.uri))],
    },
    warnings: { excludedTabCount: editors.tabs.length - eligibleTabs.length, unsavedUntitledCount: 0 },
  };
}
