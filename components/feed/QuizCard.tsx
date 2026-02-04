'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { QuizData } from '@/types';

interface QuizCardProps {
  quiz: QuizData;
  onAnswer: (correct: boolean, xp: number) => void;
  onSkip: () => void;
}

export default function QuizCard({ quiz, onAnswer, onSkip }: QuizCardProps) {
  const t = useTranslations('feed');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (index: number) => {
    if (answered) return;

    setSelectedIndex(index);
    setAnswered(true);

    const isCorrect = index === quiz.correct_index;
    const earnedXP = isCorrect ? quiz.xp_reward : 0;

    setTimeout(() => {
      onAnswer(isCorrect, earnedXP);
    }, 1500);
  };

  const getOptionStyle = (index: number) => {
    if (!answered) {
      return 'bg-white/10 hover:bg-white/20 border-white/30';
    }
    if (index === quiz.correct_index) {
      return 'bg-green-500/80 border-green-400';
    }
    if (index === selectedIndex && index !== quiz.correct_index) {
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
          {selectedIndex === quiz.correct_index ? (
            <p className="text-green-300 font-bold text-lg">{t('correct')}</p>
          ) : (
            <p className="text-red-300 font-bold text-lg">{t('incorrect')}</p>
          )}
        </div>
      )}
    </div>
  );
}
