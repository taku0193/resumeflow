import { parseArgs } from 'node:util';
import { CliError } from '../models/cliError';
export type CliCommand = 'help' | 'save' | 'list' | 'show' | 'context' | 'delete';
export interface CliOptions {
  command: CliCommand; project: string | null; dataDirectory: string | null;
  format: 'text' | 'json' | 'markdown'; note: string; nextAction: string;
  allowGit: boolean; id: string | null; yes: boolean;
}
export function parseCliArguments(args: readonly string[]): CliOptions {
  try {
  const { values, positionals, tokens } = parseArgs({ args: [...args], allowPositionals: true, tokens: true, options: {
    help: { type: 'boolean' }, project: { type: 'string' }, 'data-dir': { type: 'string' },
    format: { type: 'string' }, note: { type: 'string' }, next: { type: 'string' }, 'allow-git': { type: 'boolean' },
  } });
  const names = tokens.filter(token => token.kind === 'option').map(token => token.name);
  const command = values.help ? 'help' : positionals[0] ?? 'help';
  if (!['help', 'save'].includes(command) || positionals.length > 1
    || new Set(names).size !== names.length || values.project === '' || values['data-dir'] === ''
    || (values.format !== undefined && !['text', 'json'].includes(values.format))
    || (command === 'help' && names.some(name => name !== 'help'))) {
    throw new CliError('USAGE', '引数を確認してください。help で使い方を表示できます。', true);
  }
  return {
    command: command as CliCommand,
    project: values.project ?? null, dataDirectory: values['data-dir'] ?? null,
    format: (values.format ?? 'text') as CliOptions['format'], note: values.note ?? '', nextAction: values.next ?? '',
    allowGit: values['allow-git'] === true, id: null, yes: false,
  };
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError('USAGE', '引数を確認してください。help で使い方を表示できます。', true);
  }
}
