import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: string;
      businessId: string;
      branchId: string;
      tenantCode?: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    tenantId?: string;
    role?: string;
    businessId?: string;
    branchId?: string;
    tenantCode?: string;
  }
}
