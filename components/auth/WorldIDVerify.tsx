'use client';
import { useCallback, useState } from 'react';
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js';
import Button from '../ui/Button';
import { IS_DEV } from '@/lib/env';

interface WorldIDVerifyProps {
  onSuccess: () => void;
  action: string;
}

export default function WorldIDVerify({ onSuccess, action }: WorldIDVerifyProps) {
  const [loading, setLoading] = useState(false);

  const handleVerify = useCallback(async () => {
    if (IS_DEV) {
      onSuccess();
      return;
    }

    setLoading(true);
    try {
      const result = await MiniKit.commandsAsync.verify({
        action,
        verification_level: VerificationLevel.Orb,
      });

      if (result.finalPayload.status === 'error') {
        setLoading(false);
        return;
      }

      const verifyRes = await fetch('/api/verify-worldid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: result.finalPayload,
          action,
        }),
      });

      if (verifyRes.ok) {
        onSuccess();
      }
    } catch (err) {
      console.error('Verify error:', err);
    } finally {
      setLoading(false);
    }
  }, [action, onSuccess]);

  return (
    <Button onClick={handleVerify} loading={loading} variant="primary">
      {IS_DEV ? 'Skip Verification (DEV)' : 'Verify with World ID'}
    </Button>
  );
}
