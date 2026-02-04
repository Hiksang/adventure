'use client';
import { ReactNode } from 'react';
import { IS_DEV } from '@/lib/env';

interface WorldIDGateProps {
  children: ReactNode;
  isVerified: boolean;
  verificationLevel?: 'orb' | 'device' | null;
  onVerifyClick: () => void;
  loading?: boolean;
}

export default function WorldIDGate({
  children,
  isVerified,
  verificationLevel,
  onVerifyClick,
  loading = false,
}: WorldIDGateProps) {
  // DEV mode bypass - show children directly
  if (IS_DEV && !isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col">
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-center">
          <span className="text-yellow-400 text-sm">🔧 DEV MODE - World ID Gate bypassed</span>
        </div>
        {children}
      </div>
    );
  }

  // User is verified - show app content
  if (isVerified) {
    return <>{children}</>;
  }

  // User not verified - show gate screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 flex flex-col items-center justify-center p-6">
      {/* World ID Logo */}
      <div className="mb-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-2xl shadow-purple-500/30">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-white mb-4 text-center">
        World ID Required
      </h1>

      {/* Description */}
      <div className="max-w-sm text-center mb-8">
        <p className="text-white/80 mb-4">
          AdWatch uses World ID to ensure every user is a real, unique human.
        </p>
        <div className="bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/10">
          <h3 className="text-white font-semibold mb-3">Why World ID?</h3>
          <ul className="text-white/70 text-sm space-y-2 text-left">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>1 person = 1 account (no bots or multi-accounts)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>Fair rewards distribution for real humans</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>Privacy-preserving: we don&apos;t know who you are</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>100% verified ad views for advertisers</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Verification Button */}
      <button
        onClick={onVerifyClick}
        disabled={loading}
        className="w-full max-w-sm py-4 px-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-2xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Verifying...</span>
          </>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Verify with World ID</span>
          </>
        )}
      </button>

      {/* Verification Level Info */}
      {verificationLevel && (
        <p className="mt-4 text-white/50 text-sm">
          Verification level: {verificationLevel === 'orb' ? 'Orb (Highest)' : 'Device'}
        </p>
      )}

      {/* Footer */}
      <p className="mt-8 text-white/40 text-xs text-center max-w-xs">
        By continuing, you agree to verify your unique human identity through World ID.
        Your privacy is protected with zero-knowledge proofs.
      </p>
    </div>
  );
}
