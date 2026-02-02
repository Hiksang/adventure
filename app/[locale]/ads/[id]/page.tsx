'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Container from '@/components/layout/Container';
import TextAdViewer from '@/components/ads/TextAdViewer';
import VideoAdPlayer from '@/components/ads/VideoAdPlayer';
import Loading from '@/components/ui/Loading';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import type { Ad } from '@/types';

export default function AdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const locale = useLocale();
  const { user } = useAuth();
  const [ad, setAd] = useState<Ad | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetch('/api/ads')
      .then(r => r.json())
      .then((ads: Ad[]) => setAd(ads.find(a => a.id === id) || null))
      .catch(() => {});
  }, [id]);

  const handleComplete = async () => {
    if (!user || !ad) return;
    await fetch(`/api/ads/${ad.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, watchPercentage: 100 }),
    });
    setCompleted(true);
    setTimeout(() => router.push(`/${locale}/ads`), 2000);
  };

  if (!ad) return <Container><Loading /></Container>;

  return (
    <Container>
      <button onClick={() => router.back()} className="text-sm text-gray-500 mb-4">&larr; Back</button>
      <h2 className="text-xl font-bold mb-2">{ad.title}</h2>
      <p className="text-sm text-gray-500 mb-4">{ad.description}</p>

      {completed ? (
        <div className="text-center py-8">
          <p className="text-2xl mb-2">{'\ud83c\udf89'}</p>
          <p className="text-lg font-semibold">Ad Completed!</p>
          <p className="text-gray-500">You earned {ad.xp_reward} XP</p>
        </div>
      ) : ad.type === 'text' ? (
        <TextAdViewer ad={ad} onComplete={handleComplete} />
      ) : (
        <VideoAdPlayer ad={ad} onComplete={handleComplete} />
      )}
    </Container>
  );
}
