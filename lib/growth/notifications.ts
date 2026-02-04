/**
 * Push Notification System
 *
 * Uses World API for push notifications.
 * Target: 15%+ open rate (10% = pause, 25% = excellent)
 */

import { APP_ID } from '@/lib/env';

// Notification types
export type NotificationType =
  | 'streak_at_risk'      // About to lose streak
  | 'goal_achieved'       // Daily goal completed
  | 'leaderboard_change'  // Rank changed significantly
  | 'new_badge'           // Badge earned
  | 're_engagement'       // Haven't been active
  | 'referral_joined'     // Referred friend signed up
  | 'weekly_summary';     // Weekly recap

interface NotificationContent {
  title: string;
  message: string;
  path: string;
}

// Notification templates
const NOTIFICATION_TEMPLATES: Record<NotificationType, (data?: Record<string, unknown>) => NotificationContent> = {
  streak_at_risk: () => ({
    title: '🔥 Streak at Risk!',
    message: 'Your streak is about to break! Watch just 1 ad to keep it alive.',
    path: '/',
  }),
  goal_achieved: (data) => ({
    title: '🎉 Goal Achieved!',
    message: `Great job! You earned ${data?.xp || 0} XP today.`,
    path: '/profile',
  }),
  leaderboard_change: (data) => ({
    title: '📊 Rank Update',
    message: `You moved to rank #${data?.newRank || '?'}!`,
    path: '/analytics',
  }),
  new_badge: (data) => ({
    title: '🏆 New Badge!',
    message: `You earned "${data?.badgeName || 'a badge'}"!`,
    path: '/profile',
  }),
  re_engagement: (data) => ({
    title: '👋 We miss you!',
    message: `Come back and earn rewards! ${data?.days || 0} days since your last visit.`,
    path: '/',
  }),
  referral_joined: (data) => ({
    title: '🎁 Friend Joined!',
    message: `${data?.friendName || 'A friend'} signed up! You earned ${data?.xp || 100} XP.`,
    path: '/profile',
  }),
  weekly_summary: (data) => ({
    title: '📈 Weekly Summary',
    message: `You earned ${data?.weeklyXP || 0} XP this week! Rank: #${data?.rank || '?'}`,
    path: '/analytics',
  }),
};

/**
 * Send notification via World API
 */
export async function sendNotification(
  walletAddresses: string[],
  type: NotificationType,
  data?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.WORLD_API_KEY;

  if (!apiKey) {
    console.warn('[Notifications] WORLD_API_KEY not configured');
    return { success: false, error: 'API key not configured' };
  }

  const content = NOTIFICATION_TEMPLATES[type](data);

  try {
    const response = await fetch(
      'https://developer.worldcoin.org/api/v2/minikit/send-notification',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: APP_ID,
          wallet_addresses: walletAddresses,
          localisations: [
            {
              language: 'en',
              title: content.title.slice(0, 30), // Max 30 chars
              message: `${content.message} \${username}`,
            },
            {
              language: 'ko',
              title: content.title.slice(0, 30),
              message: `${content.message} \${username}`,
            },
          ],
          mini_app_path: `worldapp://mini-app?app_id=${APP_ID}&path=${content.path}`,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Notifications] Send failed:', errorData);
      return { success: false, error: errorData.message || 'Send failed' };
    }

    return { success: true };
  } catch (error) {
    console.error('[Notifications] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Batch send notifications to multiple users
 */
export async function sendBatchNotifications(
  notifications: Array<{
    walletAddress: string;
    type: NotificationType;
    data?: Record<string, unknown>;
  }>
): Promise<{ sent: number; failed: number }> {
  // Group by notification type for efficiency
  const grouped = new Map<NotificationType, { addresses: string[]; data?: Record<string, unknown> }>();

  for (const notif of notifications) {
    const existing = grouped.get(notif.type);
    if (existing) {
      existing.addresses.push(notif.walletAddress);
    } else {
      grouped.set(notif.type, {
        addresses: [notif.walletAddress],
        data: notif.data,
      });
    }
  }

  let sent = 0;
  let failed = 0;

  for (const [type, { addresses, data }] of grouped) {
    // World API supports up to 1000 addresses per request
    for (let i = 0; i < addresses.length; i += 1000) {
      const batch = addresses.slice(i, i + 1000);
      const result = await sendNotification(batch, type, data);

      if (result.success) {
        sent += batch.length;
      } else {
        failed += batch.length;
      }
    }
  }

  return { sent, failed };
}

/**
 * Get notification preferences for a user
 */
export interface NotificationPreferences {
  streakReminders: boolean;
  goalAchieved: boolean;
  leaderboardUpdates: boolean;
  newBadges: boolean;
  referralUpdates: boolean;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  streakReminders: true,
  goalAchieved: true,
  leaderboardUpdates: true,
  newBadges: true,
  referralUpdates: true,
};

/**
 * Schedule notifications (called by cron job)
 */
export async function scheduleStreakReminders(): Promise<number> {
  // In production, this would:
  // 1. Query users with streaks > 0 who haven't been active today
  // 2. Filter by notification preferences
  // 3. Send streak_at_risk notifications

  console.log('[Notifications] Streak reminders scheduled');
  return 0;
}

/**
 * Check notification performance
 */
export interface NotificationMetrics {
  type: NotificationType;
  sent: number;
  opened: number;
  openRate: number;
  status: 'excellent' | 'good' | 'needs_improvement' | 'paused';
}

export function evaluateOpenRate(openRate: number): NotificationMetrics['status'] {
  if (openRate >= 25) return 'excellent';
  if (openRate >= 15) return 'good';
  if (openRate >= 10) return 'needs_improvement';
  return 'paused'; // < 10% - should pause for 7 days and audit
}
