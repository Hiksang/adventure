/**
 * Re-verification System
 *
 * When suspicious behavior is detected, request additional World ID verification
 * with a different action - this produces a different nullifier, making it
 * impossible to link to the original identity.
 */

import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js';
import { IS_DEV } from '@/lib/env';

export interface ReVerificationRequest {
  nullifierHash: string;
  action: string;
  reason: ReVerificationReason;
  createdAt: number;
  expiresAt: number;
}

export type ReVerificationReason =
  | 'suspicious_behavior'
  | 'high_value_action'
  | 'periodic_check'
  | 'admin_request';

// Actions for re-verification (each produces a different nullifier)
export const REVERIFICATION_ACTIONS = {
  BEHAVIOR_CHECK: 'adwatch-behavior-check',
  WITHDRAWAL: 'adwatch-withdrawal',
  HIGH_REWARD: 'adwatch-high-reward',
  PERIODIC: 'adwatch-periodic-verify',
} as const;

// In-memory store for pending re-verifications
const pendingReVerifications = new Map<string, ReVerificationRequest>();

/**
 * Request re-verification from user
 */
export function requestReVerification(
  nullifierHash: string,
  reason: ReVerificationReason
): ReVerificationRequest {
  // Generate action based on reason
  let action: string;
  switch (reason) {
    case 'suspicious_behavior':
      action = REVERIFICATION_ACTIONS.BEHAVIOR_CHECK;
      break;
    case 'high_value_action':
      action = REVERIFICATION_ACTIONS.WITHDRAWAL;
      break;
    case 'periodic_check':
      action = REVERIFICATION_ACTIONS.PERIODIC;
      break;
    default:
      action = REVERIFICATION_ACTIONS.BEHAVIOR_CHECK;
  }

  const request: ReVerificationRequest = {
    nullifierHash,
    action,
    reason,
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  };

  pendingReVerifications.set(nullifierHash, request);
  return request;
}

/**
 * Check if user has pending re-verification
 */
export function getPendingReVerification(nullifierHash: string): ReVerificationRequest | null {
  const request = pendingReVerifications.get(nullifierHash);

  if (!request) return null;

  // Check if expired
  if (request.expiresAt < Date.now()) {
    pendingReVerifications.delete(nullifierHash);
    return null;
  }

  return request;
}

/**
 * Complete re-verification
 */
export function completeReVerification(nullifierHash: string): boolean {
  const request = pendingReVerifications.get(nullifierHash);
  if (!request) return false;

  pendingReVerifications.delete(nullifierHash);
  return true;
}

/**
 * Client-side: Trigger World ID re-verification
 */
export async function triggerReVerification(
  action: string,
  onSuccess: (newNullifier: string) => void,
  onError: (error: string) => void
): Promise<void> {
  if (IS_DEV) {
    // Simulate success in dev mode
    onSuccess('dev-reverify-nullifier-' + Date.now());
    return;
  }

  try {
    const result = await MiniKit.commandsAsync.verify({
      action,
      verification_level: VerificationLevel.Orb,
    });

    if (result.finalPayload.status === 'error') {
      onError('Verification failed');
      return;
    }

    // Verify with backend
    const verifyRes = await fetch('/api/verify-worldid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload: result.finalPayload,
        action,
      }),
    });

    if (verifyRes.ok) {
      const data = await verifyRes.json();
      onSuccess(data.nullifier_hash);
    } else {
      const errorData = await verifyRes.json();
      onError(errorData.error || 'Verification failed');
    }
  } catch (err) {
    console.error('[ReVerification] Error:', err);
    onError(err instanceof Error ? err.message : 'Unknown error');
  }
}

/**
 * Get reason message for UI
 */
export function getReVerificationMessage(reason: ReVerificationReason): {
  title: string;
  description: string;
} {
  switch (reason) {
    case 'suspicious_behavior':
      return {
        title: 'Security Check Required',
        description: 'We detected unusual activity. Please verify you\'re human to continue.',
      };
    case 'high_value_action':
      return {
        title: 'Verification Required',
        description: 'This action requires additional verification for your security.',
      };
    case 'periodic_check':
      return {
        title: 'Routine Verification',
        description: 'Time for a quick verification check to keep your account secure.',
      };
    case 'admin_request':
      return {
        title: 'Verification Required',
        description: 'An administrator has requested verification of your account.',
      };
    default:
      return {
        title: 'Verification Required',
        description: 'Please verify your identity to continue.',
      };
  }
}
