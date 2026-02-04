'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { FeedItem } from '@/types';
import AdOverlay from './AdOverlay';
import QuizCard from './QuizCard';

interface FeedCardProps {
  item: FeedItem;
  isActive: boolean;
  userId?: string;
  onXPEarned: (xp: number) => void;
  onQuizAnswer: (correct: boolean, xp: number) => void;
  onQuizSkip: () => void;
}

export default function FeedCard({ item, isActive, userId, onXPEarned, onQuizAnswer, onQuizSkip }: FeedCardProps) {
  const [watchProgress, setWatchProgress] = useState(0);
  const [xpAwarded, setXpAwarded] = useState(false);
  const [viewToken, setViewToken] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'started' | 'completed' | 'failed'>('idle');
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Start ad view session with server
  const startAdViewSession = useCallback(async () => {
    if (!userId || !item.ad) return;

    try {
      const response = await fetch('/api/ad-view/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          adId: item.ad.id,
          duration: item.ad.duration_seconds,
        }),
      });

      const data = await response.json();
      if (data.success && data.viewToken) {
        setViewToken(data.viewToken);
        setVerificationStatus('started');
        startTimeRef.current = Date.now();
      }
    } catch (error) {
      console.error('Failed to start ad view session:', error);
    }
  }, [userId, item.ad]);

  // Complete ad view session with server verification
  const completeAdViewSession = useCallback(async () => {
    if (!userId || !item.ad || !viewToken) return false;

    try {
      const response = await fetch('/api/ad-view/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          adId: item.ad.id,
          viewToken,
          expectedXP: item.ad.xp_reward,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setVerificationStatus('completed');
        return true;
      } else {
        console.warn('Ad view verification failed:', data.error);
        setVerificationStatus('failed');
        return false;
      }
    } catch (error) {
      console.error('Failed to complete ad view session:', error);
      setVerificationStatus('failed');
      return false;
    }
  }, [userId, item.ad, viewToken]);

  // Handle ad watching
  useEffect(() => {
    if (!isActive || item.type !== 'ad' || xpAwarded) {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      return;
    }

    // Start server-side session
    if (verificationStatus === 'idle') {
      startAdViewSession();
    }

    const duration = item.ad?.duration_seconds || 10;
    const intervalMs = 100;
    const incrementPerInterval = 100 / (duration * 1000 / intervalMs);

    progressInterval.current = setInterval(() => {
      setWatchProgress(prev => {
        const newProgress = prev + incrementPerInterval;
        if (newProgress >= 100 && !xpAwarded) {
          setXpAwarded(true);

          // Verify with server before awarding XP
          completeAdViewSession().then(verified => {
            if (verified) {
              onXPEarned(item.ad?.xp_reward || 50);
            } else {
              // Server verification failed - don't award XP
              console.warn('XP not awarded due to verification failure');
            }
          });

          if (progressInterval.current) {
            clearInterval(progressInterval.current);
          }
          return 100;
        }
        return newProgress;
      });
    }, intervalMs);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isActive, item, xpAwarded, verificationStatus, startAdViewSession, completeAdViewSession, onXPEarned]);

  // Reset when leaving this card
  useEffect(() => {
    if (!isActive) {
      setWatchProgress(0);
      setXpAwarded(false);
      setViewToken(null);
      setVerificationStatus('idle');
    }
  }, [isActive]);

  if (item.type === 'quiz' && item.quiz) {
    return (
      <div className="h-full w-full">
        <QuizCard
          quiz={item.quiz}
          userId={userId}
          onAnswer={onQuizAnswer}
          onSkip={onQuizSkip}
        />
      </div>
    );
  }

  const isAd = item.type === 'ad';
  const mediaType = isAd ? item.ad?.type : item.content?.type;
  const mediaUrl = isAd ? item.ad?.url : item.content?.url;
  const creator = isAd ? item.ad?.brand : item.content?.creator;
  const description = isAd ? item.ad?.title : item.content?.description;

  return (
    <div className="relative h-full w-full bg-black flex items-center justify-center overflow-hidden">
      {mediaType === 'video' && mediaUrl ? (
        <video
          src={mediaUrl}
          className="w-full h-full object-cover"
          autoPlay={isActive}
          loop
          muted
          playsInline
        />
      ) : mediaType === 'image' && mediaUrl ? (
        <img
          src={mediaUrl}
          alt={description || ''}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-8">
          <p className="text-white text-lg text-center">
            {item.content?.text || item.ad?.text || description}
          </p>
        </div>
      )}

      {isAd && item.ad && (
        <>
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-100"
              style={{ width: `${watchProgress}%` }}
            />
          </div>
          <AdOverlay
            brand={item.ad.brand}
            xpReward={item.ad.xp_reward}
            isSponsored={true}
          />
          {/* Verification status indicator (subtle) */}
          {verificationStatus === 'started' && (
            <div className="absolute top-2 left-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Verified session" />
            </div>
          )}
        </>
      )}

      {!isAd && item.content && (
        <div className="absolute bottom-20 left-4 right-16">
          <p className="text-white font-semibold drop-shadow-lg">
            @{creator}
          </p>
          <p className="text-white/90 text-sm mt-1 drop-shadow-lg line-clamp-2">
            {description}
          </p>
        </div>
      )}

      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6">
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <span className="text-white text-xs">{item.content?.likes || 0}</span>
        </button>

        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-white text-xs">{item.content?.comments || 0}</span>
        </button>
      </div>
    </div>
  );
}
