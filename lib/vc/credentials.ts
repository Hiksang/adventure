/**
 * Verifiable Credentials (VC) for Privacy-Preserving Proofs
 *
 * These credentials prove facts about user activity without revealing
 * specific details (e.g., "user watched 5 ads" without revealing which ads).
 */

export const VC_ISSUER = 'did:web:adwatch.app';
export const VC_CONTEXT = ['https://www.w3.org/2018/credentials/v1'];

/**
 * Base credential structure
 */
export interface VerifiableCredential {
  '@context': string[];
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: Record<string, unknown>;
  proof?: CredentialProof;
}

export interface CredentialProof {
  type: string;
  created: string;
  proofPurpose: string;
  verificationMethod: string;
  signature?: string;
}

/**
 * Daily Ad View Credential
 * Proves user watched ads without revealing which specific ads
 */
export interface DailyAdViewCredential extends VerifiableCredential {
  type: ['VerifiableCredential', 'DailyAdViewCredential'];
  credentialSubject: {
    holder: string;         // nullifier_hash (anonymous)
    viewCount: number;      // How many ads watched
    date: string;           // Which day
    verificationLevel: 'orb' | 'device';
    // Note: NO adIds included - privacy preserved
  };
}

export function createDailyAdViewCredential(
  nullifierHash: string,
  viewCount: number,
  date: string,
  verificationLevel: 'orb' | 'device'
): DailyAdViewCredential {
  const now = new Date().toISOString();

  return {
    '@context': VC_CONTEXT,
    type: ['VerifiableCredential', 'DailyAdViewCredential'],
    issuer: VC_ISSUER,
    issuanceDate: now,
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    credentialSubject: {
      holder: nullifierHash,
      viewCount,
      date,
      verificationLevel,
    },
  };
}

/**
 * Daily Goal Achievement Credential
 * Proves user achieved their daily goal
 */
export interface DailyGoalAchievementCredential extends VerifiableCredential {
  type: ['VerifiableCredential', 'DailyGoalAchievementCredential'];
  credentialSubject: {
    holder: string;
    date: string;
    goalType: 'ad_views' | 'xp_earned';
    achieved: boolean;
    verificationLevel: 'orb' | 'device';
  };
}

export function createDailyGoalAchievementCredential(
  nullifierHash: string,
  date: string,
  goalType: 'ad_views' | 'xp_earned',
  verificationLevel: 'orb' | 'device'
): DailyGoalAchievementCredential {
  const now = new Date().toISOString();

  return {
    '@context': VC_CONTEXT,
    type: ['VerifiableCredential', 'DailyGoalAchievementCredential'],
    issuer: VC_ISSUER,
    issuanceDate: now,
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    credentialSubject: {
      holder: nullifierHash,
      date,
      goalType,
      achieved: true,
      verificationLevel,
    },
  };
}

/**
 * Verified Human Viewer Credential
 * Proves user is a verified human (Orb-level)
 */
export interface VerifiedHumanViewerCredential extends VerifiableCredential {
  type: ['VerifiableCredential', 'VerifiedHumanViewerCredential'];
  credentialSubject: {
    holder: string;
    verificationLevel: 'orb';
    verifiedAt: string;
  };
}

export function createVerifiedHumanViewerCredential(
  nullifierHash: string,
  verifiedAt: string
): VerifiedHumanViewerCredential {
  const now = new Date().toISOString();

  return {
    '@context': VC_CONTEXT,
    type: ['VerifiableCredential', 'VerifiedHumanViewerCredential'],
    issuer: VC_ISSUER,
    issuanceDate: now,
    credentialSubject: {
      holder: nullifierHash,
      verificationLevel: 'orb',
      verifiedAt,
    },
  };
}

/**
 * Streak Achievement Credential
 */
export interface StreakAchievementCredential extends VerifiableCredential {
  type: ['VerifiableCredential', 'StreakAchievementCredential'];
  credentialSubject: {
    holder: string;
    streakDays: number;
    achievedAt: string;
    verificationLevel: 'orb' | 'device';
  };
}

export function createStreakAchievementCredential(
  nullifierHash: string,
  streakDays: number,
  verificationLevel: 'orb' | 'device'
): StreakAchievementCredential {
  const now = new Date().toISOString();

  return {
    '@context': VC_CONTEXT,
    type: ['VerifiableCredential', 'StreakAchievementCredential'],
    issuer: VC_ISSUER,
    issuanceDate: now,
    credentialSubject: {
      holder: nullifierHash,
      streakDays,
      achievedAt: now,
      verificationLevel,
    },
  };
}

/**
 * Sign a credential (simplified - in production use proper signing)
 */
export async function signCredential<T extends VerifiableCredential>(
  credential: T,
  privateKey?: string
): Promise<T> {
  const proof: CredentialProof = {
    type: 'Ed25519Signature2020',
    created: new Date().toISOString(),
    proofPurpose: 'assertionMethod',
    verificationMethod: `${VC_ISSUER}#key-1`,
    // In production: actual cryptographic signature
    signature: privateKey ? 'signed' : undefined,
  };

  return {
    ...credential,
    proof,
  };
}

/**
 * Verify a credential (simplified)
 */
export function verifyCredential(credential: VerifiableCredential): boolean {
  // Check basic structure
  if (!credential['@context'] || !credential.type || !credential.issuer) {
    return false;
  }

  // Check issuer
  if (credential.issuer !== VC_ISSUER) {
    return false;
  }

  // Check expiration
  if (credential.expirationDate) {
    const expiration = new Date(credential.expirationDate);
    if (expiration < new Date()) {
      return false;
    }
  }

  // In production: verify cryptographic signature
  return true;
}

/**
 * What advertisers receive (aggregated, privacy-preserving)
 */
export interface AdvertiserViewReport {
  campaignId: string;
  date: string;
  metrics: {
    totalVerifiedViews: number;
    orbVerifiedViews: number;
    deviceVerifiedViews: number;
    uniqueViewers: number;
  };
  // Note: NO individual user data or ad-level data
}

export function createAdvertiserReport(
  campaignId: string,
  date: string,
  totalViews: number,
  orbViews: number,
  uniqueViewers: number
): AdvertiserViewReport {
  return {
    campaignId,
    date,
    metrics: {
      totalVerifiedViews: totalViews,
      orbVerifiedViews: orbViews,
      deviceVerifiedViews: totalViews - orbViews,
      uniqueViewers,
    },
  };
}
