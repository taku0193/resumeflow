import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createVSIX, listFiles } from '@vscode/vsce';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export async function packageForE2e(packagePath) {
  const options = {
    cwd: projectRoot,
    packagePath,
    dependencies: false,
    skipLicense: true, // Internal test artifact; not a Marketplace publication.
  };
  const files = await listFiles(options);
  const allowed = /^(?:package\.json|README\.md|CLI_SPEC\.md|docs\/assets\/resumeflow-(?:hero|flow-mobile)\.(?:svg|png)|skills\/resumeflow-checkpoint\/(?:SKILL\.md|scripts\/bridge\.mjs)|dist\/extension\.js|dist\/(?:adapters|models|services|cli)\/.+\.js)$/;
  assert.ok(files.includes('dist/extension.js'), 'VSIX must contain the extension entry point');
  for (const file of files) {
    assert.match(file, allowed, `Unexpected file in VSIX: ${file}`);
  }
  await mkdir(dirname(packagePath), { recursive: true });
  await createVSIX(options);
  console.log(`VSIX allowlist verified: ${files.length} runtime/documentation files`);
  return packagePath;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await packageForE2e(resolve(projectRoot, '.test-data/e2e/package/resumeflow.vsix'));
}
