import { randomUUID } from 'node:crypto';
import * as vscode from 'vscode';
import type { CheckpointStorage } from '../services/checkpointStore';

/** Only handles extension-owned data; never receives a source-file path. */
export class VscodeCheckpointStorage implements CheckpointStorage {
  private readonly dataFile: vscode.Uri;

  constructor(private readonly directory: vscode.Uri) {
    this.dataFile = vscode.Uri.joinPath(directory, 'checkpoints.json');
  }

  async read(): Promise<string | undefined> {
    try {
      const bytes = await vscode.workspace.fs.readFile(this.dataFile);
      return Buffer.from(bytes).toString('utf8');
    } catch (error) {
      if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
        return undefined;
      }
      throw error;
    }
  }

  async writeAtomic(contents: string): Promise<void> {
    await vscode.workspace.fs.createDirectory(this.directory);
    const temporaryFile = vscode.Uri.joinPath(this.directory, `checkpoints.json.${randomUUID()}.tmp`);
    try {
      await vscode.workspace.fs.writeFile(temporaryFile, Buffer.from(contents, 'utf8'));
      await vscode.workspace.fs.rename(temporaryFile, this.dataFile, { overwrite: true });
    } catch (error) {
      // Cleanup must not hide the original write/rename failure.
      try {
        await vscode.workspace.fs.delete(temporaryFile, { useTrash: false });
      } catch {
        // The failed write may not have created a temporary file.
      }
      throw error;
    }
  }
}
