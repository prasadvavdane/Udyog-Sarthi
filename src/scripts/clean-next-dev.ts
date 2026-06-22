import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const devDir = join(process.cwd(), '.next', 'dev');

if (!existsSync(devDir)) {
  process.exit(0);
}

try {
  rmSync(devDir, { recursive: true, force: true });
} catch (error) {
  const code = error instanceof Error && 'code' in error ? String(error.code) : '';

  if (['EACCES', 'EBUSY', 'EPERM'].includes(code)) {
    console.error(
      [
        'Cannot prepare `next dev` because another dev server is already using .next/dev.',
        'Stop the existing dev server first, then run `npm run dev` again.',
      ].join('\n'),
    );
    process.exit(1);
  }

  throw error;
}
