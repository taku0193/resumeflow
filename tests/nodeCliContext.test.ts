import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from 'vitest';
import { createNodeCliContext } from '../src/adapters/nodeCliContext';
import { parseCliArguments } from '../src/cli/arguments';
test('C9-05: resolves a real directory into a canonical project without opening an editor', async () => {
  const root = await mkdtemp(join(tmpdir(), 'resumeflow-project-'));
  try {
    const canonical = await realpath(root);
    await expect(createNodeCliContext(parseCliArguments(['save', '--project', root, '--data-dir', join(root, 'data')]))).resolves.toMatchObject({
      project: { path: canonical, uri: pathToFileURL(canonical).toString(), name: basename(canonical) },
    });
  } finally { await rm(root, { recursive: true, force: true }); }
});
