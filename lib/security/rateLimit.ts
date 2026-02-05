/**
 * Rate Limiting Module
 *
 * Provides in-memory rate limiting for API endpoints.
 * For production, consider using Redis-based rate limiting (@upstash/ratelimit).
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configurations
export const RATE_LIMITS = {
  // Signature requests: 5 per minute per user, 10 per minute per IP
  claimSignature: { windowMs: 60_000, maxRequests: 5 },

  // Credit earn: 60 per minute per user
  earnCredits: { windowMs: 60_000, maxRequests: 60 },

  // Redemptions: 5 per hour per user
  redemption: { windowMs: 3600_000, maxRequests: 5 },

  // Ad view: 100 per minute per user
  adView: { windowMs: 60_000, maxRequests: 100 },

  // Read APIs: 100 per minute per IP
  readApi: { windowMs: 60_000, maxRequests: 100 },

  // Auth: 10 per minute per IP
  auth: { windowMs: 60_000, maxRequests: 10 },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * Get client IP from request
 */
export function getClientIP(request: NextRequest | Request): string {
  if ('headers' in request) {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    return forwarded?.split(',')[0]?.trim() || realIP || 'unknown';
  }
  return 'unknown';
}

/**
 * Check rate limit
 */
export function checkRateLimit(
  identifier: string,
  limitType: RateLimitType
): { allowed: boolean; remaining: number; resetAt: number } {
  const config = RATE_LIMITS[limitType];
  const key = `${limitType}:${identifier}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Reset if window expired
  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    rateLimitStore.set(key, entry);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment and allow
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Rate limit middleware helper
 */
export function rateLimitResponse(
  identifier: string,
  limitType: RateLimitType
): NextResponse | null {
  const result = checkRateLimit(identifier, limitType);

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retry_after: retryAfter,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt.toString(),
          'Retry-After': retryAfter.toString(),
        },
      }
    );
  }

  return null;
}

/**
 * Combined user + IP rate limit check
 */
export function checkCombinedRateLimit(
  userId: string,
  ip: string,
  limitType: RateLimitType
): NextResponse | null {
  // Check IP first (catches DDoS)
  const ipCheck = rateLimitResponse(`ip:${ip}`, limitType);
  if (ipCheck) return ipCheck;

  // Check user
  const userCheck = rateLimitResponse(`user:${userId}`, limitType);
  if (userCheck) return userCheck;

  return null;
}

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}
