import { withAuth } from 'next-auth/middleware';

const authProxy = withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const { pathname } = req.nextUrl;

      if (pathname.startsWith('/auth')) {
        return true;
      }

      return Boolean(token);
    },
  },
});

export default authProxy;

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
