/**
 * Enhanced Behavior Analysis System for Bot Detection
 *
 * Adds additional detection capabilities beyond the base detector:
 * - Device fingerprint tracking
 * - Timestamp manipulation detection
 * - Off-hours activity analysis
 * - Honeypot trigger tracking
 */

import { analyzeViewBehavior, ViewEvent, BehaviorAnalysis, THRESHOLDS } from './detector';

// ============ Enhanced Types ============

export interface EnhancedViewEvent extends ViewEvent {
  clientTimestamp?: number;
  serverTimestamp?: number;
  userAgent?: string;
  fingerprintHash?: string;
  honeypotTriggered?: boolean;
}

export type EnhancedBehaviorFlag =
  | 'fast_viewing'
  | 'consistent_intervals'
  | 'consistent_duration'
  | 'session_bombing'
  | 'perfect_timing'
  | 'no_interaction'
  | 'linear_progression'
  // New flags
  | 'timestamp_manipulation'
  | 'fingerprint_change'
  | 'off_hours_activity'
  | 'honeypot_triggered'
  | 'suspicious_user_agent';

export interface EnhancedBehaviorAnalysis {
  suspicionScore: number;
  viewTimeVariance: number;
  intervalVariance: number;
  flags: EnhancedBehaviorFlag[];
  recommendation: 'allow' | 'challenge' | 'reverify' | 'block';
  enhancedScore: number;
  reasons: string[];
}

// ============ Enhanced Thresholds ============

const ENHANCED_THRESHOLDS = {
  ...THRESHOLDS,
  TIMESTAMP_DRIFT_MS: 5000, // 5 seconds tolerance
  OFF_HOURS_START: 2, // 2 AM
  OFF_HOURS_END: 5, // 5 AM
  MAX_OFF_HOURS_VIEWS: 5,
  MAX_FINGERPRINT_CHANGES: 3,
};

// ============ Tracking Stores ============

const fingerprintHistory = new Map<string, string[]>();
const honeypotTriggers = new Map<string, number>();

// ============ Detection Functions ============

/**
 * Detect timestamp manipulation (client trying to fake time)
 */
export function detectTimestampManipulation(
  clientTimestamp: number | undefined,
  serverTimestamp: number
): { suspicious: boolean; drift: number } {
  if (!clientTimestamp) {
    return { suspicious: false, drift: 0 };
  }

  const drift = Math.abs(clientTimestamp - serverTimestamp);
  return {
    suspicious: drift > ENHANCED_THRESHOLDS.TIMESTAMP_DRIFT_MS,
    drift,
  };
}

/**
 * Detect suspicious user agents (headless browsers, bots)
 */
export function detectSuspiciousUserAgent(userAgent: string | undefined): {
  suspicious: boolean;
  reason?: string;
} {
  if (!userAgent) {
    return { suspicious: true, reason: 'Missing user agent' };
  }

  const suspiciousPatterns = [
    'HeadlessChrome',
    'PhantomJS',
    'Selenium',
    'WebDriver',
    'Puppeteer',
    'Playwright',
    'Nightmare',
    'bot',
    'crawler',
    'spider',
  ];

  for (const pattern of suspiciousPatterns) {
    if (userAgent.toLowerCase().includes(pattern.toLowerCase())) {
      return { suspicious: true, reason: `Suspicious pattern: ${pattern}` };
    }
  }

  return { suspicious: false };
}

/**
 * Track fingerprint stability (frequent changes indicate spoofing)
 */
export function trackFingerprintStability(
  nullifierHash: string,
  fingerprintHash: string | undefined
): { stable: boolean; changeCount: number } {
  if (!fingerprintHash) {
    return { stable: true, changeCount: 0 };
  }

  const history = fingerprintHistory.get(nullifierHash) || [];

  // Add current fingerprint if different from last
  if (history.length === 0 || history[history.length - 1] !== fingerprintHash) {
    history.push(fingerprintHash);
  }

  // Keep last 10
  if (history.length > 10) {
    history.shift();
  }

  fingerprintHistory.set(nullifierHash, history);

  const uniqueCount = new Set(history).size;
  return {
    stable: uniqueCount <= ENHANCED_THRESHOLDS.MAX_FINGERPRINT_CHANGES,
    changeCount: uniqueCount - 1,
  };
}

/**
 * Detect off-hours suspicious activity
 */
export function detectOffHoursActivity(events: EnhancedViewEvent[]): {
  suspicious: boolean;
  offHoursCount: number;
} {
  const offHoursViews = events.filter((e) => {
    const hour = new Date(e.serverTimestamp || e.timestamp).getHours();
    return (
      hour >= ENHANCED_THRESHOLDS.OFF_HOURS_START &&
      hour <= ENHANCED_THRESHOLDS.OFF_HOURS_END
    );
  });

  return {
    suspicious: offHoursViews.length > ENHANCED_THRESHOLDS.MAX_OFF_HOURS_VIEWS,
    offHoursCount: offHoursViews.length,
  };
}

/**
 * Record honeypot trigger
 */
export function recordHoneypotTrigger(nullifierHash: string): void {
  const count = honeypotTriggers.get(nullifierHash) || 0;
  honeypotTriggers.set(nullifierHash, count + 1);
}

/**
 * Check honeypot trigger count
 */
export function getHoneypotTriggerCount(nullifierHash: string): number {
  return honeypotTriggers.get(nullifierHash) || 0;
}

// ============ Main Analysis Function ============

/**
 * Enhanced behavior analysis combining all detection methods
 */
