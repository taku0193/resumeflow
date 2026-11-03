import { expect, test } from 'vitest';
import type { EditorSnapshot, EditorTabMetadata } from '../src/models/editorSnapshot';
import { captureEditors } from '../src/services/editorCapture';

const workspaceUri = 'file:///projects/example';
const firstUri = `${workspaceUri}/src/first.ts`;
const secondUri = `${workspaceUri}/src/%E6%97%A5%E6%9C%AC%E8%AA%9E%20file.ts`;

function textTab(uri: string, overrides: Partial<Extract<EditorTabMetadata, { kind: 'text' }>> = {}): EditorTabMetadata {
  return { kind: 'text', uri, scheme: 'file', workspaceUri, isDirty: false, ...overrides };
}

function editorSnapshot(overrides: Partial<EditorSnapshot> = {}): EditorSnapshot {
  return { tabs: [textTab(firstUri), textTab(secondUri)], activeTabUri: null, activeEditor: null, ...overrides };
}

test('P1-07a: captures two text tabs and the active selection endpoint as zero-based coordinates', () => {
  const editors = editorSnapshot({
    activeTabUri: secondUri,
    activeEditor: { uri: secondUri, cursor: { line: 42, character: 8 } },
  });
  expect(captureEditors(workspaceUri, editors)).toEqual({
    snapshot: {
      openFiles: [firstUri, secondUri], activeFileUri: secondUri,
      cursor: { line: 42, character: 8 }, unsavedFileUris: [],
    },
    warnings: { excludedTabCount: 0, unsavedUntitledCount: 0 },
  });
});

test('P1-07b: an empty editor area has no active file or cursor', () => {
  expect(captureEditors(workspaceUri, editorSnapshot({ tabs: [] }))).toEqual({
    snapshot: { openFiles: [], activeFileUri: null, cursor: null, unsavedFileUris: [] },
    warnings: { excludedTabCount: 0, unsavedUntitledCount: 0 },
  });
});

test('P1-08a: repeated URIs across editor groups are captured once in first-seen order', () => {
  const editors = editorSnapshot({ tabs: [textTab(secondUri), textTab(firstUri), textTab(secondUri)] });
  expect(captureEditors(workspaceUri, editors).snapshot.openFiles).toEqual([secondUri, firstUri]);
});
