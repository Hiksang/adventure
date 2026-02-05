'use client';

import { useTranslations } from 'next-intl';
import Container from '@/components/layout/Container';
import Loading from '@/components/ui/Loading';
import { CreditsPage } from '@/components/credits/CreditsPage';
import { useAuth } from '@/hooks/useAuth';

export default function RewardsPage() {
  const t = useTranslations('rewards');
  const { user, loading, nullifierHash, walletAddress } = useAuth();

  if (loading) {
    return <Container><Loading /></Container>;
  }

  if (!user || !nullifierHash) {
    return (
      <Container className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">{t('signInRequired')}</p>
      </Container>
    );
  }

  return (
    <CreditsPage
      nullifierHash={nullifierHash}
      walletAddress={walletAddress || null}
    />
  );
}
