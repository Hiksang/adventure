'use client';
import { useState, useCallback, ReactNode, useEffect } from 'react';
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js';
import { initiateWalletAuth, isMiniKitAvailable } from '@/lib/auth/walletAuth';

type AuthStep = 'wallet' | 'worldid' | 'done';

interface AuthFlowProps {
  onComplete: (data: {
    nullifierHash: string;
    walletAddress: string;
    verificationLevel: 'orb' | 'device';
  }) => void;
  children?: ReactNode;
}

interface StepProps {
  onSuccess: () => void;
  onError?: (error: string) => void;
}

function WalletAuthStep({ onSuccess, onError }: StepProps & {
  setWalletAddress: (addr: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleWalletAuth = async () => {
    setLoading(true);
    try {
      const result = await initiateWalletAuth();

      if (result.success && result.walletAddress) {
        onSuccess();
      } else {
        onError?.(result.error || 'Wallet auth failed');
      }
    } catch (err) {
      console.error('[WalletAuth] Error:', err);
      onError?.(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-6">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-white mb-3">Connect Wallet</h2>
      <p className="text-white/70 text-center mb-6 max-w-xs">
        Sign in with your World App wallet to get started
      </p>

      <button
        onClick={handleWalletAuth}
        disabled={loading}
        className="w-full max-w-xs py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            <span>Connect Wallet</span>
          </>
        )}
      </button>

      <p className="mt-4 text-white/40 text-xs text-center">
        Step 1 of 2
      </p>
    </div>
  );
}

function WorldIDStep({ onSuccess, onError, setNullifierHash, setVerificationLevel }: StepProps & {
  setNullifierHash: (hash: string) => void;
  setVerificationLevel: (level: 'orb' | 'device') => void;
}) {
  const [loading, setLoading] = useState(false);
  const [miniKitInstalled, setMiniKitInstalled] = useState(false);

  useEffect(() => {
    setMiniKitInstalled(isMiniKitAvailable());
  }, []);

  const handleVerify = async () => {
    // If MiniKit is not installed (running in browser), use dev mode
    if (!miniKitInstalled) {
      console.log('[WorldID] MiniKit not installed, using dev mode');
      setNullifierHash('dev-nullifier-' + Date.now());
      setVerificationLevel('device');
      onSuccess();
      return;
    }

    // Real MiniKit authentication
    console.log('[WorldID] MiniKit installed, using real verification');
    setLoading(true);
    try {
      const result = await MiniKit.commandsAsync.verify({
        action: 'adwatch-signup',
        verification_level: VerificationLevel.Device, // Device level for easier testing
      });

      if (result.finalPayload.status === 'error') {
        onError?.('Verification failed');
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
        setNullifierHash(data.nullifier_hash);
        setVerificationLevel(data.verification_level || 'device');
        onSuccess();
      } else {
        const errorData = await verifyRes.json();
        onError?.(errorData.error || 'Verification failed');
      }
    } catch (err) {
      console.error('[WorldID] Error:', err);
      onError?.(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-6">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-white mb-3">Verify Human</h2>
      <p className="text-white/70 text-center mb-6 max-w-xs">
        Prove you&apos;re a real human with World ID to earn rewards
      </p>

      <div className="bg-white/5 rounded-xl p-4 mb-6 max-w-xs w-full">
        <ul className="text-white/60 text-sm space-y-2">
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
            <span>Privacy preserved</span>
          </li>
        </ul>
      </div>

      <button
        onClick={handleVerify}
        disabled={loading}
        className="w-full max-w-xs py-4 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Verifying...</span>
          </>
        ) : !miniKitInstalled ? (
          <span>Skip Verification (Browser)</span>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Verify with World ID</span>
          </>
        )}
      </button>

      <p className="mt-4 text-white/40 text-xs text-center">
        Step 2 of 2
      </p>
    </div>
  );
}

export default function AuthFlow({ onComplete, children }: AuthFlowProps) {
  const [step, setStep] = useState<AuthStep>('wallet');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [nullifierHash, setNullifierHash] = useState<string>('');
  const [verificationLevel, setVerificationLevel] = useState<'orb' | 'device'>('device');
  const [error, setError] = useState<string | null>(null);

  const handleWalletSuccess = useCallback(() => {
    setStep('worldid');
    setError(null);
  }, []);

  const handleWorldIDSuccess = useCallback(() => {
    setStep('done');
    setError(null);
    onComplete({
      nullifierHash,
      walletAddress,
      verificationLevel,
    });
  }, [nullifierHash, walletAddress, verificationLevel, onComplete]);

  const handleError = useCallback((err: string) => {
    setError(err);
  }, []);


  if (step === 'done') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex flex-col items-center justify-center">
      {/* Progress indicator */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-3 h-3 rounded-full bg-purple-500" />
        <div className={`w-8 h-0.5 ${step === 'worldid' ? 'bg-purple-500' : 'bg-white/20'}`} />
        <div className={`w-3 h-3 rounded-full ${step === 'worldid' ? 'bg-purple-500' : 'bg-white/20'}`} />
        <div className="w-8 h-0.5 bg-white/20" />
        <div className="w-3 h-3 rounded-full bg-white/20" />
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl max-w-xs text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Current step */}
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden max-w-sm w-full mx-4">
        {step === 'wallet' && (
          <WalletAuthStep
            onSuccess={handleWalletSuccess}
            onError={handleError}
            setWalletAddress={setWalletAddress}
          />
        )}
        {step === 'worldid' && (
          <WorldIDStep
            onSuccess={handleWorldIDSuccess}
            onError={handleError}
            setNullifierHash={setNullifierHash}
            setVerificationLevel={setVerificationLevel}
          />
        )}
      </div>

      {/* App branding */}
      <div className="mt-8 text-center">
        <h1 className="text-xl font-bold text-white">AdWatch</h1>
        <p className="text-white/40 text-sm">Watch ads. Earn rewards.</p>
      </div>
    </div>
  );
}
