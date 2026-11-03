import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
export async function cliFixture() {
  const root = await mkdtemp(join(tmpdir(), 'resumeflow-journey-'));
  const project = join(root, 'project'), other = join(root, 'other'), data = join(root, 'data');
  await mkdir(project); await mkdir(other);
  return {
    root, project, other, data,
    call: (args: string[], selectedProject = project) => spawnSync(process.execPath, [
      resolve(__dirname, '../cli/main.js'), ...args, '--project', selectedProject, '--data-dir', data,
    ], { encoding: 'utf8', timeout: 10000, maxBuffer: 2 * 1024 * 1024 }),
    dispose: () => rm(root, { recursive: true, force: true }),
  };
}
