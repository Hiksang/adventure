'use client';
import { useTranslations } from 'next-intl';

interface AdOverlayProps {
  brand: string;
  xpReward: number;
  isSponsored?: boolean;
}

export default function AdOverlay({ brand, xpReward, isSponsored = true }: AdOverlayProps) {
  const t = useTranslations('feed');

  return (
    <div className="absolute bottom-20 left-4 right-4">
      <div className="flex items-center gap-2 mb-2">
        {isSponsored && (
          <span className="bg-yellow-500/90 text-white text-xs font-medium px-2 py-0.5 rounded">
            {t('sponsored')}
          </span>
        )}
        <span className="bg-gradient-to-r from-purple-500/90 to-blue-500/90 text-white text-xs font-medium px-2 py-0.5 rounded">
          +{xpReward} XP
        </span>
      </div>
      <p className="text-white text-sm font-medium drop-shadow-lg">
        @{brand}
      </p>
    </div>
  );
}
