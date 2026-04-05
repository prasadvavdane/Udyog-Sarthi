import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export type TenantSessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  tenantId: string;
  businessId: string;
  branchId: string;
  tenantCode?: string;
};

export async function requireTenantUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect('/auth/signin');
  }

  return session.user as TenantSessionUser;
}
