import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

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
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect('/auth/signin');
  }

  return session.user as TenantSessionUser;
}
