export class CliError extends Error {
  constructor(readonly code: string, message: string, readonly usage = false) {
    super(message);
    this.name = 'CliError';
  }
}
