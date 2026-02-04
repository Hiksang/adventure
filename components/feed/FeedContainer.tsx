'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { FeedItem } from '@/types';
import FeedCard from './FeedCard';
import XPToast from './XPToast';
import ChallengeModal from './ChallengeModal';

interface ChallengeData {
  id: string;
  type: 'tap' | 'math' | 'swipe' | 'sequence';
  question: string;
  options?: string[];
  timeoutMs: number;
}

interface FeedContainerProps {
  initialItems: FeedItem[];
  userId?: string;
  nullifierHash?: string;
  onLoadMore?: () => Promise<FeedItem[]>;
}

export default function FeedContainer({ initialItems, userId, nullifierHash, onLoadMore }: FeedContainerProps) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [xpToast, setXpToast] = useState({ visible: false, amount: 0 });
  const [activeChallenge, setActiveChallenge] = useState<ChallengeData | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockRemainingMs, setLockRemainingMs] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const isScrolling = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (isScrolling.current) return;

    const diff = touchStartY.current - touchEndY.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      isScrolling.current = true;

      if (diff > 0 && currentIndex < items.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }

      setTimeout(() => {
        isScrolling.current = false;
      }, 300);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isScrolling.current) return;

    const threshold = 30;

    if (Math.abs(e.deltaY) > threshold) {
      isScrolling.current = true;

      if (e.deltaY > 0 && currentIndex < items.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (e.deltaY < 0 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }

      setTimeout(() => {
        isScrolling.current = false;
      }, 300);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' && currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (e.key === 'ArrowUp' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex, items.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (currentIndex >= items.length - 3 && onLoadMore) {
      onLoadMore().then(newItems => {
        if (newItems.length > 0) {
          setItems(prev => [...prev, ...newItems]);
        }
      });
    }
  }, [currentIndex, items.length, onLoadMore]);

  // Check for challenge when XP is earned
  const checkForChallenge = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch('/api/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.isLocked) {
        setIsLocked(true);
        setLockRemainingMs(data.lockRemainingMs);
        return;
      }

      if (data.needsChallenge && data.challenge) {
        setActiveChallenge(data.challenge);
      }
    } catch (error) {
      console.error('Failed to check challenge:', error);
    }
  }, [userId]);

  const handleChallengeComplete = (success: boolean) => {
    setActiveChallenge(null);
    if (!success) {
      // Optionally show a message that XP won't be awarded
      console.log('Challenge failed - XP may not be awarded for next views');
    }
  };

  const handleXPEarned = (xp: number) => {
    setXpToast({ visible: true, amount: xp });
    // Check if a challenge is needed after earning XP
    checkForChallenge();
  };

  const handleXPToastHide = () => {
    setXpToast({ visible: false, amount: 0 });
  };

  const handleQuizAnswer = (correct: boolean, xp: number) => {
    if (correct && xp > 0) {
      setXpToast({ visible: true, amount: xp });
    }
    setTimeout(() => {
      if (currentIndex < items.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    }, 1500);
  };

  const handleQuizSkip = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden bg-black"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      <div
        className="h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateY(-${currentIndex * 100}%)` }}
      >
        {items.map((item, index) => (
          <div key={item.id} className="h-full w-full">
            <FeedCard
              item={item}
              isActive={index === currentIndex}
              userId={userId}
              onXPEarned={handleXPEarned}
              onQuizAnswer={handleQuizAnswer}
              onQuizSkip={handleQuizSkip}
            />
          </div>
        ))}
      </div>

      <XPToast
        xp={xpToast.amount}
        visible={xpToast.visible}
        onHide={handleXPToastHide}
      />

      {/* Challenge Modal */}
      {activeChallenge && userId && (
        <ChallengeModal
          challenge={activeChallenge}
          userId={userId}
          onComplete={handleChallengeComplete}
          onClose={() => setActiveChallenge(null)}
        />
      )}

      {/* Lock Message */}
      {isLocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-sm mx-4 text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-white text-lg font-bold mb-2">Temporarily Locked</h2>
            <p className="text-white/70">
              Please wait {Math.ceil(lockRemainingMs / 1000)} seconds
            </p>
          </div>
        </div>
      )}

      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
        {items.map((_, index) => (
          <div
            key={index}
            className={`w-1 h-1 rounded-full transition-all ${
              index === currentIndex ? 'bg-white h-3' : 'bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
