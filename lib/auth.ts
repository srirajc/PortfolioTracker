import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyPassword } from '@/lib/password';
import pool from '@/lib/db';

const MAX_FAILED_ATTEMPTS = 5;

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) return null;

        // Check if account is locked
        if (user.is_locked) {
          throw new Error('ACCOUNT_LOCKED');
        }

        const isValid = await verifyPassword(password, user.password_hash);

        if (!isValid) {
          const attempts = (user.failed_login_attempts || 0) + 1;
          const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;

          await pool.query(
            'UPDATE users SET failed_login_attempts = $1, is_locked = $2 WHERE id = $3',
            [attempts, shouldLock, user.id]
          );

          if (shouldLock) {
            throw new Error('ACCOUNT_LOCKED');
          }
          return null;
        }

        // Reset failed login counter on successful authentication
        await pool.query('UPDATE users SET failed_login_attempts = 0 WHERE id = $1', [user.id]);

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
