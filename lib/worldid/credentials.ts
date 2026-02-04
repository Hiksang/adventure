/**
 * World ID Credentials Verification
 *
 * ZKP-based credential verification for age and nationality.
 * Privacy-preserving: only "yes/no" answers, no actual data shared.
 *
 * Note: Full credential API (World ID 3.0) integration pending official MiniKit support.
 * Current implementation uses verified self-attestation with World ID as foundation.
 */

import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js';
import { IS_DEV } from '@/lib/env';

// Supported countries for nationality verification
export const SUPPORTED_COUNTRIES = {
  KR: '한국',
  US: 'United States',
  JP: '日本',
  GB: 'United Kingdom',
  SG: 'Singapore',
  TW: '台灣',
  MY: 'Malaysia',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  CR: 'Costa Rica',
  MX: 'México',
  PA: 'Panamá',
} as const;

export type CountryCode = keyof typeof SUPPORTED_COUNTRIES;

// Age ranges for targeting
export const AGE_RANGES = {
  '18-24': { min: 18, max: 24, label: '18-24세' },
  '25-34': { min: 25, max: 34, label: '25-34세' },
  '35-44': { min: 35, max: 44, label: '35-44세' },
  '45-54': { min: 45, max: 54, label: '45-54세' },
  '55+': { min: 55, max: 999, label: '55세 이상' },
} as const;

export type AgeRange = keyof typeof AGE_RANGES;

// User's verified credentials (stored locally, verified via World ID)
export interface UserCredentials {
  nullifierHash: string;
  verificationLevel: 'orb' | 'device' | 'passport';
  // Verified attributes (ZKP-based when API available)
  ageVerified?: boolean;
  ageRange?: AgeRange;
  nationalityVerified?: boolean;
  nationality?: CountryCode;
  // Timestamps
  credentialsVerifiedAt?: string;
  lastUpdated: string;
}

// Targeting criteria for ads
export interface AdTargeting {
  minAge?: number;
  maxAge?: number;
  ageRanges?: AgeRange[];
  nationalities?: CountryCode[];
  verificationLevelRequired?: 'orb' | 'device' | 'passport' | 'any';
}

/**
 * Check if user meets ad targeting criteria
 * Returns true only if ALL criteria are met (or criteria is not set)
 */
export function meetsTargetingCriteria(
  userCredentials: UserCredentials | null,
  targeting: AdTargeting | null
): boolean {
  // No targeting = everyone can see
  if (!targeting) return true;

  // No credentials = only see non-targeted ads
  if (!userCredentials) return false;

  // Check verification level
  if (targeting.verificationLevelRequired && targeting.verificationLevelRequired !== 'any') {
    const levelHierarchy = { passport: 3, orb: 2, device: 1 };
    const required = levelHierarchy[targeting.verificationLevelRequired] || 0;
    const actual = levelHierarchy[userCredentials.verificationLevel] || 0;
    if (actual < required) return false;
  }

  // Check age range
  if (targeting.ageRanges && targeting.ageRanges.length > 0) {
    if (!userCredentials.ageVerified || !userCredentials.ageRange) return false;
    if (!targeting.ageRanges.includes(userCredentials.ageRange)) return false;
  }

  // Check nationality
  if (targeting.nationalities && targeting.nationalities.length > 0) {
    if (!userCredentials.nationalityVerified || !userCredentials.nationality) return false;
    if (!targeting.nationalities.includes(userCredentials.nationality)) return false;
  }

  return true;
}

/**
 * Verify age credential via World ID
 * When full credential API is available, this will use ZKP
 */
export async function verifyAgeCredential(
  ageRange: AgeRange
): Promise<{ verified: boolean; error?: string }> {
  if (IS_DEV) {
    return { verified: true };
  }

  try {
    // Current implementation: verify World ID first, then attest age range
    // Future: will use MiniKit.commandsAsync.verifyCredential() when available
    const result = await MiniKit.commandsAsync.verify({
      action: `adwatch-age-${ageRange}`,
      verification_level: VerificationLevel.Device,
    });

    if (result.finalPayload.status === 'error') {
      return { verified: false, error: 'Verification failed' };
    }

    // Verify on backend
    const verifyRes = await fetch('/api/credentials/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'age',
        value: ageRange,
        payload: result.finalPayload,
        action: `adwatch-age-${ageRange}`,
      }),
    });

    if (!verifyRes.ok) {
      const error = await verifyRes.json();
      return { verified: false, error: error.message || 'Verification failed' };
    }

    return { verified: true };
  } catch (error) {
    console.error('[Credentials] Age verification error:', error);
    return { verified: false, error: 'Verification failed' };
  }
}

