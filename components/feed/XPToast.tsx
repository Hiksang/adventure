'use client';
import { useEffect, useState } from 'react';

interface XPToastProps {
  xp: number;
  visible: boolean;
  onHide: () => void;
}

export default function XPToast({ xp, visible, onHide }: XPToastProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        onHide();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);

  if (!visible && !isAnimating) return null;

  return (
    <div
      className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none transition-all duration-500 ${
        isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
      }`}
    >
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
        <span className="text-2xl">⭐</span>
        <span className="text-xl font-bold">+{xp} XP</span>
      </div>
    </div>
  );
}
