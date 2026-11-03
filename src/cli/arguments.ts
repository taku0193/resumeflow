export type CliCommand = 'help' | 'save' | 'list' | 'show' | 'context' | 'delete';
export interface CliOptions {
  command: CliCommand; project: string | null; dataDirectory: string | null;
  format: 'text' | 'json' | 'markdown'; note: string; nextAction: string;
  allowGit: boolean; id: string | null; yes: boolean;
}
export function parseCliArguments(args: readonly string[]): CliOptions {
  const { values, positionals } = parseArgs({ args: [...args], allowPositionals: true, options: {
    help: { type: 'boolean' }, project: { type: 'string' }, 'data-dir': { type: 'string' },
    format: { type: 'string' }, note: { type: 'string' }, next: { type: 'string' }, 'allow-git': { type: 'boolean' },
  } });
  return {
    command: values.help ? 'help' : (positionals[0] ?? 'help') as CliCommand,
    project: values.project ?? null, dataDirectory: values['data-dir'] ?? null,
    format: (values.format ?? 'text') as CliOptions['format'], note: values.note ?? '', nextAction: values.next ?? '',
    allowGit: values['allow-git'] === true, id: null, yes: false,
  };
}
import { parseArgs } from 'node:util';
