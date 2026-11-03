import type { EditorCapture, EditorSnapshot } from '../models/editorSnapshot';

export function captureEditors(workspaceUri: string, editors: EditorSnapshot): EditorCapture {
  const openFiles = [...new Set(editors.tabs.flatMap(tab => tab.kind === 'text' ? [tab.uri] : []))];
  const active = editors.activeEditor;
  return {
    snapshot: {
      openFiles,
      activeFileUri: active?.uri ?? null,
      cursor: active ? { line: active.cursor.line, character: active.cursor.character } : null,
      unsavedFileUris: [],
    },
    warnings: { excludedTabCount: 0, unsavedUntitledCount: 0 },
  };
}
