'use client';
import { useTranslations } from 'next-intl';
import Container from '@/components/layout/Container';
import { useAuth } from '@/hooks/useAuth';
import WalletAuthButton from '@/components/auth/WalletAuthButton';
import DevModeToggle from '@/components/auth/DevModeToggle';
import UserDisplay from '@/components/ui/UserDisplay';
import { calculateLevel, xpToNextLevel } from '@/lib/utils/rewards';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { user } = useAuth();

  if (!user) {
    return (
      <Container className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500">Sign in to view your profile</p>
        <WalletAuthButton />
      </Container>
    );
  }

  const level = calculateLevel(user.xp);
  const nextLevelXP = xpToNextLevel(user.xp);

  return (
    <Container>
      <div className="flex flex-col items-center py-6 gap-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-xl font-bold">{user.username}</h2>
        <DevModeToggle />
      </div>

      <div className="space-y-3">
        {[
          { label: t('level'), value: String(level) },
          { label: t('totalXP'), value: `${user.xp} XP` },
          { label: 'Next Level', value: `${nextLevelXP} XP needed` },
          { label: t('verified'), value: user.world_id_verified ? t('verified') : t('notVerified') },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-sm text-gray-600">{label}</span>
            <span className="text-sm font-medium">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <WalletAuthButton />
      </div>
    </Container>
  );
}
