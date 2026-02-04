'use client';

import { AgeRange, CountryCode, AGE_RANGES, SUPPORTED_COUNTRIES, UserCredentials } from '@/lib/worldid/credentials';

interface CredentialStatusProps {
  credentials: UserCredentials | null;
  onVerifyAge?: () => void;
  onVerifyNationality?: () => void;
  compact?: boolean;
}

export default function CredentialStatus({
  credentials,
  onVerifyAge,
  onVerifyNationality,
  compact = false,
}: CredentialStatusProps) {
  const ageLabel = credentials?.ageRange
    ? AGE_RANGES[credentials.ageRange as AgeRange]?.label
    : null;
  const nationalityLabel = credentials?.nationality
    ? SUPPORTED_COUNTRIES[credentials.nationality as CountryCode]
    : null;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {credentials?.ageVerified && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {ageLabel}
          </span>
        )}
        {credentials?.nationalityVerified && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
            {nationalityLabel}
          </span>
        )}
        {!credentials?.ageVerified && !credentials?.nationalityVerified && (
          <span className="text-xs text-white/50">No credentials verified</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Verified Credentials
      </h3>

      {/* Age Credential */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            credentials?.ageVerified
              ? 'bg-gradient-to-br from-purple-400 to-purple-600'
              : 'bg-white/10'
          }`}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-medium">Age Range</p>
            <p className="text-sm text-white/60">
              {credentials?.ageVerified
                ? `Verified: ${ageLabel}`
                : 'Not verified'}
            </p>
          </div>
        </div>
        {credentials?.ageVerified ? (
          <span className="text-green-400 text-sm font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Verified
          </span>
        ) : onVerifyAge ? (
          <button
            onClick={onVerifyAge}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
          >
            Verify
          </button>
        ) : (
          <span className="text-yellow-400 text-sm">Pending</span>
        )}
      </div>

      {/* Nationality Credential */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            credentials?.nationalityVerified
              ? 'bg-gradient-to-br from-blue-400 to-blue-600'
              : 'bg-white/10'
          }`}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
          </div>
          <div>
            <p className="text-white font-medium">Nationality</p>
            <p className="text-sm text-white/60">
              {credentials?.nationalityVerified
                ? `Verified: ${nationalityLabel}`
                : 'Not verified'}
            </p>
          </div>
        </div>
        {credentials?.nationalityVerified ? (
          <span className="text-green-400 text-sm font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Verified
          </span>
        ) : onVerifyNationality ? (
          <button
            onClick={onVerifyNationality}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            Verify
          </button>
        ) : (
          <span className="text-yellow-400 text-sm">Pending</span>
        )}
      </div>

      {/* Privacy note */}
      <p className="text-xs text-white/40 flex items-start gap-2">
        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>
          Credentials are verified using Zero-Knowledge Proofs. We only know if you meet the criteria, not your actual age or passport details.
        </span>
      </p>
    </div>
  );
}

/**
 * Targeting benefits indicator
 */
export function TargetingBenefits({
  credentials,
}: {
  credentials: UserCredentials | null;
}) {
  const hasCredentials = credentials?.ageVerified || credentials?.nationalityVerified;

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl p-4 border border-purple-500/20">
      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        Targeted Ad Benefits
      </h4>

      <ul className="space-y-2 text-sm">
        <li className="flex items-center gap-2">
          <span className={hasCredentials ? 'text-green-400' : 'text-white/40'}>
            {hasCredentials ? '✓' : '○'}
          </span>
          <span className={hasCredentials ? 'text-white' : 'text-white/60'}>
            See relevant ads for your demographics
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className={hasCredentials ? 'text-green-400' : 'text-white/40'}>
            {hasCredentials ? '✓' : '○'}
          </span>
          <span className={hasCredentials ? 'text-white' : 'text-white/60'}>
            Earn up to 50% more XP on targeted ads
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className={hasCredentials ? 'text-green-400' : 'text-white/40'}>
            {hasCredentials ? '✓' : '○'}
          </span>
          <span className={hasCredentials ? 'text-white' : 'text-white/60'}>
            Access exclusive regional promotions
          </span>
        </li>
      </ul>

      {!hasCredentials && (
        <p className="mt-3 text-xs text-white/50">
          Verify your credentials to unlock these benefits
        </p>
      )}
    </div>
  );
}
