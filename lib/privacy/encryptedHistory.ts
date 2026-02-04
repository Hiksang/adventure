/**
 * Client-side encrypted ad history
 *
 * The server only stores an encrypted blob - it cannot know which ads were viewed.
 * Only the client (with the user's wallet signature) can decrypt and read the history.
 */

export interface EncryptedAdHistory {
  encryptedData: string;  // Base64 encoded
  iv: string;             // Base64 encoded
}

export interface AdViewRecord {
  adId: string;
  viewedAt: number;  // timestamp
}

/**
 * Simple XOR-based encryption for ad history
 * In production, use Web Crypto API with proper key derivation
 */
function simpleEncrypt(data: string, key: string): { encrypted: string; iv: string } {
  // Generate random IV
  const ivBytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(ivBytes);
  } else {
    for (let i = 0; i < 16; i++) {
      ivBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // XOR encrypt (simplified - use AES in production)
  const dataBytes = new TextEncoder().encode(data);
  const keyBytes = new TextEncoder().encode(key.slice(0, 32).padEnd(32, '0'));
  const encrypted = new Uint8Array(dataBytes.length);

  for (let i = 0; i < dataBytes.length; i++) {
    encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length] ^ ivBytes[i % ivBytes.length];
  }

  return {
    encrypted: btoa(String.fromCharCode(...encrypted)),
    iv: btoa(String.fromCharCode(...ivBytes)),
  };
}

function simpleDecrypt(encrypted: string, iv: string, key: string): string {
  const encryptedBytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const keyBytes = new TextEncoder().encode(key.slice(0, 32).padEnd(32, '0'));
  const decrypted = new Uint8Array(encryptedBytes.length);

  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length] ^ ivBytes[i % ivBytes.length];
  }

  return new TextDecoder().decode(decrypted);
}

/**
 * Derive an encryption key from wallet signature
 */
export function deriveKeyFromSignature(signature: string): string {
  // Use signature as key (first 64 chars)
  return signature.slice(0, 64);
}

/**
 * Encrypt ad view history client-side
 */
export function encryptAdHistory(
  records: AdViewRecord[],
  key: string
): EncryptedAdHistory {
  const data = JSON.stringify(records);
  const { encrypted, iv } = simpleEncrypt(data, key);

  return {
    encryptedData: encrypted,
    iv,
  };
}

/**
 * Decrypt ad view history client-side
 */
export function decryptAdHistory(
  encrypted: EncryptedAdHistory,
  key: string
): AdViewRecord[] {
  try {
    const jsonString = simpleDecrypt(encrypted.encryptedData, encrypted.iv, key);
    return JSON.parse(jsonString);
  } catch {
    return [];
  }
}

/**
 * Check if an ad has been viewed
 */
export function hasViewedAd(records: AdViewRecord[], adId: string): boolean {
  return records.some(record => record.adId === adId);
}

/**
 * Filter out already-viewed ads
 */
export function filterUnviewedAds<T extends { id: string }>(
  ads: T[],
  viewedRecords: AdViewRecord[]
): T[] {
  const viewedIds = new Set(viewedRecords.map(r => r.adId));
  return ads.filter(ad => !viewedIds.has(ad.id));
}

/**
 * Add a new ad view record
 */
export function addViewRecord(
  records: AdViewRecord[],
  adId: string
): AdViewRecord[] {
  // Avoid duplicates
  if (hasViewedAd(records, adId)) {
    return records;
  }

  return [
    ...records,
    { adId, viewedAt: Date.now() },
  ];
}

/**
 * Clean old records (keep last N days)
 */
export function cleanOldRecords(
  records: AdViewRecord[],
  maxAgeDays: number = 30
): AdViewRecord[] {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  return records.filter(record => record.viewedAt > cutoff);
}

/**
 * Hook-friendly wrapper for managing encrypted history
 */
export class EncryptedHistoryManager {
  private key: string | null = null;
  private records: AdViewRecord[] = [];
  private nullifierHash: string;

  constructor(nullifierHash: string) {
    this.nullifierHash = nullifierHash;
  }

  async initialize(signature: string): Promise<void> {
    this.key = deriveKeyFromSignature(signature);
    await this.loadFromServer();
  }

  private async loadFromServer(): Promise<void> {
    if (!this.key) return;

    try {
      const response = await fetch(
        `/api/privacy/history?nullifier=${encodeURIComponent(this.nullifierHash)}`
      );

      if (!response.ok) {
        this.records = [];
        return;
      }

      const data = await response.json();

      if (data.encrypted) {
        this.records = decryptAdHistory(data.encrypted, this.key);
        this.records = cleanOldRecords(this.records);
      }
    } catch (error) {
      console.error('[EncryptedHistory] Load error:', error);
      this.records = [];
    }
  }

  async saveToServer(): Promise<void> {
    if (!this.key) return;

    try {
      const encrypted = encryptAdHistory(this.records, this.key);

      await fetch('/api/privacy/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nullifier_hash: this.nullifierHash,
          encrypted,
        }),
      });
    } catch (error) {
      console.error('[EncryptedHistory] Save error:', error);
    }
  }

  hasViewed(adId: string): boolean {
    return hasViewedAd(this.records, adId);
  }

  async recordView(adId: string): Promise<void> {
    this.records = addViewRecord(this.records, adId);
    await this.saveToServer();
  }

  filterUnviewed<T extends { id: string }>(ads: T[]): T[] {
    return filterUnviewedAds(ads, this.records);
  }

  getRecords(): AdViewRecord[] {
    return [...this.records];
  }
}
