// Daily XP limit tracking
// In production, use Redis or database

interface DailyRecord {
  date: string; // YYYY-MM-DD format
  xpEarned: number;
  adViews: number;
  quizAnswers: number;
}

// Map: userId -> DailyRecord
const dailyRecords = new Map<string, DailyRecord>();

// Configuration
export const DAILY_LIMITS = {
  MAX_XP_PER_DAY: 500,        // Maximum XP per day
  MAX_AD_VIEWS_PER_DAY: 50,   // Maximum ad views per day
  MAX_QUIZ_PER_DAY: 20,       // Maximum quiz answers per day
  CONSECUTIVE_VIEW_LIMIT: 10, // Must take break after 10 consecutive views
  BREAK_DURATION_MS: 5 * 60 * 1000, // 5 minute break required
};

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function getOrCreateRecord(userId: string): DailyRecord {
  const today = getTodayDateString();
  let record = dailyRecords.get(userId);

  // Reset if it's a new day
  if (!record || record.date !== today) {
    record = {
      date: today,
      xpEarned: 0,
      adViews: 0,
      quizAnswers: 0,
    };
    dailyRecords.set(userId, record);
  }

  return record;
}

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  currentXP: number;
  remainingXP: number;
  currentAdViews: number;
  remainingAdViews: number;
}

export function checkDailyLimit(userId: string, xpToAdd: number, type: 'ad' | 'quiz'): LimitCheckResult {
  const record = getOrCreateRecord(userId);
  const remainingXP = DAILY_LIMITS.MAX_XP_PER_DAY - record.xpEarned;
  const remainingAdViews = DAILY_LIMITS.MAX_AD_VIEWS_PER_DAY - record.adViews;

  // Check XP limit
  if (record.xpEarned + xpToAdd > DAILY_LIMITS.MAX_XP_PER_DAY) {
    return {
      allowed: false,
      reason: `DAILY_XP_LIMIT_REACHED:${record.xpEarned}/${DAILY_LIMITS.MAX_XP_PER_DAY}`,
      currentXP: record.xpEarned,
      remainingXP: Math.max(0, remainingXP),
      currentAdViews: record.adViews,
      remainingAdViews: Math.max(0, remainingAdViews),
    };
  }

  // Check ad view limit
  if (type === 'ad' && record.adViews >= DAILY_LIMITS.MAX_AD_VIEWS_PER_DAY) {
    return {
      allowed: false,
      reason: `DAILY_AD_VIEW_LIMIT_REACHED:${record.adViews}/${DAILY_LIMITS.MAX_AD_VIEWS_PER_DAY}`,
      currentXP: record.xpEarned,
      remainingXP: Math.max(0, remainingXP),
      currentAdViews: record.adViews,
      remainingAdViews: 0,
    };
  }

  // Check quiz limit
  if (type === 'quiz' && record.quizAnswers >= DAILY_LIMITS.MAX_QUIZ_PER_DAY) {
    return {
      allowed: false,
      reason: `DAILY_QUIZ_LIMIT_REACHED:${record.quizAnswers}/${DAILY_LIMITS.MAX_QUIZ_PER_DAY}`,
      currentXP: record.xpEarned,
      remainingXP: Math.max(0, remainingXP),
      currentAdViews: record.adViews,
      remainingAdViews: Math.max(0, remainingAdViews),
    };
  }

  return {
    allowed: true,
    currentXP: record.xpEarned,
    remainingXP: remainingXP - xpToAdd,
    currentAdViews: record.adViews,
    remainingAdViews: type === 'ad' ? remainingAdViews - 1 : remainingAdViews,
  };
}

export function recordXPEarned(userId: string, xp: number, type: 'ad' | 'quiz'): void {
  const record = getOrCreateRecord(userId);
  record.xpEarned += xp;

  if (type === 'ad') {
    record.adViews += 1;
  } else if (type === 'quiz') {
    record.quizAnswers += 1;
  }
}

export function getDailyStats(userId: string): DailyRecord & { limits: typeof DAILY_LIMITS } {
  const record = getOrCreateRecord(userId);
  return {
    ...record,
    limits: DAILY_LIMITS,
  };
}

// Cleanup old records (run periodically)
export function cleanupOldRecords(): void {
  const today = getTodayDateString();
  for (const [userId, record] of dailyRecords.entries()) {
    if (record.date !== today) {
      dailyRecords.delete(userId);
    }
  }
}

// Run cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupOldRecords, 60 * 60 * 1000);
}
