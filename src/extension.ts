import type { ExtensionContext } from 'vscode';
import { VscodeCheckpointStorage } from './adapters/vscodeCheckpointStorage';
import { CheckpointStore } from './services/checkpointStore';

export function activate(context: ExtensionContext): CheckpointStore {
  // Command wiring is added in S5 after the storage and capture slices.
  return new CheckpointStore(new VscodeCheckpointStorage(context.globalStorageUri));
}

export function deactivate(): void {}
