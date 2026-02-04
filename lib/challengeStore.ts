// Random interaction challenge system to verify human users
// In production, use Redis or database

export type ChallengeType = 'tap' | 'math' | 'swipe' | 'sequence';

interface Challenge {
  id: string;
  type: ChallengeType;
  question: string;
  answer: string;
  options?: string[];
  createdAt: number;
  expiresAt: number;
}

interface UserChallengeState {
  consecutiveViews: number;
  lastChallengeAt: number;
  failedAttempts: number;
  lockedUntil: number;
}

// Active challenges: `${userId}` -> Challenge
const activeChallenges = new Map<string, Challenge>();

// User states: `${userId}` -> UserChallengeState
const userStates = new Map<string, UserChallengeState>();

// Configuration
export const CHALLENGE_CONFIG = {
  VIEWS_BEFORE_CHALLENGE: 5,      // Challenge after every N ad views
  CHALLENGE_TIMEOUT_MS: 30000,    // 30 seconds to complete
  MAX_FAILED_ATTEMPTS: 3,         // Lock after N failures
  LOCK_DURATION_MS: 5 * 60 * 1000, // 5 minute lock
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateChallenge(): Challenge {
  const types: ChallengeType[] = ['tap', 'math', 'swipe', 'sequence'];
  const type = types[getRandomInt(0, types.length - 1)];
  const now = Date.now();

  switch (type) {
    case 'tap': {
      const targetCount = getRandomInt(2, 4);
      return {
        id: generateId(),
        type: 'tap',
        question: `TAP_CHALLENGE:${targetCount}`,
        answer: String(targetCount),
        createdAt: now,
        expiresAt: now + CHALLENGE_CONFIG.CHALLENGE_TIMEOUT_MS,
      };
    }

    case 'math': {
      const a = getRandomInt(1, 10);
      const b = getRandomInt(1, 10);
      const operators = ['+', '-'];
      const op = operators[getRandomInt(0, 1)];
      const result = op === '+' ? a + b : a - b;

      // Generate wrong options
      const options = [String(result)];
      while (options.length < 4) {
        const wrong = result + getRandomInt(-5, 5);
        if (wrong !== result && !options.includes(String(wrong))) {
          options.push(String(wrong));
        }
      }
      // Shuffle options
      options.sort(() => Math.random() - 0.5);

      return {
        id: generateId(),
        type: 'math',
        question: `${a} ${op} ${b} = ?`,
        answer: String(result),
        options,
        createdAt: now,
        expiresAt: now + CHALLENGE_CONFIG.CHALLENGE_TIMEOUT_MS,
      };
    }

    case 'swipe': {
      const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
      const direction = directions[getRandomInt(0, 3)];
      return {
        id: generateId(),
        type: 'swipe',
        question: `SWIPE_CHALLENGE:${direction}`,
        answer: direction,
        createdAt: now,
        expiresAt: now + CHALLENGE_CONFIG.CHALLENGE_TIMEOUT_MS,
      };
    }

    case 'sequence': {
      const colors = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
      const sequence = [
        colors[getRandomInt(0, 3)],
        colors[getRandomInt(0, 3)],
        colors[getRandomInt(0, 3)],
      ];
      return {
        id: generateId(),
        type: 'sequence',
        question: `SEQUENCE_CHALLENGE:${sequence.join(',')}`,
        answer: sequence.join(','),
        options: colors,
        createdAt: now,
        expiresAt: now + CHALLENGE_CONFIG.CHALLENGE_TIMEOUT_MS,
      };
    }
  }
}

function getUserState(userId: string): UserChallengeState {
  let state = userStates.get(userId);
  if (!state) {
    state = {
      consecutiveViews: 0,
      lastChallengeAt: 0,
      failedAttempts: 0,
      lockedUntil: 0,
    };
    userStates.set(userId, state);
  }
  return state;
}

export interface ChallengeCheckResult {
  needsChallenge: boolean;
  isLocked: boolean;
  lockRemainingMs?: number;
  challenge?: {
    id: string;
    type: ChallengeType;
    question: string;
    options?: string[];
    timeoutMs: number;
  };
}

export function checkIfChallengeNeeded(userId: string): ChallengeCheckResult {
  const state = getUserState(userId);
  const now = Date.now();

  // Check if user is locked out
  if (state.lockedUntil > now) {
    return {
      needsChallenge: false,
      isLocked: true,
      lockRemainingMs: state.lockedUntil - now,
    };
  }

  // Increment consecutive views
  state.consecutiveViews += 1;

  // Check if challenge is needed
  if (state.consecutiveViews >= CHALLENGE_CONFIG.VIEWS_BEFORE_CHALLENGE) {
    const challenge = generateChallenge();
    activeChallenges.set(userId, challenge);

    return {
      needsChallenge: true,
      isLocked: false,
      challenge: {
        id: challenge.id,
        type: challenge.type,
        question: challenge.question,
        options: challenge.options,
        timeoutMs: CHALLENGE_CONFIG.CHALLENGE_TIMEOUT_MS,
      },
    };
  }

  return {
    needsChallenge: false,
    isLocked: false,
  };
}

export interface ChallengeVerifyResult {
  success: boolean;
  error?: string;
  isLocked?: boolean;
  lockRemainingMs?: number;
}

export function verifyChallenge(
  userId: string,
  challengeId: string,
  answer: string
): ChallengeVerifyResult {
  const state = getUserState(userId);
  const now = Date.now();

  // Check if locked
  if (state.lockedUntil > now) {
    return {
      success: false,
      error: 'USER_LOCKED',
      isLocked: true,
      lockRemainingMs: state.lockedUntil - now,
    };
  }

  const challenge = activeChallenges.get(userId);

  if (!challenge) {
    return { success: false, error: 'NO_ACTIVE_CHALLENGE' };
  }

  if (challenge.id !== challengeId) {
    return { success: false, error: 'INVALID_CHALLENGE_ID' };
  }

  if (now > challenge.expiresAt) {
    activeChallenges.delete(userId);
    state.failedAttempts += 1;

    if (state.failedAttempts >= CHALLENGE_CONFIG.MAX_FAILED_ATTEMPTS) {
      state.lockedUntil = now + CHALLENGE_CONFIG.LOCK_DURATION_MS;
      return {
        success: false,
        error: 'CHALLENGE_TIMEOUT_LOCKED',
        isLocked: true,
        lockRemainingMs: CHALLENGE_CONFIG.LOCK_DURATION_MS,
      };
    }

    return { success: false, error: 'CHALLENGE_EXPIRED' };
  }

  // Verify answer
  const isCorrect = answer.toUpperCase() === challenge.answer.toUpperCase();

  if (!isCorrect) {
    state.failedAttempts += 1;

    if (state.failedAttempts >= CHALLENGE_CONFIG.MAX_FAILED_ATTEMPTS) {
      state.lockedUntil = now + CHALLENGE_CONFIG.LOCK_DURATION_MS;
      activeChallenges.delete(userId);
      return {
        success: false,
        error: 'WRONG_ANSWER_LOCKED',
        isLocked: true,
        lockRemainingMs: CHALLENGE_CONFIG.LOCK_DURATION_MS,
      };
    }

    return { success: false, error: 'WRONG_ANSWER' };
  }

  // Success - reset counters
  state.consecutiveViews = 0;
  state.failedAttempts = 0;
  state.lastChallengeAt = now;
  activeChallenges.delete(userId);

  return { success: true };
}

export function skipChallenge(userId: string): void {
  const state = getUserState(userId);
  state.failedAttempts += 1;

  if (state.failedAttempts >= CHALLENGE_CONFIG.MAX_FAILED_ATTEMPTS) {
    state.lockedUntil = Date.now() + CHALLENGE_CONFIG.LOCK_DURATION_MS;
  }

  activeChallenges.delete(userId);
}

// Cleanup expired challenges
export function cleanupExpiredChallenges(): void {
  const now = Date.now();
  for (const [userId, challenge] of activeChallenges.entries()) {
    if (now > challenge.expiresAt) {
      activeChallenges.delete(userId);
    }
  }
}

if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredChallenges, 60 * 1000);
}
