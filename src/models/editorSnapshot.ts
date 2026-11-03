import type { Checkpoint, CursorPosition } from './checkpoint';

// This port carries metadata only. It deliberately has no document/body reader.
export type EditorTabMetadata = {
  kind: 'text';
  uri: string;
  scheme: string;
  workspaceUri: string | null;
  isDirty: boolean;
} | { kind: 'other' };

export interface EditorSnapshot {
  tabs: readonly EditorTabMetadata[];
  activeTabUri: string | null;
  activeEditor: { uri: string; cursor: CursorPosition } | null;
}

export interface EditorCapture {
  snapshot: Pick<Checkpoint, 'openFiles' | 'activeFileUri' | 'cursor' | 'unsavedFileUris'>;
  // Transient UI information, never part of the checkpoint JSON schema.
  warnings: { excludedTabCount: number; unsavedUntitledCount: number };
}