export function analyzeEnhancedBehavior(
  nullifierHash: string,
  events: EnhancedViewEvent[]
): EnhancedBehaviorAnalysis {
  // Start with base analysis
  const baseAnalysis = analyzeViewBehavior(events);

  const flags: EnhancedBehaviorFlag[] = [...baseAnalysis.flags] as EnhancedBehaviorFlag[];
  const reasons: string[] = [];
  let additionalScore = 0;

  if (events.length === 0) {
    return {
      ...baseAnalysis,
      flags,
      enhancedScore: baseAnalysis.suspicionScore,
      reasons,
    };
  }

  const latestEvent = events[events.length - 1];

  // 1. Timestamp manipulation check
  const timestampCheck = detectTimestampManipulation(
    latestEvent.clientTimestamp,
    latestEvent.serverTimestamp || latestEvent.timestamp
  );
  if (timestampCheck.suspicious) {
    flags.push('timestamp_manipulation');
    reasons.push(`Timestamp drift: ${timestampCheck.drift}ms`);
    additionalScore += 25;
  }

  // 2. User agent check
  const uaCheck = detectSuspiciousUserAgent(latestEvent.userAgent);
  if (uaCheck.suspicious) {
    flags.push('suspicious_user_agent');
    reasons.push(uaCheck.reason || 'Suspicious user agent');
    additionalScore += 30;
  }

  // 3. Fingerprint stability check
  const fpCheck = trackFingerprintStability(nullifierHash, latestEvent.fingerprintHash);
  if (!fpCheck.stable) {
    flags.push('fingerprint_change');
    reasons.push(`Fingerprint changed ${fpCheck.changeCount} times`);
    additionalScore += 20;
  }

  // 4. Off-hours check
  const offHoursCheck = detectOffHoursActivity(events);
  if (offHoursCheck.suspicious) {
    flags.push('off_hours_activity');
    reasons.push(`${offHoursCheck.offHoursCount} views during off-hours`);
    additionalScore += 15;
  }

  // 5. Honeypot check
  const honeypotCount = getHoneypotTriggerCount(nullifierHash);
  if (honeypotCount > 0 || latestEvent.honeypotTriggered) {
    flags.push('honeypot_triggered');
    reasons.push(`Honeypot triggered ${honeypotCount} times`);
    additionalScore += 40;
  }

  // Calculate final score
  const enhancedScore = Math.min(baseAnalysis.suspicionScore + additionalScore, 100);

  // Update recommendation based on enhanced score
  let recommendation = baseAnalysis.recommendation;
  if (enhancedScore >= THRESHOLDS.SUSPICION_BLOCK) {
    recommendation = 'block';
  } else if (enhancedScore >= THRESHOLDS.SUSPICION_REVERIFY) {
    recommendation = 'reverify';
  } else if (enhancedScore >= THRESHOLDS.SUSPICION_CHALLENGE) {
    recommendation = 'challenge';
  }

  return {
    ...baseAnalysis,
    suspicionScore: enhancedScore,
    flags,
    recommendation,
    enhancedScore,
    reasons,
  };
}

// ============ Enhanced Tracker ============

class EnhancedBehaviorTracker {
  private events: Map<string, EnhancedViewEvent[]> = new Map();
  private analyses: Map<string, EnhancedBehaviorAnalysis> = new Map();

  recordView(nullifierHash: string, event: EnhancedViewEvent): void {
    const existing = this.events.get(nullifierHash) || [];
    existing.push(event);

    // Keep last 50 events
    if (existing.length > 50) {
      existing.shift();
    }

    this.events.set(nullifierHash, existing);

    // Update analysis
    const analysis = analyzeEnhancedBehavior(nullifierHash, existing);
    this.analyses.set(nullifierHash, analysis);
  }

  getAnalysis(nullifierHash: string): EnhancedBehaviorAnalysis | null {
    return this.analyses.get(nullifierHash) || null;
  }

  getEvents(nullifierHash: string): EnhancedViewEvent[] {
    return this.events.get(nullifierHash) || [];
  }

  clearUser(nullifierHash: string): void {
    this.events.delete(nullifierHash);
    this.analyses.delete(nullifierHash);
    fingerprintHistory.delete(nullifierHash);
    honeypotTriggers.delete(nullifierHash);
  }
}

export const enhancedBehaviorTracker = new EnhancedBehaviorTracker();

/**
 * Quick check if user should be blocked based on enhanced analysis
 */
export function shouldBlockEnhanced(nullifierHash: string): boolean {
  const analysis = enhancedBehaviorTracker.getAnalysis(nullifierHash);
  return analysis?.recommendation === 'block';
}

/**
 * Quick check if challenge is needed based on enhanced analysis
 */
export function shouldChallengeEnhanced(nullifierHash: string): {
  shouldChallenge: boolean;
  reason?: string;
  analysis?: EnhancedBehaviorAnalysis;
} {
  const analysis = enhancedBehaviorTracker.getAnalysis(nullifierHash);

  if (!analysis) {
    return { shouldChallenge: false };
  }

  if (analysis.recommendation === 'challenge' || analysis.recommendation === 'reverify') {
    return {
      shouldChallenge: true,
      reason: analysis.reasons.join(', ') || `Score: ${analysis.enhancedScore}`,
      analysis,
    };
  }

  return { shouldChallenge: false, analysis };
}

// Cleanup old data periodically
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      // Clear fingerprint history older than 24 hours
      // In a real implementation, you'd track timestamps
      if (fingerprintHistory.size > 10000) {
        const keysToDelete = Array.from(fingerprintHistory.keys()).slice(0, 5000);
        keysToDelete.forEach((key) => fingerprintHistory.delete(key));
      }

      if (honeypotTriggers.size > 10000) {
        const keysToDelete = Array.from(honeypotTriggers.keys()).slice(0, 5000);
        keysToDelete.forEach((key) => honeypotTriggers.delete(key));
      }
    },
    60 * 60 * 1000
  ); // Every hour
}
