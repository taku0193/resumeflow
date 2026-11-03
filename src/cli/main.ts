import { runCli } from './run';
import { createNodeCliContext } from '../adapters/nodeCliContext';
void runCli(process.argv.slice(2), createNodeCliContext).then(result => {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
});
