export type CheckpointErrorCode = 'INVALID_SCHEMA' | 'INVALID_JSON';

export class CheckpointError extends Error {
  constructor(readonly code: CheckpointErrorCode, message: string) {
    super(message);
    this.name = 'CheckpointError';
  }
}
