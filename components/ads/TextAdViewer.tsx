'use client';
import { useState, useEffect } from 'react';
import Button from '../ui/Button';
import type { Ad } from '@/types';

interface TextAdViewerProps {
  ad: Ad;
  onComplete: () => void;
}

export default function TextAdViewer({ ad, onComplete }: TextAdViewerProps) {
  const [timeLeft, setTimeLeft] = useState(ad.duration_seconds);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      setCompleted(true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-6 min-h-[200px]">
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{ad.content_text}</p>
      </div>

      {!completed ? (
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-gray-200 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-600">{timeLeft}</span>
          </div>
          <p className="text-sm text-gray-400 mt-2">Read the ad to continue</p>
        </div>
      ) : (
        <Button onClick={onComplete} size="lg" className="w-full">
          Claim {ad.xp_reward} XP
        </Button>
      )}
    </div>
  );
}
