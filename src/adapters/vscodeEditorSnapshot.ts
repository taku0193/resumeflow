import type { EditorSnapshot } from '../models/editorSnapshot';

export function readVscodeEditorSnapshot(): EditorSnapshot {
  return { tabs: [], activeTabUri: null, activeEditor: null };
}
