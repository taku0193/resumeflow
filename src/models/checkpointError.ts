export type CheckpointErrorCode = 'INVALID_SCHEMA' | 'INVALID_JSON' | 'READ_FAILED' | 'WRITE_FAILED';

export class CheckpointError extends Error {
  constructor(readonly code: CheckpointErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CheckpointError';
  }
}
