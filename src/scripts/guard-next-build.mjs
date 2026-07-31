import { closeSync, existsSync, openSync } from 'node:fs';
import { join } from 'node:path';

const devLockPath = join(process.cwd(), '.next', 'dev', 'lock');

if (!existsSync(devLockPath)) {
  process.exit(0);
}

try {
  const lockFile = openSync(devLockPath, 'r+');
  closeSync(lockFile);
} catch (error) {
  const code = error instanceof Error && 'code' in error ? String(error.code) : '';

  if (['EACCES', 'EBUSY', 'EPERM'].includes(code)) {
    console.error(
      [
        'Cannot run `next build` while `next dev` is running.',
        'Stop the dev server first, then run `npm run build`.',
        'Running both at the same time can make API routes return HTML 404 pages in the live dev app.',
      ].join('\n'),
    );
    process.exit(1);
  }

  throw error;
}
