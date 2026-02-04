'use client';
import { useState } from 'react';
import type { Ad } from '@/types';

interface AdQuizProps {
  ad: Ad;
  onComplete: (correct: boolean) => void;
}

export default function AdQuiz({ ad, onComplete }: AdQuizProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const quiz = ad.quiz!;

  const handleAnswer = (index: number) => {
    if (answered) return;
    setSelected(index);
    setAnswered(true);
    setTimeout(() => onComplete(index === quiz.correct_index), 1500);
  };

  return (
    <div className="py-6">
      <h3 className="text-lg font-semibold mb-4">{quiz.question}</h3>
      <div className="space-y-3">
        {quiz.options.map((option, i) => {
          let cls = 'w-full text-left p-4 rounded-xl border transition-colors ';
          if (!answered) {
            cls += selected === i ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400';
          } else if (i === quiz.correct_index) {
            cls += 'border-green-500 bg-green-50 text-green-800';
          } else if (i === selected) {
            cls += 'border-red-500 bg-red-50 text-red-800';
          } else {
            cls += 'border-gray-200 opacity-50';
          }
          return (
            <button key={i} className={cls} onClick={() => handleAnswer(i)}>
              {option}
            </button>
          );
        })}
      </div>
      {answered && (
        <p className={`mt-4 text-center font-medium ${selected === quiz.correct_index ? 'text-green-600' : 'text-red-600'}`}>
          {selected === quiz.correct_index ? '✓ Correct! +25 bonus XP' : '✗ Incorrect'}
        </p>
      )}
    </div>
  );
}
