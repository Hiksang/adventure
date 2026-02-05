/**
 * Input Validation Module
 *
 * Provides secure input validation for API endpoints.
 */

// ============ Type Guards ============

/**
 * Validate World ID nullifier hash format
 * Format: 0x + 64 hex characters (256-bit hash)
 */
export function isValidNullifierHash(hash: unknown): hash is string {
  if (typeof hash !== 'string') return false;
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Validate Ethereum wallet address format
 */
export function isValidWalletAddress(address: unknown): address is string {
  if (typeof address !== 'string') return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: unknown): uuid is string {
  if (typeof uuid !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * Validate transaction hash format
 */
export function isValidTxHash(hash: unknown): hash is string {
  if (typeof hash !== 'string') return false;
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

// ============ Number Validation ============

/**
 * Validate positive integer within bounds
 */
export function isValidPositiveInteger(
  value: unknown,
  min: number = 1,
  max: number = Number.MAX_SAFE_INTEGER
): value is number {
  if (typeof value !== 'number') return false;
  if (!Number.isFinite(value)) return false;
  if (!Number.isInteger(value)) return false;
  return value >= min && value <= max;
}

/**
 * Validate positive number (allows decimals)
 */
export function isValidPositiveNumber(
  value: unknown,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER
): value is number {
  if (typeof value !== 'number') return false;
  if (!Number.isFinite(value)) return false;
  return value >= min && value <= max;
}

// ============ String Validation ============

/**
 * Sanitize string input - remove null bytes and control characters
 */
export function sanitizeString(
  input: unknown,
  maxLength: number = 255
): string | null {
  if (typeof input !== 'string') return null;
  // Remove null bytes and control characters (except newline, tab)
  const sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  if (sanitized.length > maxLength) return null;
  return sanitized;
}

/**
 * Validate username format
 */
export function isValidUsername(username: unknown): username is string {
  if (typeof username !== 'string') return false;
  const trimmed = username.trim();
  if (trimmed.length < 1 || trimmed.length > 50) return false;
  // Allow alphanumeric, underscore, space, and some Unicode letters
  return /^[\w\s\u00C0-\u024F]+$/u.test(trimmed);
}

// ============ Credit System Validation ============

export const CREDIT_LIMITS = {
  MAX_CREDITS_PER_REDEMPTION: 10_000_000, // 10 million credits max
  MAX_XP_PER_VIEW: 100,
  MAX_VIEW_DURATION_MS: 600_000, // 10 minutes
  MIN_VIEW_DURATION_MS: 1_000, // 1 second
  MAX_AMOUNT_OVERRIDE: 1_000,
};

/**
 * Validate credits amount for redemption
 */
export function isValidCreditsAmount(credits: unknown): credits is number {
  return isValidPositiveInteger(credits, 1, CREDIT_LIMITS.MAX_CREDITS_PER_REDEMPTION);
}

/**
 * Validate XP amount
 */
export function isValidXPAmount(xp: unknown): xp is number {
  return isValidPositiveInteger(xp, 0, CREDIT_LIMITS.MAX_XP_PER_VIEW);
}

/**
 * Validate view duration
 */
export function isValidViewDuration(duration: unknown): duration is number {
  return isValidPositiveInteger(
    duration,
    CREDIT_LIMITS.MIN_VIEW_DURATION_MS,
    CREDIT_LIMITS.MAX_VIEW_DURATION_MS
  );
}

// ============ Request Body Parsing ============

interface ParseResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Safely parse JSON request body
 */
export async function parseJsonBody<T extends Record<string, unknown>>(
  request: Request
): Promise<ParseResult<T>> {
  try {
    const body = await request.json();
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return { data: null, error: 'Invalid request body: expected object' };
    }
    return { data: body as T, error: null };
  } catch {
    return { data: null, error: 'Invalid JSON format' };
  }
}

// ============ Validation Error Response ============

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Create validation error response
 */
export function validationError(errors: ValidationError[]): {
  error: string;
  details: ValidationError[];
} {
  return {
    error: 'VALIDATION_ERROR',
    details: errors,
  };
}

// ============ Common Validators ============

/**
 * Validate claim signature request body
 */
export function validateClaimSignatureRequest(body: Record<string, unknown>): {
  valid: boolean;
  errors: ValidationError[];
  data?: { nullifier_hash: string; wallet_address: string };
} {
  const errors: ValidationError[] = [];

  if (!isValidNullifierHash(body.nullifier_hash)) {
    errors.push({ field: 'nullifier_hash', message: 'Invalid nullifier hash format' });
  }

  if (!isValidWalletAddress(body.wallet_address)) {
    errors.push({ field: 'wallet_address', message: 'Invalid wallet address format' });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      nullifier_hash: body.nullifier_hash as string,
      wallet_address: body.wallet_address as string,
    },
  };
}

/**
 * Validate ad view complete request body
 */
export function validateAdViewRequest(body: Record<string, unknown>): {
  valid: boolean;
  errors: ValidationError[];
  data?: {
    userId: string;
    adId: string;
    viewToken: string;
    expectedXP: number;
    nullifierHash: string;
    viewDuration?: number;
  };
} {
  const errors: ValidationError[] = [];

  if (!body.userId || typeof body.userId !== 'string') {
    errors.push({ field: 'userId', message: 'User ID is required' });
  }

  if (!body.adId || typeof body.adId !== 'string') {
    errors.push({ field: 'adId', message: 'Ad ID is required' });
  }

  if (!body.viewToken || typeof body.viewToken !== 'string') {
    errors.push({ field: 'viewToken', message: 'View token is required' });
  }

  if (!isValidXPAmount(body.expectedXP)) {
    errors.push({ field: 'expectedXP', message: `XP must be 0-${CREDIT_LIMITS.MAX_XP_PER_VIEW}` });
  }

  if (!isValidNullifierHash(body.nullifierHash)) {
    errors.push({ field: 'nullifierHash', message: 'Invalid nullifier hash format' });
  }

  if (body.viewDuration !== undefined && !isValidViewDuration(body.viewDuration)) {
    errors.push({
      field: 'viewDuration',
      message: `Duration must be ${CREDIT_LIMITS.MIN_VIEW_DURATION_MS}-${CREDIT_LIMITS.MAX_VIEW_DURATION_MS}ms`,
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      userId: body.userId as string,
      adId: body.adId as string,
      viewToken: body.viewToken as string,
      expectedXP: body.expectedXP as number,
      nullifierHash: body.nullifierHash as string,
      viewDuration: body.viewDuration as number | undefined,
    },
  };
}

/**
 * Validate WLD redemption request
 */
export function validateWLDRedemptionRequest(body: Record<string, unknown>): {
  valid: boolean;
  errors: ValidationError[];
  data?: {
    nullifier_hash: string;
    credits: number;
    wallet_address?: string;
  };
} {
  const errors: ValidationError[] = [];

  if (!isValidNullifierHash(body.nullifier_hash)) {
    errors.push({ field: 'nullifier_hash', message: 'Invalid nullifier hash format' });
  }

  if (!isValidCreditsAmount(body.credits)) {
    errors.push({
      field: 'credits',
      message: `Credits must be a positive integer up to ${CREDIT_LIMITS.MAX_CREDITS_PER_REDEMPTION}`,
    });
  }

  if (body.wallet_address !== undefined && !isValidWalletAddress(body.wallet_address)) {
    errors.push({ field: 'wallet_address', message: 'Invalid wallet address format' });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      nullifier_hash: body.nullifier_hash as string,
      credits: body.credits as number,
      wallet_address: body.wallet_address as string | undefined,
    },
  };
}
