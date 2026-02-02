'use client';
import { IS_DEV } from '@/lib/env';

export default function DevModeToggle() {
  if (!IS_DEV) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700 flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-yellow-400" />
      DEV Mode — World ID bypassed
    </div>
  );
}
