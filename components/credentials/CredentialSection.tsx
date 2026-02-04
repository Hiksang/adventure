'use client';

import { useState, useCallback } from 'react';
import { UserCredentials, getStoredCredentials, storeCredentials } from '@/lib/worldid/credentials';
import CredentialStatus, { TargetingBenefits } from './CredentialStatus';
import CredentialVerificationPrompt from './CredentialVerificationPrompt';

interface CredentialSectionProps {
  nullifierHash: string;
  verificationLevel: 'orb' | 'device' | 'passport';
  initialCredentials?: UserCredentials | null;
  onCredentialUpdate?: (credentials: UserCredentials) => void;
}

export default function CredentialSection({
  nullifierHash,
  verificationLevel,
  initialCredentials,
  onCredentialUpdate,
}: CredentialSectionProps) {
  const [credentials, setCredentials] = useState<UserCredentials | null>(
    initialCredentials || getStoredCredentials()
  );
  const [verificationModal, setVerificationModal] = useState<{
    isOpen: boolean;
    type: 'age' | 'nationality';
  }>({ isOpen: false, type: 'age' });

  const handleVerifyAge = useCallback(() => {
    setVerificationModal({ isOpen: true, type: 'age' });
  }, []);

  const handleVerifyNationality = useCallback(() => {
    setVerificationModal({ isOpen: true, type: 'nationality' });
  }, []);

  const handleCloseModal = useCallback(() => {
    setVerificationModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleVerificationSuccess = useCallback(
    (type: 'age' | 'nationality', value: string) => {
      const updatedCredentials: UserCredentials = {
        ...credentials,
        nullifierHash,
        verificationLevel,
        lastUpdated: new Date().toISOString(),
        ...(type === 'age'
          ? { ageVerified: true, ageRange: value as UserCredentials['ageRange'] }
          : { nationalityVerified: true, nationality: value as UserCredentials['nationality'] }),
      };

      storeCredentials(updatedCredentials);
      setCredentials(updatedCredentials);
      onCredentialUpdate?.(updatedCredentials);
    },
    [credentials, nullifierHash, verificationLevel, onCredentialUpdate]
  );

  return (
    <div className="space-y-4">
      {/* Credential Status */}
      <CredentialStatus
        credentials={credentials}
        onVerifyAge={handleVerifyAge}
        onVerifyNationality={handleVerifyNationality}
      />

      {/* Targeting Benefits */}
      <TargetingBenefits credentials={credentials} />

      {/* Verification Modal */}
      <CredentialVerificationPrompt
        type={verificationModal.type}
        isOpen={verificationModal.isOpen}
        onClose={handleCloseModal}
        onSuccess={handleVerificationSuccess}
      />
    </div>
  );
}

/**
 * Compact credential indicator for use in headers/cards
 */
export function CredentialIndicator({
  credentials,
}: {
  credentials: UserCredentials | null;
}) {
  if (!credentials?.ageVerified && !credentials?.nationalityVerified) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {credentials.ageVerified && (
        <span
          className="w-2 h-2 rounded-full bg-purple-400"
          title={`Age: ${credentials.ageRange}`}
        />
      )}
      {credentials.nationalityVerified && (
        <span
          className="w-2 h-2 rounded-full bg-blue-400"
          title={`Nationality: ${credentials.nationality}`}
        />
      )}
    </div>
  );
}

/**
 * Targeted ad badge for showing premium rewards
 */
export function TargetedAdBadge({
  premium,
}: {
  premium: number;
}) {
  if (premium <= 1) return null;

  const bonusPercent = Math.round((premium - 1) * 100);

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-500 text-black">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      +{bonusPercent}% XP
    </span>
  );
}
