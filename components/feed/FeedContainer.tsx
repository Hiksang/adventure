'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { FeedItem } from '@/types';
import FeedCard from './FeedCard';
import XPToast from './XPToast';

interface FeedContainerProps {
  initialItems: FeedItem[];
  onLoadMore?: () => Promise<FeedItem[]>;
}

export default function FeedContainer({ initialItems, onLoadMore }: FeedContainerProps) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [xpToast, setXpToast] = useState({ visible: false, amount: 0 });
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

  const handleXPEarned = (xp: number) => {
    setXpToast({ visible: true, amount: xp });
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
