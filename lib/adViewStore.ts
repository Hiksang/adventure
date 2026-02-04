// In-memory store for ad view sessions
// In production, use Redis or database

interface AdViewSession {
  userId: string;
  adId: string;
  startedAt: number;
  duration: number; // expected duration in seconds
  completed: boolean;
  xpAwarded: boolean;
}

// Map: viewToken -> AdViewSession
const viewSessions = new Map<string, AdViewSession>();

// Map: userId:adId -> lastCompletedAt (prevent rapid re-watching)
const completionCooldowns = new Map<string, number>();

// Clean up old sessions periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const SESSION_TTL = 10 * 60 * 1000; // 10 minutes
const COMPLETION_COOLDOWN = 60 * 1000; // 1 minute cooldown between same ad views

function generateToken(): string {
  return `vt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export function startAdView(userId: string, adId: string, duration: number): string {
  const token = generateToken();

  viewSessions.set(token, {
    userId: userId,
    adId,
    startedAt: Date.now(),
    duration,
    completed: false,
    xpAwarded: false,
  });

  return token;
}

export interface CompleteAdViewResult {
  success: boolean;
  xpAwarded: number;
  error?: string;
}

export function completeAdView(
  userId: string,
  adId: string,
  viewToken: string,
  expectedXP: number
): CompleteAdViewResult {
  const session = viewSessions.get(viewToken);

  // Validate session exists
  if (!session) {
    return { success: false, xpAwarded: 0, error: 'INVALID_TOKEN' };
  }

  // Validate user matches
  if (session.userId !== userId) {
    return { success: false, xpAwarded: 0, error: 'USER_MISMATCH' };
  }

  // Validate ad matches
  if (session.adId !== adId) {
    return { success: false, xpAwarded: 0, error: 'AD_MISMATCH' };
  }

  // Check if already completed
  if (session.completed) {
    return { success: false, xpAwarded: 0, error: 'ALREADY_COMPLETED' };
  }

  // Check cooldown (prevent rapid re-watching same ad)
  const cooldownKey = `${userId}:${adId}`;
  const lastCompleted = completionCooldowns.get(cooldownKey);
  if (lastCompleted && Date.now() - lastCompleted < COMPLETION_COOLDOWN) {
    return { success: false, xpAwarded: 0, error: 'COOLDOWN_ACTIVE' };
  }

  // Validate watch time (must watch at least 80% of duration)
  const elapsedSeconds = (Date.now() - session.startedAt) / 1000;
  const minimumWatchTime = session.duration * 0.8;

  if (elapsedSeconds < minimumWatchTime) {
    return {
      success: false,
      xpAwarded: 0,
      error: `WATCH_TIME_TOO_SHORT:${elapsedSeconds.toFixed(1)}s/${minimumWatchTime.toFixed(1)}s`
    };
  }

  // Mark as completed
  session.completed = true;
  session.xpAwarded = true;

  // Set cooldown
  completionCooldowns.set(cooldownKey, Date.now());

  // Clean up the session
  viewSessions.delete(viewToken);

  return { success: true, xpAwarded: expectedXP };
}

// Cleanup old sessions
function cleanup() {
  const now = Date.now();

  // Clean old view sessions
  for (const [token, session] of viewSessions.entries()) {
    if (now - session.startedAt > SESSION_TTL) {
      viewSessions.delete(token);
    }
  }

  // Clean old cooldowns
  for (const [key, timestamp] of completionCooldowns.entries()) {
    if (now - timestamp > COMPLETION_COOLDOWN * 2) {
      completionCooldowns.delete(key);
    }
  }
}

// Start cleanup interval
if (typeof setInterval !== 'undefined') {
  setInterval(cleanup, CLEANUP_INTERVAL);
}

// Stats for monitoring
export function getStats() {
  return {
    activeSessions: viewSessions.size,
    activeCooldowns: completionCooldowns.size,
  };
}
