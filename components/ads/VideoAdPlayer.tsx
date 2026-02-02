'use client';
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Button from '../ui/Button';
import type { Ad } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactPlayer = dynamic(() => import('react-player') as any, { ssr: false }) as any;

interface VideoAdPlayerProps {
  ad: Ad;
  onComplete: () => void;
}

export default function VideoAdPlayer({ ad, onComplete }: VideoAdPlayerProps) {
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  const handleProgress = useCallback(({ played }: { played: number }) => {
    setProgress(Math.round(played * 100));
    if (played >= 0.9 && !completed) {
      setCompleted(true);
    }
  }, [completed]);

  return (
    <div className="space-y-4">
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
        <ReactPlayer
          url={ad.content_url || ''}
          width="100%"
          height="100%"
          playing
          controls={false}
          onProgress={handleProgress}
          config={{ file: { attributes: { playsInline: true } } }}
        />
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-black h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {completed ? (
        <Button onClick={onComplete} size="lg" className="w-full">
          Claim {ad.xp_reward} XP
        </Button>
      ) : (
        <p className="text-center text-sm text-gray-400">
          Watch at least 90% to earn rewards ({progress}%)
        </p>
      )}
    </div>
  );
}