/**
 * Verify nationality credential via World ID
 * When full credential API is available, this will use ZKP
 */
export async function verifyNationalityCredential(
  nationality: CountryCode
): Promise<{ verified: boolean; error?: string }> {
  if (IS_DEV) {
    return { verified: true };
  }

  try {
    // Current implementation: verify World ID with nationality action
    // Future: will use passport NFC + ZKP
    const result = await MiniKit.commandsAsync.verify({
      action: `adwatch-nationality-${nationality}`,
      verification_level: VerificationLevel.Device,
    });

    if (result.finalPayload.status === 'error') {
      return { verified: false, error: 'Verification failed' };
    }

    // Verify on backend
    const verifyRes = await fetch('/api/credentials/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'nationality',
        value: nationality,
        payload: result.finalPayload,
        action: `adwatch-nationality-${nationality}`,
      }),
    });

    if (!verifyRes.ok) {
      const error = await verifyRes.json();
      return { verified: false, error: error.message || 'Verification failed' };
    }

    return { verified: true };
  } catch (error) {
    console.error('[Credentials] Nationality verification error:', error);
    return { verified: false, error: 'Verification failed' };
  }
}

/**
 * Get user's verified credentials from local storage
 */
export function getStoredCredentials(): UserCredentials | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem('adwatch_credentials');
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Store user's verified credentials locally
 */
export function storeCredentials(credentials: UserCredentials): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem('adwatch_credentials', JSON.stringify({
    ...credentials,
    lastUpdated: new Date().toISOString(),
  }));
}

/**
 * Update specific credential
 */
export function updateCredential(
  type: 'age' | 'nationality',
  value: AgeRange | CountryCode
): void {
  const existing = getStoredCredentials();
  if (!existing) return;

  if (type === 'age') {
    storeCredentials({
      ...existing,
      ageVerified: true,
      ageRange: value as AgeRange,
      credentialsVerifiedAt: new Date().toISOString(),
    });
  } else {
    storeCredentials({
      ...existing,
      nationalityVerified: true,
      nationality: value as CountryCode,
      credentialsVerifiedAt: new Date().toISOString(),
    });
  }
}

/**
 * Clear all credentials
 */
export function clearCredentials(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('adwatch_credentials');
}

/**
 * Format targeting criteria for display
 */
export function formatTargetingCriteria(targeting: AdTargeting): string {
  const parts: string[] = [];

  if (targeting.ageRanges && targeting.ageRanges.length > 0) {
    const ageLabels = targeting.ageRanges.map(r => AGE_RANGES[r]?.label || r);
    parts.push(`연령: ${ageLabels.join(', ')}`);
  }

  if (targeting.nationalities && targeting.nationalities.length > 0) {
    const countryNames = targeting.nationalities.map(c => SUPPORTED_COUNTRIES[c] || c);
    parts.push(`국적: ${countryNames.join(', ')}`);
  }

  if (targeting.verificationLevelRequired && targeting.verificationLevelRequired !== 'any') {
    const levelNames = { orb: 'Orb 인증', device: 'Device 인증', passport: '여권 인증' };
    parts.push(`필요 인증: ${levelNames[targeting.verificationLevelRequired]}`);
  }

  return parts.length > 0 ? parts.join(' | ') : '모든 사용자';
}

/**
 * Calculate premium multiplier for targeted ads
 * More specific targeting = higher reward
 */
export function getTargetingPremium(targeting: AdTargeting): number {
  let multiplier = 1.0;

  // Age targeting: +20%
  if (targeting.ageRanges && targeting.ageRanges.length > 0) {
    multiplier += 0.2;
  }

  // Nationality targeting: +30%
  if (targeting.nationalities && targeting.nationalities.length > 0) {
    multiplier += 0.3;
  }

  // High verification level: +10-30%
  if (targeting.verificationLevelRequired === 'orb') {
    multiplier += 0.2;
  } else if (targeting.verificationLevelRequired === 'passport') {
    multiplier += 0.3;
  }

  return multiplier;
}
