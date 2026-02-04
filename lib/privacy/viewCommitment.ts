/**
 * View Commitment System
 *
 * Creates verifiable commitments to ad views without revealing which ads were viewed.
 * Allows advertisers to verify aggregate view counts while preserving user privacy.
 */

/**
 * Generate a commitment hash for a daily viewing session
 * This can be verified later without revealing individual ads
 */
export async function generateDailyCommitment(
  nullifierHash: string,
  date: string,
  viewCount: number,
  secretSalt: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${nullifierHash}:${date}:${viewCount}:${secretSalt}`);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);

  return Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify a commitment matches the claimed values
 */
export async function verifyCommitment(
  commitment: string,
  nullifierHash: string,
  date: string,
  viewCount: number,
  secretSalt: string
): Promise<boolean> {
  const expectedCommitment = await generateDailyCommitment(
    nullifierHash,
    date,
    viewCount,
    secretSalt
  );

  return commitment === expectedCommitment;
}

/**
 * Generate a proof that user watched at least N ads without revealing which ones
 */
export interface ViewCountProof {
  nullifierHash: string;
  date: string;
  minViews: number;
  commitment: string;
  timestamp: number;
}

export async function generateViewCountProof(
  nullifierHash: string,
  date: string,
  actualViewCount: number,
  minViews: number,
  secretSalt: string
): Promise<ViewCountProof | null> {
  if (actualViewCount < minViews) {
    return null;
  }

  const commitment = await generateDailyCommitment(
    nullifierHash,
    date,
    actualViewCount,
    secretSalt
  );

  return {
    nullifierHash,
    date,
    minViews,
    commitment,
    timestamp: Date.now(),
  };
}

/**
 * Create aggregated stats without individual ad information
 * This is what gets shared with advertisers
 */
export interface AggregatedViewStats {
  date: string;
  totalUniqueViewers: number;  // Distinct nullifier hashes
  totalViews: number;          // Sum of all views
  avgViewsPerUser: number;
  verificationLevelBreakdown: {
    orb: number;
    device: number;
  };
}

/**
 * Hash an ad ID for commitment without revealing it
 */
export async function hashAdId(adId: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${adId}:${salt}`);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);

  // Return first 16 bytes as hex (shorter identifier)
  return Array.from(hashArray.slice(0, 16))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
