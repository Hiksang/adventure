/**
 * Behavior Analysis System for Bot Detection
 *
 * Analyzes user behavior patterns to detect automated/bot activity.
 * Uses statistical variance - bots tend to have very consistent patterns.
 */

export interface ViewEvent {
  timestamp: number;
  duration: number;  // How long they watched (ms)
  adId: string;
}

export interface BehaviorAnalysis {
  suspicionScore: number;  // 0-100
  viewTimeVariance: number;
  intervalVariance: number;
  flags: BehaviorFlag[];
  recommendation: 'allow' | 'challenge' | 'reverify' | 'block';
}

export type BehaviorFlag =
  | 'fast_viewing'           // Views too fast
  | 'consistent_intervals'   // Same time between views
  | 'consistent_duration'    // Same view duration
  | 'session_bombing'        // Too many views in short time
  | 'perfect_timing'         // Suspiciously perfect completion times
  | 'no_interaction'         // No scrolling/tapping during video
  | 'linear_progression';    // Perfect sequential viewing

export const THRESHOLDS = {
  MIN_VIEW_DURATION_MS: 3000,      // Minimum 3 seconds
  MAX_VIEWS_PER_MINUTE: 4,         // Max 4 views per minute
  VARIANCE_SUSPICION_LOW: 0.1,     // Very low variance = suspicious
  VARIANCE_SUSPICION_MED: 0.5,
  SUSPICION_CHALLENGE: 50,         // Score > 50 = require challenge
  SUSPICION_REVERIFY: 70,          // Score > 70 = require World ID re-verification
  SUSPICION_BLOCK: 90,             // Score > 90 = block
};

/**
 * Calculate variance of an array of numbers
 */
function calculateVariance(values: number[]): number {
  if (values.length < 2) return 1; // Assume normal if not enough data

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

  // Normalize by mean to get coefficient of variation
  return mean > 0 ? Math.sqrt(avgSquaredDiff) / mean : 0;
}

/**
 * Analyze view events for suspicious patterns
 */
export function analyzeViewBehavior(events: ViewEvent[]): BehaviorAnalysis {
  const flags: BehaviorFlag[] = [];
  let suspicionScore = 0;

  if (events.length < 3) {
    return {
      suspicionScore: 0,
      viewTimeVariance: 1,
      intervalVariance: 1,
      flags: [],
      recommendation: 'allow',
    };
  }

  // Analyze view durations
  const durations = events.map(e => e.duration);
  const viewTimeVariance = calculateVariance(durations);

  if (viewTimeVariance < THRESHOLDS.VARIANCE_SUSPICION_LOW) {
    flags.push('consistent_duration');
    suspicionScore += 30;
  } else if (viewTimeVariance < THRESHOLDS.VARIANCE_SUSPICION_MED) {
    suspicionScore += 15;
  }

  // Analyze intervals between views
  const intervals: number[] = [];
  for (let i = 1; i < events.length; i++) {
    intervals.push(events[i].timestamp - events[i - 1].timestamp);
  }
  const intervalVariance = calculateVariance(intervals);

  if (intervalVariance < THRESHOLDS.VARIANCE_SUSPICION_LOW) {
    flags.push('consistent_intervals');
    suspicionScore += 30;
  } else if (intervalVariance < THRESHOLDS.VARIANCE_SUSPICION_MED) {
    suspicionScore += 15;
  }

  // Check for fast viewing
  const fastViews = durations.filter(d => d < THRESHOLDS.MIN_VIEW_DURATION_MS);
  if (fastViews.length > durations.length * 0.3) {
    flags.push('fast_viewing');
    suspicionScore += 20;
  }

  // Check for session bombing
  const sessionDuration = events[events.length - 1].timestamp - events[0].timestamp;
  const viewsPerMinute = (events.length / sessionDuration) * 60000;
  if (viewsPerMinute > THRESHOLDS.MAX_VIEWS_PER_MINUTE) {
    flags.push('session_bombing');
    suspicionScore += 25;
  }

  // Check for linear progression (always viewing in order)
  // This is simplified - real implementation would check ad order
  if (intervalVariance < 0.05 && viewTimeVariance < 0.05) {
    flags.push('linear_progression');
    flags.push('perfect_timing');
    suspicionScore += 20;
  }

  // Cap at 100
  suspicionScore = Math.min(suspicionScore, 100);

  // Determine recommendation
  let recommendation: BehaviorAnalysis['recommendation'] = 'allow';
  if (suspicionScore >= THRESHOLDS.SUSPICION_BLOCK) {
    recommendation = 'block';
  } else if (suspicionScore >= THRESHOLDS.SUSPICION_REVERIFY) {
    recommendation = 'reverify';
  } else if (suspicionScore >= THRESHOLDS.SUSPICION_CHALLENGE) {
    recommendation = 'challenge';
  }

  return {
    suspicionScore,
    viewTimeVariance,
    intervalVariance,
    flags,
    recommendation,
  };
}

/**
 * Store for tracking real-time view events (per session)
 */
class BehaviorTracker {
  private events: Map<string, ViewEvent[]> = new Map();
  private analyses: Map<string, BehaviorAnalysis> = new Map();

  recordView(nullifierHash: string, event: ViewEvent): void {
    const existing = this.events.get(nullifierHash) || [];
    existing.push(event);

    // Keep last 50 events
    if (existing.length > 50) {
      existing.shift();
    }

    this.events.set(nullifierHash, existing);

    // Update analysis
    const analysis = analyzeViewBehavior(existing);
    this.analyses.set(nullifierHash, analysis);
  }

  getAnalysis(nullifierHash: string): BehaviorAnalysis | null {
    return this.analyses.get(nullifierHash) || null;
  }

  getEvents(nullifierHash: string): ViewEvent[] {
    return this.events.get(nullifierHash) || [];
  }

  clearUser(nullifierHash: string): void {
    this.events.delete(nullifierHash);
    this.analyses.delete(nullifierHash);
  }
}

export const behaviorTracker = new BehaviorTracker();

/**
 * Quick check if user should be challenged based on recent behavior
 */
export function shouldChallenge(nullifierHash: string): {
  shouldChallenge: boolean;
  reason?: string;
  analysis?: BehaviorAnalysis;
} {
  const analysis = behaviorTracker.getAnalysis(nullifierHash);

  if (!analysis) {
    return { shouldChallenge: false };
  }

  if (analysis.recommendation === 'challenge' || analysis.recommendation === 'reverify') {
    return {
      shouldChallenge: true,
      reason: `Suspicious behavior detected: ${analysis.flags.join(', ')}`,
      analysis,
    };
  }

  return { shouldChallenge: false, analysis };
}

/**
 * Check if user should be blocked
 */
export function shouldBlock(nullifierHash: string): boolean {
  const analysis = behaviorTracker.getAnalysis(nullifierHash);
  return analysis?.recommendation === 'block';
}
