import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { IS_DEV } from './env';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'SIWE',
      credentials: {
        message: { type: 'text' },
        signature: { type: 'text' },
        nonce: { type: 'text' },
      },
      async authorize(credentials) {
        if (IS_DEV) {
          return {
            id: 'dev-user-001',
            name: 'Dev User',
            walletAddress: '0x0000000000000000000000000000000000000000',
          };
        }
        if (!credentials?.message || !credentials?.signature) return null;
        return {
          id: 'wallet-user',
          name: 'World User',
          walletAddress: '0x...',
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.walletAddress = (user as any).walletAddress;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).walletAddress = token.walletAddress;
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
});
