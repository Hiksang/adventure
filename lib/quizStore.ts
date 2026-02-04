// Quiz answer verification store
// In production, use Redis or database

interface QuizSession {
  quizId: string;
  userId: string;
  correctIndex: number;
  xpReward: number;
  startedAt: number;
  answered: boolean;
}

// Map: `${userId}-${quizId}` -> QuizSession
const quizSessions = new Map<string, QuizSession>();

// Answered quizzes per user per day to prevent re-answering
// Map: `${userId}-${date}` -> Set of quizIds
const answeredQuizzes = new Map<string, Set<string>>();

function getSessionKey(userId: string, quizId: string): string {
  return `${userId}-${quizId}`;
}

function getTodayKey(userId: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `${userId}-${today}`;
}

export function startQuizSession(
  userId: string,
  quizId: string,
  correctIndex: number,
  xpReward: number
): { success: boolean; error?: string } {
  const todayKey = getTodayKey(userId);
  const answered = answeredQuizzes.get(todayKey);

  // Check if already answered today
  if (answered?.has(quizId)) {
    return { success: false, error: 'QUIZ_ALREADY_ANSWERED_TODAY' };
  }

  const sessionKey = getSessionKey(userId, quizId);

  quizSessions.set(sessionKey, {
    quizId,
    userId,
    correctIndex,
    xpReward,
    startedAt: Date.now(),
    answered: false,
  });

  return { success: true };
}

export interface QuizAnswerResult {
  success: boolean;
  correct?: boolean;
  xpAwarded: number;
  error?: string;
}

export function submitQuizAnswer(
  userId: string,
  quizId: string,
  selectedIndex: number
): QuizAnswerResult {
  const sessionKey = getSessionKey(userId, quizId);
  const session = quizSessions.get(sessionKey);

  if (!session) {
    return { success: false, xpAwarded: 0, error: 'NO_ACTIVE_QUIZ_SESSION' };
  }

  if (session.answered) {
    return { success: false, xpAwarded: 0, error: 'QUIZ_ALREADY_ANSWERED' };
  }

  // Mark as answered
  session.answered = true;

  // Track in daily answered set
  const todayKey = getTodayKey(userId);
  if (!answeredQuizzes.has(todayKey)) {
    answeredQuizzes.set(todayKey, new Set());
  }
  answeredQuizzes.get(todayKey)!.add(quizId);

  const correct = selectedIndex === session.correctIndex;
  const xpAwarded = correct ? session.xpReward : 0;

  // Clean up session
  quizSessions.delete(sessionKey);

  return {
    success: true,
    correct,
    xpAwarded,
  };
}

// Cleanup old sessions (run periodically)
export function cleanupOldSessions(): void {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes

  for (const [key, session] of quizSessions.entries()) {
    if (now - session.startedAt > maxAge) {
      quizSessions.delete(key);
    }
  }

  // Cleanup old daily records
  const today = new Date().toISOString().split('T')[0];
  for (const key of answeredQuizzes.keys()) {
    if (!key.endsWith(today)) {
      answeredQuizzes.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupOldSessions, 5 * 60 * 1000);
}
