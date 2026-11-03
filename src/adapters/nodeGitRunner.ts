import type { GitRunner } from '../services/gitCapture';
import { execFile } from 'node:child_process';
import { decodeCheckpointText } from '../models/checkpointEncoding';
export class NodeGitRunner implements GitRunner {
  async run(directory: string, args: readonly string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', ...args], {
        cwd: directory, shell: false, timeout: 2000, maxBuffer: 1024 * 1024, encoding: 'buffer', windowsHide: true,
      }, (error, stdout) => {
        if (error) { reject(error); return; }
        try { resolve(decodeCheckpointText(stdout)); } catch (error) { reject(error); }
      });
    });
  }
}
