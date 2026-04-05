import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Tenant from '@/models/Tenant';
import User from '@/models/User';

async function resolveTenant(tenantLookup: string) {
  const value = tenantLookup.trim();

  if (mongoose.Types.ObjectId.isValid(value)) {
    const tenantById = await Tenant.findById(value);
    if (tenantById) {
      return tenantById;
    }
  }

  return Tenant.findOne({ tenantCode: value, isActive: true });
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        tenantId: { label: 'Tenant ID', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.tenantId) {
          return null;
        }

        try {
          await dbConnect();

          const tenant = await resolveTenant(credentials.tenantId);
          if (!tenant) {
            return null;
          }

          const user = await User.findOne({
            email: credentials.email,
            tenantId: tenant._id.toString(),
            isActive: true,
          });

          if (!user) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId,
            businessId: user.businessId,
            branchId: user.branchId,
            tenantCode: tenant.tenantCode,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as {
          role?: string;
          tenantId?: string;
          businessId?: string;
          branchId?: string;
          tenantCode?: string;
        };
        token.role = authUser.role;
        token.tenantId = authUser.tenantId;
        token.businessId = authUser.businessId;
        token.branchId = authUser.branchId;
        token.tenantCode = authUser.tenantCode;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub ?? '';
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        session.user.businessId = token.businessId as string;
        session.user.branchId = token.branchId as string;
        session.user.tenantCode = token.tenantCode as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
