'use client';
import Link from 'next/link';
import type { Ad } from '@/types';
import { useLocale } from '@/hooks/useLocale';

export default function AdCard({ ad }: { ad: Ad }) {
  const locale = useLocale();

  return (
    <Link href={`/${locale}/ads/${ad.id}`}>
      <div className="relative w-full rounded-2xl overflow-hidden bg-gray-100" style={{ height: 240 }}>
        {ad.thumbnail_url ? (
          <img src={ad.thumbnail_url} alt={ad.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-4xl">{ad.type === 'video' ? '\u25b6' : '\ud83d\udcc4'}</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4" style={{ height: 94 }}>
          <p className="text-white font-semibold text-sm truncate">{ad.title}</p>
          <p className="text-white/70 text-xs mt-1 line-clamp-2">{ad.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
              +{ad.xp_reward} XP
            </span>
            <span className="text-white/50 text-xs">
              {ad.type === 'video' ? `${ad.duration_seconds}s` : 'Text'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
