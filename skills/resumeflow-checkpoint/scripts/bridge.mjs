import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

function fail(code, message, exitCode = 2) {
  process.stderr.write(JSON.stringify({ ok: false, error: { code, message } }) + '\n');
  process.exitCode = exitCode;
}
try {
  const argv = process.argv.slice(2);
  if (!(argv.length === 1 || (argv.length === 3 && argv[1] === '--cli'))) throw new Error('invalid invocation');
  const request = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(readFileSync(argv[0])));
  if (typeof request !== 'object' || request === null || Array.isArray(request)) throw new Error('invalid request');
  const { action, project, dataDirectory } = request;
  const permitted = action === 'save' ? ['action', 'project', 'dataDirectory', 'note', 'nextAction', 'allowGit']
    : action === 'resume' ? ['action', 'project', 'dataDirectory', 'id'] : action === 'list' ? ['action', 'project', 'dataDirectory'] : [];
  if (permitted.length === 0 || Object.keys(request).some(key => !permitted.includes(key))
    || typeof project !== 'string' || !isAbsolute(project)
    || (dataDirectory !== undefined && (typeof dataDirectory !== 'string' || !isAbsolute(dataDirectory)))) throw new Error('invalid target');
  let args;
  if (action === 'save') {
    if ((request.note !== undefined && typeof request.note !== 'string')
      || (request.nextAction !== undefined && typeof request.nextAction !== 'string')
      || (request.allowGit !== undefined && typeof request.allowGit !== 'boolean')) throw new Error('invalid metadata');
    args = ['save', `--note=${request.note ?? ''}`, `--next=${request.nextAction ?? ''}`, '--format', 'json'];
    if (request.allowGit === true) args.push('--allow-git');
  } else if (action === 'resume') {
    if (typeof request.id !== 'string') throw new Error('missing id');
    args = ['context', request.id];
  } else args = ['list', '--format', 'json'];
  args.push('--project', project);
  if (dataDirectory !== undefined) args.push('--data-dir', dataDirectory);
  const cli = argv[2] === undefined ? fileURLToPath(new URL('../../../dist/cli/main.js', import.meta.url)) : resolve(argv[2]);
  const result = spawnSync(process.execPath, [cli, ...args], { shell: false, encoding: 'utf8', timeout: 12000, maxBuffer: 2 * 1024 * 1024 });
  if (result.error || result.signal) fail('SKILL_EXECUTION_FAILED', 'CLI を実行できませんでした。', 1);
  else {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exitCode = result.status ?? 1;
  }
} catch {
  fail('SKILL_REQUEST_INVALID', '有効な JSON リクエストと絶対パスを指定してください。');
}
