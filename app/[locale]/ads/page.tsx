'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Container from '@/components/layout/Container';
import AdCard from '@/components/ads/AdCard';
import Loading from '@/components/ui/Loading';
import type { Ad } from '@/types';

export default function AdsPage() {
  const t = useTranslations('ads');
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ads')
      .then(r => r.json())
      .then(setAds)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Container>
      <h2 className="text-xl font-bold mb-4">{t('title')}</h2>
      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-4">
          {ads.map(ad => (
            <AdCard key={ad.id} ad={ad} />
          ))}
        </div>
      )}
    </Container>
  );
}
