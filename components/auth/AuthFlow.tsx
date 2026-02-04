'use client';
import { useState, useCallback, ReactNode, useEffect } from 'react';
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js';
import { isMiniKitAvailable } from '@/lib/auth/walletAuth';

interface AuthFlowProps {
  onComplete: (data: {
    nullifierHash: string;
    walletAddress: string;
    verificationLevel: 'orb' | 'device';
  }) => void;
  children?: ReactNode;
}

export default function AuthFlow({ onComplete, children }: AuthFlowProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [miniKitInstalled, setMiniKitInstalled] = useState(false);

  useEffect(() => {
    setMiniKitInstalled(isMiniKitAvailable());
  }, []);

  const handleVerify = useCallback(async () => {
    setError(null);

    // If MiniKit is not installed (running in browser), use dev mode
    if (!miniKitInstalled) {
      console.log('[AuthFlow] MiniKit not installed, using dev mode');
      const devNullifier = 'dev-nullifier-' + Date.now();
      const devWallet = '0xDEV0000000000000000000000000000000000001';
      setDone(true);
      onComplete({
        nullifierHash: devNullifier,
        walletAddress: devWallet,
        verificationLevel: 'device',
      });
      return;
    }

    // Real MiniKit authentication
    console.log('[AuthFlow] MiniKit installed, using real verification');
    setLoading(true);

    try {
      const result = await MiniKit.commandsAsync.verify({
        action: 'adwatch-signup',
        verification_level: VerificationLevel.Device,
      });

      if (result.finalPayload.status === 'error') {
        setError('Verification failed. Please try again.');
        return;
      }

      // Verify with backend
      const verifyRes = await fetch('/api/verify-worldid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: result.finalPayload,
          action: 'adwatch-signup',
        }),
      });

      if (verifyRes.ok) {
        const data = await verifyRes.json();

        // Get wallet address from MiniKit.user (no separate wallet auth needed!)
        const walletAddress = MiniKit.user?.walletAddress || '';

        console.log('[AuthFlow] Verification successful', {
          nullifier: data.nullifier_hash,
          wallet: walletAddress,
          level: data.verification_level,
        });

        setDone(true);
        onComplete({
          nullifierHash: data.nullifier_hash,
          walletAddress: walletAddress,
          verificationLevel: data.verification_level || 'device',
        });
      } else {
        const errorData = await verifyRes.json();
        setError(errorData.error || 'Verification failed');
      }
    } catch (err) {
      console.error('[AuthFlow] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [miniKitInstalled, onComplete]);

  if (done) {
    return <>{children}</>;
  }

  return (
    <div className="h-full bg-gradient-to-br from-gray-900 via-purple-900 to-black flex flex-col items-center justify-center px-6 pb-3">
      {/* Error message */}
      {error && (
        <div className="mb-4 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl max-w-xs text-center">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      {/* Single verification step */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden max-w-xs w-full">
        <div className="flex flex-col items-center p-5">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>

          <h2 className="text-lg font-bold text-white mb-1.5">Verify with World ID</h2>
          <p className="text-white/70 text-center mb-3 text-xs">
            Prove you&apos;re a real human to start earning rewards
          </p>

          <div className="bg-white/5 rounded-xl p-3 mb-4 w-full">
            <ul className="text-white/60 text-xs space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>1 person = 1 account</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>No bots, no fraud</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Privacy preserved with ZKP</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleVerify}
            disabled={loading}
            className="w-full py-3 px-5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying...</span>
              </>
            ) : !miniKitInstalled ? (
              <span>Continue (Browser Mode)</span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Verify with World ID</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* App branding */}
      <div className="mt-5 text-center">
        <h1 className="text-base font-bold text-white">AdWatch</h1>
        <p className="text-white/40 text-xs">Watch ads. Earn rewards.</p>
      </div>
    </div>
  );
}
