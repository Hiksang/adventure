/**
 * Security Module Index
 *
 * Exports all security utilities for easy importing.
 */

// Rate limiting
export {
  checkRateLimit,
  rateLimitResponse,
  checkCombinedRateLimit,
  getClientIP,
  RATE_LIMITS,
  type RateLimitType,
} from './rateLimit';

// Input validation
export {
  // Type guards
  isValidNullifierHash,
  isValidWalletAddress,
  isValidUUID,
  isValidTxHash,
  isValidPositiveInteger,
  isValidPositiveNumber,
  isValidUsername,
  isValidCreditsAmount,
  isValidXPAmount,
  isValidViewDuration,
  // Sanitization
  sanitizeString,
  // Request parsing
  parseJsonBody,
  // Validation
  validationError,
  validateClaimSignatureRequest,
  validateAdViewRequest,
  validateWLDRedemptionRequest,
  // Constants
  CREDIT_LIMITS,
  type ValidationError,
} from './validation';

// Atomic credit operations
export {
  atomicAddCredits,
  atomicDeductCredits,
  atomicRedeemForWLD,
  atomicRedeemForGiftcard,
  type AtomicCreditResult,
  type AtomicRedemptionResult,
} from './atomicCredits';
