import { posix, win32 } from 'node:path';
export function defaultDataDirectory(platform: NodeJS.Platform, home: string): string {
  if (platform === 'win32') return win32.join(home, 'AppData', 'Local', 'ResumeFlow');
  if (platform === 'darwin') return posix.join(home, 'Library', 'Application Support', 'ResumeFlow');
  return posix.join(home, '.local', 'share', 'resumeflow');
}
