'use client';
import { useTranslations } from 'next-intl';
import type { User } from '@/types';

interface ProfileHeaderProps {
  user: User;
}

export default function ProfileHeader({ user }: ProfileHeaderProps) {
  const t = useTranslations('profile');

  return (
    <div className="flex flex-col items-center py-6">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
        {user.username.charAt(0).toUpperCase()}
      </div>
      <h2 className="text-xl font-bold mt-3">@{user.username}</h2>
      <div className="flex items-center gap-1.5 mt-1">
        {user.world_id_verified ? (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            World ID {t('verified')}
          </span>
        ) : (
          <span className="text-sm text-gray-500">{t('notVerified')}</span>
        )}
      </div>
    </div>
  );
}
