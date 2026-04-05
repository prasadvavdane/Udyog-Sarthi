import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import type { TenantSessionUser } from '@/lib/server-auth';

export async function requireApiUser(allowedRoles?: string[]) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const user = session.user as TenantSessionUser;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { user };
}
