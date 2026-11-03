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
test.each([
  [{ code: 'ENOENT' }, Buffer.alloc(0), 'GIT_NOT_INSTALLED'],
  [{ code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER', killed: true }, Buffer.alloc(0), 'GIT_OUTPUT_LIMIT'],
  [{ killed: true }, Buffer.alloc(0), 'GIT_TIMEOUT'],
  [{ code: 128 }, Buffer.alloc(0), 'GIT_FAILED'],
  [null, Buffer.from([0xff]), 'INVALID_GIT_OUTPUT'],
])('C8-N2: normalizes process/encoding failures without quoting stderr', async (error, bytes, code) => {
  complete(error, bytes);
  const caught = await new NodeGitRunner().run('/synthetic', ['rev-parse', '--show-toplevel']).catch(error => error);
  expect(caught).toMatchObject({ code });
  expect(String(caught)).not.toContain('SENSITIVE_NATIVE_STDERR');
});
