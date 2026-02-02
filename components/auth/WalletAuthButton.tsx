'use client';
import { useCallback } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import Button from '../ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { IS_DEV } from '@/lib/env';

export default function WalletAuthButton() {
  const { user, login, logout, loading } = useAuth();

  const handleAuth = useCallback(async () => {
    if (user) {
      logout();
      return;
    }

    if (IS_DEV) {
      await login();
      return;
    }

    try {
      const res = await fetch('/api/nonce');
      const { nonce } = await res.json();

      const result = await MiniKit.commandsAsync.walletAuth({
        nonce,
        statement: 'Sign in to Advertise',
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      if (result.finalPayload.status === 'error') return;

      const verifyRes = await fetch('/api/verify-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: result.finalPayload,
          nonce,
        }),
      });

      if (verifyRes.ok) {
        await login();
      }
    } catch (err) {
      console.error('Auth error:', err);
    }
  }, [user, login, logout]);

  return (
    <Button
      onClick={handleAuth}
      loading={loading}
      variant={user ? 'secondary' : 'primary'}
      size="lg"
      className="w-full"
    >
      {user ? 'Sign Out' : IS_DEV ? 'Dev Login' : 'Connect Wallet'}
    </Button>
  );
}
