'use client';
import { useState } from 'react';
import Button from '../ui/Button';
import type { QuizQuestion } from '@/types';

interface KnowledgeQuizProps {
  questions: QuizQuestion[];
  activityId: string;
  onComplete: (correct: number, total: number, xp: number) => void;
}

export default function KnowledgeQuiz({ questions, activityId, onComplete }: KnowledgeQuizProps) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const question = questions[current];
  const isLast = current === questions.length - 1;

  const handleNext = async () => {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);

    if (isLast) {
      setSubmitting(true);
      try {
        const res = await fetch('/api/activities/submit-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activityId, answers: newAnswers }),
        });
        const data = await res.json();
        onComplete(data.correct, data.total, data.xp_earned);
      } catch {
        onComplete(0, questions.length, 0);
      } finally {
        setSubmitting(false);
      }
    } else {
      setCurrent(current + 1);
      setSelected(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>Question {current + 1}/{questions.length}</span>
        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-black h-1.5 rounded-full transition-all"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <h3 className="text-lg font-semibold">{question.question}</h3>

      <div className="space-y-2">
        {question.options.map((option, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
              selected === i
                ? 'border-black bg-gray-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <Button
        onClick={handleNext}
        disabled={selected === null}
        loading={submitting}
        size="lg"
        className="w-full"
      >
        {isLast ? 'Submit' : 'Next'}
      </Button>
    </div>
  );
}
