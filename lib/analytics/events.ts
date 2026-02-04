/**
 * Analytics Events System
 *
 * 6 Core Events required for growth tracking + gamification events.
 */

import { IS_DEV } from '@/lib/env';

// Core 6 events (required)
export type CoreEvent =
  | 'app_open'           // User opened the app
  | 'signup'             // User signed up
  | 'first_value'        // User got first value (first ad watched)
  | 'invite_sent'        // User sent an invite
  | 'invite_accepted'    // Invited user signed up
  | 'notification_open'; // User opened a notification

// Gamification events
export type GamificationEvent =
  | 'streak_extended'
  | 'streak_broken'
  | 'badge_earned'
  | 'leaderboard_viewed'
  | 'reward_claimed'
  | 'daily_goal_achieved';

// Ad viewing events
export type AdEvent =
  | 'ad_view_start'
  | 'ad_view_complete'
  | 'ad_view_skip'
  | 'quiz_answer_correct'
  | 'quiz_answer_wrong';

// Engagement events
export type EngagementEvent =
  | 'session_start'
  | 'session_end'
  | 'profile_viewed'
  | 'settings_changed'
  | 'share_clicked';

export type AnalyticsEvent =
  | CoreEvent
  | GamificationEvent
  | AdEvent
  | EngagementEvent;

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

// In-memory event store for DEV
const devEvents: Array<{
  event: AnalyticsEvent;
  properties: EventProperties;
  timestamp: number;
  nullifierHash?: string;
}> = [];

/**
 * Track an analytics event
 */
export function track(
  event: AnalyticsEvent,
  properties?: EventProperties,
  nullifierHash?: string
): void {
  const timestamp = Date.now();

  if (IS_DEV) {
    devEvents.push({ event, properties: properties || {}, timestamp, nullifierHash });
    console.log(`[Analytics] ${event}`, properties);
    return;
  }

  // In production, send to analytics service
  // Example: Mixpanel, Amplitude, or custom endpoint
  sendToAnalytics(event, properties, nullifierHash, timestamp);
}

/**
 * Track signup with method
 */
export function trackSignup(method: 'worldid' | 'wallet', nullifierHash: string): void {
  track('signup', { method }, nullifierHash);
}

/**
 * Track first value moment
 */
export function trackFirstValue(action: 'first_ad_watched' | 'first_quiz_completed', nullifierHash: string): void {
  track('first_value', { action }, nullifierHash);
}

/**
 * Track ad view
 */
export function trackAdView(
  status: 'start' | 'complete' | 'skip',
  adId: string,
  xpEarned?: number,
  nullifierHash?: string
): void {
  const event: AdEvent = `ad_view_${status}` as AdEvent;
  track(event, { ad_id: adId, xp_earned: xpEarned }, nullifierHash);
}

/**
 * Track quiz answer
 */
export function trackQuizAnswer(
  correct: boolean,
  quizId: string,
  xpEarned?: number,
  nullifierHash?: string
): void {
  const event: AdEvent = correct ? 'quiz_answer_correct' : 'quiz_answer_wrong';
  track(event, { quiz_id: quizId, xp_earned: xpEarned }, nullifierHash);
}

/**
 * Track streak event
 */
export function trackStreak(
  extended: boolean,
  streakDays: number,
  nullifierHash?: string
): void {
  const event: GamificationEvent = extended ? 'streak_extended' : 'streak_broken';
  track(event, { streak_days: streakDays }, nullifierHash);
}

/**
 * Track badge earned
 */
export function trackBadgeEarned(
  badgeType: string,
  badgeName: string,
  nullifierHash?: string
): void {
  track('badge_earned', { badge_type: badgeType, badge_name: badgeName }, nullifierHash);
}

/**
 * Track invite
 */
export function trackInvite(
  action: 'sent' | 'accepted',
  referralCode?: string,
  nullifierHash?: string
): void {
  const event: CoreEvent = action === 'sent' ? 'invite_sent' : 'invite_accepted';
  track(event, { referral_code: referralCode }, nullifierHash);
}

/**
 * Track notification
 */
export function trackNotificationOpen(
  notificationType: string,
  nullifierHash?: string
): void {
  track('notification_open', { notification_type: notificationType }, nullifierHash);
}

/**
 * Send to analytics service
 */
async function sendToAnalytics(
  event: AnalyticsEvent,
  properties?: EventProperties,
  nullifierHash?: string,
  timestamp?: number
): Promise<void> {
  // In production, implement actual analytics sending
  // Example with fetch:
  /*
  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        properties: {
          ...properties,
          nullifier_hash: nullifierHash,
          timestamp: timestamp || Date.now(),
        },
      }),
    });
  } catch (error) {
    console.error('[Analytics] Failed to send:', error);
  }
  */
}

/**
 * Get events for DEV mode debugging
 */
export function getDevEvents(): typeof devEvents {
  return [...devEvents];
}

/**
 * Clear DEV events
 */
export function clearDevEvents(): void {
  devEvents.length = 0;
}

/**
 * KPI targets
 */
export const KPI_TARGETS = {
  SIGNUP_TO_FIRST_VALUE: 40, // ≥40% of signups watch first ad
  D1_RETENTION: 25,          // ≥25% return next day
  INVITE_ACCEPTANCE: 15,     // ≥15% of invites result in signup
  PUSH_OPEN_RATE: 15,        // ≥15% notification open rate
};

/**
 * Calculate conversion rate
 */
export function calculateConversionRate(
  numerator: number,
  denominator: number
): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

/**
 * Session tracking
 */
let sessionStartTime: number | null = null;

export function startSession(nullifierHash?: string): void {
  sessionStartTime = Date.now();
  track('session_start', {}, nullifierHash);
}

export function endSession(nullifierHash?: string): void {
  if (sessionStartTime) {
    const duration = Math.round((Date.now() - sessionStartTime) / 1000);
    track('session_end', { duration_seconds: duration }, nullifierHash);
    sessionStartTime = null;
  }
}

/**
 * Page view tracking (for SPA)
 */
export function trackPageView(path: string, nullifierHash?: string): void {
  track('app_open', { path }, nullifierHash);
}
