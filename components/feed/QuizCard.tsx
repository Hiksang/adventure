'use client';
import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { QuizData } from '@/types';

interface QuizCardProps {
  quiz: QuizData;
  userId?: string;
  onAnswer: (correct: boolean, xp: number) => void;
  onSkip: () => void;
}

export default function QuizCard({ quiz, userId, onAnswer, onSkip }: QuizCardProps) {
  const t = useTranslations('feed');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [serverCorrectIndex, setServerCorrectIndex] = useState<number | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Start quiz session with server
  const startQuizSession = useCallback(async () => {
    if (!userId || sessionStarted) return;

    try {
      const response = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          quizId: quiz.id,
          correctIndex: quiz.correct_index,
          xpReward: quiz.xp_reward,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSessionStarted(true);
      }
    } catch (error) {
      console.error('Failed to start quiz session:', error);
    }
  }, [userId, quiz, sessionStarted]);

  useEffect(() => {
    startQuizSession();
  }, [startQuizSession]);

  const handleSelect = async (index: number) => {
    if (answered) return;

    setSelectedIndex(index);
    setAnswered(true);

    // Verify with server
    try {
      const response = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          quizId: quiz.id,
          selectedIndex: index,
          expectedXP: quiz.xp_reward,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setServerCorrectIndex(data.correct ? index : quiz.correct_index);
        setTimeout(() => {
          onAnswer(data.correct, data.xpAwarded);
        }, 1500);
      } else {
        // Fallback to client-side (for dev mode)
        const isCorrect = index === quiz.correct_index;
        setServerCorrectIndex(quiz.correct_index);
        setTimeout(() => {
          onAnswer(isCorrect, isCorrect ? quiz.xp_reward : 0);
        }, 1500);
      }
    } catch {
      // Fallback to client-side
      const isCorrect = index === quiz.correct_index;
      setServerCorrectIndex(quiz.correct_index);
      setTimeout(() => {
        onAnswer(isCorrect, isCorrect ? quiz.xp_reward : 0);
      }, 1500);
    }
  };

  const correctIndex = serverCorrectIndex ?? quiz.correct_index;

  const getOptionStyle = (index: number) => {
    if (!answered) {
      return 'bg-white/10 hover:bg-white/20 border-white/30';
    }
    if (index === correctIndex) {
      return 'bg-green-500/80 border-green-400';
    }
    if (index === selectedIndex && index !== correctIndex) {
      return 'bg-red-500/80 border-red-400';
    }
    return 'bg-white/10 border-white/30 opacity-50';
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 p-6">
      <div className="absolute top-4 right-4">
        <button
          onClick={onSkip}
          className="text-white/70 hover:text-white text-sm px-3 py-1 rounded-full border border-white/30"
        >
          {t('skip')}
        </button>
      </div>

      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6">
        <span className="text-white/80 text-sm">{t('quizChallenge')}</span>
        <span className="ml-2 text-yellow-400 font-medium">+{quiz.xp_reward} XP</span>
      </div>

      <h2 className="text-white text-xl font-bold text-center mb-8 px-4">
        {quiz.question}
      </h2>

      <div className="w-full max-w-sm space-y-3">
        {quiz.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={answered}
            className={`w-full p-4 rounded-xl border-2 text-white font-medium transition-all ${getOptionStyle(index)}`}
          >
            <span className="mr-2 opacity-70">{String.fromCharCode(65 + index)}.</span>
            {option}
          </button>
        ))}
      </div>

      {answered && (
        <div className="mt-6 text-center">
          {selectedIndex === correctIndex ? (
            <p className="text-green-300 font-bold text-lg">{t('correct')}</p>
          ) : (
            <p className="text-red-300 font-bold text-lg">{t('incorrect')}</p>
          )}
        </div>
      )}
    </div>
  );
}
