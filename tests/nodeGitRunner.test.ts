import { execFile, type ChildProcess } from 'node:child_process';
import { beforeEach, expect, test, vi } from 'vitest';
import { NodeGitRunner } from '../src/adapters/nodeGitRunner';
vi.mock('node:child_process', () => ({ execFile: vi.fn() }));

function complete(error: object | null, bytes = Buffer.from('main\n')): void {
  vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
    const callback = args.at(-1) as (error: unknown, out: Buffer, err: Buffer) => void;
    callback(error, bytes, Buffer.from('SENSITIVE_NATIVE_STDERR'));
    return {} as ChildProcess;
  });
}
beforeEach(() => { vi.mocked(execFile).mockReset(); });
test('C8-N1: the Node runner uses shell-free bounded Git with fsmonitor and optional locks disabled', async () => {
  complete(null);
  const args = ['symbolic-ref', '--quiet', '--short', 'HEAD'];
  expect(await new NodeGitRunner().run('/synthetic', args)).toBe('main\n');
  expect(execFile).toHaveBeenCalledWith('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', ...args], {
    cwd: '/synthetic', shell: false, timeout: 2000, maxBuffer: 1024 * 1024, encoding: 'buffer', windowsHide: true,
  }, expect.any(Function));
});
