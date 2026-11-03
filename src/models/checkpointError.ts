export type CheckpointErrorCode = 'INVALID_SCHEMA';

export class CheckpointError extends Error {
  constructor(readonly code: CheckpointErrorCode, message: string) {
    super(message);
    this.name = 'CheckpointError';
  }
}
