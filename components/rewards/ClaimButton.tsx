'use client';
import { useState } from 'react';
import { MiniKit, tokenToDecimals, Tokens } from '@worldcoin/minikit-js';
import Button from '../ui/Button';
import WorldIDVerify from '../auth/WorldIDVerify';
import { IS_DEV } from '@/lib/env';

interface ClaimButtonProps {
  amount: number;
  rewardId: string;
  onClaimed: () => void;
}

export default function ClaimButton({ amount, rewardId, onClaimed }: ClaimButtonProps) {
  const [step, setStep] = useState<'verify' | 'claim' | 'done'>('verify');
  const [loading, setLoading] = useState(false);

  const handleVerified = () => setStep('claim');

  const handleClaim = async () => {
    setLoading(true);
    try {
      if (!IS_DEV) {
        const res = await fetch('/api/rewards/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rewardId }),
        });
        const { id: referenceId } = await res.json();

        await MiniKit.commandsAsync.pay({
          reference: referenceId,
          to: '0x0000000000000000000000000000000000000000',
          tokens: [
            {
              symbol: Tokens.WLD,
              token_amount: tokenToDecimals(amount, Tokens.WLD).toString(),
            },
          ],
          description: `Claim ${amount} WLD reward`,
        });
      }

      setStep('done');
      onClaimed();
    } catch (err) {
      console.error('Claim error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="text-center py-4">
        <p className="text-lg font-semibold text-green-600">Claimed {amount} WLD!</p>
      </div>
    );
  }

  if (step === 'verify') {
    return <WorldIDVerify action="claim-reward" onSuccess={handleVerified} />;
  }

  return (
    <Button onClick={handleClaim} loading={loading} size="lg" className="w-full">
      Claim {amount} WLD
    </Button>
  );
}
