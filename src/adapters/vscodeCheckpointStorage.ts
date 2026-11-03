import { randomUUID } from 'node:crypto';
import { rename } from 'node:fs/promises';
import * as vscode from 'vscode';
import type { CheckpointStorage } from '../services/checkpointStore';
import { decodeCheckpointText } from '../models/checkpointEncoding';

/** Only handles extension-owned data; never receives a source-file path. */
export class VscodeCheckpointStorage implements CheckpointStorage {
  private readonly dataFile: vscode.Uri;

  constructor(private readonly directory: vscode.Uri) {
    this.dataFile = vscode.Uri.joinPath(directory, 'checkpoints.json');
  }

  async read(): Promise<string | undefined> {
    try {
      const bytes = await vscode.workspace.fs.readFile(this.dataFile);
      return decodeCheckpointText(bytes);
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
      // workspace.fs rename with overwrite may delete the old target first.
      // Local fs rename replaces a file without recursively removing a directory.
      await rename(temporaryFile.fsPath, this.dataFile.fsPath);
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
