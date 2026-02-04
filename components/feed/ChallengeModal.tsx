'use client';
import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';

type ChallengeType = 'tap' | 'math' | 'swipe' | 'sequence';

interface ChallengeData {
  id: string;
  type: ChallengeType;
  question: string;
  options?: string[];
  timeoutMs: number;
}

interface ChallengeModalProps {
  challenge: ChallengeData;
  userId: string;
  onComplete: (success: boolean) => void;
  onClose: () => void;
}

export default function ChallengeModal({ challenge, userId, onComplete, onClose }: ChallengeModalProps) {
  const t = useTranslations('challenge');
  const [timeLeft, setTimeLeft] = useState(Math.floor(challenge.timeoutMs / 1000));
  const [tapCount, setTapCount] = useState(0);
  const [sequence, setSequence] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleTimeout = async () => {
    await submitAnswer('', true);
  };

  const submitAnswer = useCallback(async (answer: string, isTimeout = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/challenge/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          challengeId: challenge.id,
          answer,
          skip: isTimeout,
        }),
      });

      const data = await response.json();
      onComplete(data.success);
    } catch {
      onComplete(false);
    }
  }, [userId, challenge.id, isSubmitting, onComplete]);

  // Parse challenge data
  const parsedData = (() => {
    if (challenge.type === 'tap') {
      const count = parseInt(challenge.question.split(':')[1]);
      return { targetTaps: count };
    }
    if (challenge.type === 'swipe') {
      const direction = challenge.question.split(':')[1];
      return { direction };
    }
    if (challenge.type === 'sequence') {
      const seq = challenge.question.split(':')[1].split(',');
      return { targetSequence: seq };
    }
    return {};
  })();

  // Tap challenge handler
  const handleTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (newCount >= (parsedData.targetTaps || 3)) {
      submitAnswer(String(newCount));
    }
  };

  // Math challenge handler
  const handleMathAnswer = (answer: string) => {
    submitAnswer(answer);
  };

  // Swipe challenge handler
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStart.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.y;
    const threshold = 50;

    let direction = '';
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > threshold ? 'RIGHT' : deltaX < -threshold ? 'LEFT' : '';
    } else {
      direction = deltaY > threshold ? 'DOWN' : deltaY < -threshold ? 'UP' : '';
    }

    if (direction) {
      submitAnswer(direction);
    }
  };

  // Sequence challenge handler
  const handleSequenceColor = (color: string) => {
    const newSequence = [...sequence, color];
    setSequence(newSequence);

    const targetSequence = parsedData.targetSequence || [];
    if (newSequence.length >= targetSequence.length) {
      submitAnswer(newSequence.join(','));
    }
  };

  const colorStyles: Record<string, string> = {
    RED: 'bg-red-500 hover:bg-red-400',
    BLUE: 'bg-blue-500 hover:bg-blue-400',
    GREEN: 'bg-green-500 hover:bg-green-400',
    YELLOW: 'bg-yellow-500 hover:bg-yellow-400',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-bold">{t('title')}</h2>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            timeLeft <= 10 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'
          }`}>
            {timeLeft}s
          </div>
        </div>

        <p className="text-white/70 text-sm mb-6">{t('description')}</p>

        {/* Tap Challenge */}
        {challenge.type === 'tap' && (
          <div className="text-center">
            <p className="text-white mb-4">
              {t('tapInstruction', { count: parsedData.targetTaps ?? 3 })}
            </p>
            <button
              onClick={handleTap}
              disabled={isSubmitting}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white text-2xl font-bold shadow-lg active:scale-95 transition-transform"
            >
              {tapCount} / {parsedData.targetTaps ?? 3}
            </button>
          </div>
        )}

        {/* Math Challenge */}
        {challenge.type === 'math' && (
          <div className="text-center">
            <p className="text-white text-2xl font-bold mb-6">{challenge.question}</p>
            <div className="grid grid-cols-2 gap-3">
              {challenge.options?.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleMathAnswer(option)}
                  disabled={isSubmitting}
                  className="py-4 rounded-xl bg-white/10 text-white text-xl font-medium hover:bg-white/20 active:scale-95 transition-all"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Swipe Challenge */}
        {challenge.type === 'swipe' && (
          <div
            className="text-center"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <p className="text-white mb-4">
              {t('swipeInstruction', { direction: t(`direction.${parsedData.direction?.toLowerCase()}`) })}
            </p>
            <div className="w-full h-40 rounded-xl bg-white/10 flex items-center justify-center text-6xl">
              {parsedData.direction === 'UP' && '⬆️'}
              {parsedData.direction === 'DOWN' && '⬇️'}
              {parsedData.direction === 'LEFT' && '⬅️'}
              {parsedData.direction === 'RIGHT' && '➡️'}
            </div>
            <p className="text-white/50 text-sm mt-2">{t('swipeHint')}</p>
          </div>
        )}

        {/* Sequence Challenge */}
        {challenge.type === 'sequence' && (
          <div className="text-center">
            <p className="text-white mb-2">{t('sequenceInstruction')}</p>
            <div className="flex justify-center gap-2 mb-4">
              {parsedData.targetSequence?.map((color, i) => (
                <div
                  key={i}
                  className={`w-10 h-10 rounded-full ${colorStyles[color]} ${
                    i < sequence.length ? 'opacity-50' : ''
                  }`}
                />
              ))}
            </div>
            <p className="text-white/50 text-sm mb-4">
              {t('sequenceProgress', { current: sequence.length, total: parsedData.targetSequence?.length ?? 3 })}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {challenge.options?.map((color) => (
                <button
                  key={color}
                  onClick={() => handleSequenceColor(color)}
                  disabled={isSubmitting}
                  className={`py-6 rounded-xl ${colorStyles[color]} active:scale-95 transition-transform`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Skip button */}
        <button
          onClick={() => {
            submitAnswer('', true);
            onClose();
          }}
          className="w-full mt-6 py-2 text-white/50 text-sm hover:text-white/70"
        >
          {t('skip')}
        </button>
      </div>
    </div>
  );
}
