import type { GitRunner } from '../services/gitCapture';
import { execFile } from 'node:child_process';
import { decodeCheckpointText } from '../models/checkpointEncoding';
import { GitCommandError } from '../services/gitCapture';
export class NodeGitRunner implements GitRunner {
  async run(directory: string, args: readonly string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', ...args], {
        cwd: directory, shell: false, timeout: 2000, maxBuffer: 1024 * 1024, encoding: 'buffer', windowsHide: true,
      }, (error, stdout) => {
        if (error) {
          const code = error.code === 'ENOENT' ? 'GIT_NOT_INSTALLED'
            : error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' ? 'GIT_OUTPUT_LIMIT'
              : error.killed ? 'GIT_TIMEOUT' : 'GIT_FAILED';
          reject(new GitCommandError(code, typeof error.code === 'number' ? error.code : undefined));
          return;
        }
        try { resolve(decodeCheckpointText(stdout)); }
        catch { reject(new GitCommandError('INVALID_GIT_OUTPUT')); }
      });
    });
  }
}
