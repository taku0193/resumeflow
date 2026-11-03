import { vi } from 'vitest';
import type { CliContext } from '../src/cli/run';
import { CliCheckpointStore } from '../src/services/cliCheckpointStore';
import { MemoryStorage } from './memoryStorage';
export function cliContextFixture(): CliContext {
  return {
    project: { path: '/synthetic/project', uri: 'file:///synthetic/project', name: 'project' },
    store: new CliCheckpointStore(new MemoryStorage()),
    withLock: async <T>(action: () => Promise<T>) => action(),
    gitRunner: { run: vi.fn(async () => { throw new Error('Git must not run without permission'); }) },
    clock: () => new Date('2026-11-03T00:00:00Z'),
    idGenerator: () => 'a9b2c3d4-1111-4222-8333-123456789abc',
    isInteractive: false, confirm: vi.fn(async () => false),
  };
}
