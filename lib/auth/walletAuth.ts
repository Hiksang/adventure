import { MiniKit } from '@worldcoin/minikit-js';

export interface WalletAuthPayload {
  status: 'success' | 'error';
  message?: string;
  signature?: string;
  address?: string;
  version?: number;
}

export interface WalletAuthResult {
  success: boolean;
  walletAddress?: string;
  signature?: string;
  error?: string;
}

/**
 * Check if MiniKit is available (running inside World App)
 */
export function isMiniKitAvailable(): boolean {
  return typeof window !== 'undefined' && MiniKit.isInstalled();
}

/**
 * Generate a nonce from server for SIWE
 */
export async function fetchNonce(): Promise<string> {
  // If not in World App, use dev nonce
  if (!isMiniKitAvailable()) {
    return `dev-nonce-${Date.now()}`;
  }

  const response = await fetch('/api/auth/wallet/nonce', {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to get nonce');
  }

  const data = await response.json();
  return data.nonce;
}

/**
 * Initiate Wallet Auth via MiniKit
 * Uses Sign-In with Ethereum (SIWE) for authentication
 *
 * If running outside World App (browser), returns mock data for development.
 * If running inside World App, uses real MiniKit authentication.
 */
export async function initiateWalletAuth(): Promise<WalletAuthResult> {
  // If not in World App, use dev mock
  if (!isMiniKitAvailable()) {
    console.log('[WalletAuth] MiniKit not installed, using dev mode');
    return {
      success: true,
      walletAddress: '0xDEV0000000000000000000000000000000000001',
      signature: 'dev-signature-' + Date.now(),
    };
  }

  try {
    console.log('[WalletAuth] MiniKit installed, using real authentication');

    // Get nonce from server
    const nonce = await fetchNonce();

    // Request wallet auth from World App
    const result = await MiniKit.commandsAsync.walletAuth({
      nonce,
      statement: 'Sign in to AdWatch',
      expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    const payload = result.finalPayload as WalletAuthPayload;

    if (payload.status === 'error') {
      return {
        success: false,
        error: payload.message || 'Wallet auth failed',
      };
    }

    // Verify on server
    const verifyResponse = await fetch('/api/auth/wallet/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload,
        nonce,
      }),
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json();
      return {
        success: false,
        error: errorData.error || 'Verification failed',
      };
    }

    const verifyData = await verifyResponse.json();

    return {
      success: true,
      walletAddress: verifyData.walletAddress,
      signature: payload.signature,
    };
  } catch (error) {
    console.error('[WalletAuth] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Derive encryption key from wallet signature
 * Used for encrypting ad history client-side
 */
export function deriveEncryptionKey(signature: string): CryptoKey | null {
  if (typeof window === 'undefined') return null;

  // In real implementation, use proper key derivation
  // This is a simplified version
  return null; // Will be implemented in encryptedHistory.ts
}
