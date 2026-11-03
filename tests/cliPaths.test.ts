import { expect, test } from 'vitest';
import { defaultDataDirectory } from '../src/services/cliPaths';

test.each([
  ['darwin', '/Users/example', '/Users/example/Library/Application Support/ResumeFlow'],
  ['linux', '/home/example', '/home/example/.local/share/resumeflow'],
  ['win32', 'C:\\Users\\example', 'C:\\Users\\example\\AppData\\Local\\ResumeFlow'],
] as const)('C6-06: %s uses application storage outside the working repository', (platform, home, expected) => {
  expect(defaultDataDirectory(platform, home)).toBe(expected);
});
