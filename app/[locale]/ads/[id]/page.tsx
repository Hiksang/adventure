'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Container from '@/components/layout/Container';
import TextAdViewer from '@/components/ads/TextAdViewer';
import VideoAdPlayer from '@/components/ads/VideoAdPlayer';
import AdQuiz from '@/components/ads/AdQuiz';
import Loading from '@/components/ui/Loading';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import type { Ad } from '@/types';

type Phase = 'watching' | 'quiz' | 'completed';

export default function AdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const locale = useLocale();
  const { user } = useAuth();
  const [ad, setAd] = useState<Ad | null>(null);
  const [phase, setPhase] = useState<Phase>('watching');
  const [bonusXP, setBonusXP] = useState(0);

  useEffect(() => {
    fetch('/api/ads')
      .then(r => r.json())
      .then((ads: Ad[]) => setAd(ads.find(a => a.id === id) || null))
      .catch(() => {});
  }, [id]);

  const handleAdComplete = async () => {
    if (!user || !ad) return;
    await fetch(`/api/ads/${ad.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, watchPercentage: 100 }),
    });
    if (ad.quiz) {
      setPhase('quiz');
    } else {
      setPhase('completed');
    }
  };

  const handleQuizComplete = (correct: boolean) => {
    if (correct) setBonusXP(25);
    setPhase('completed');
  };

  if (!ad) return <Container><Loading /></Container>;

  return (
    <Container>
      <button onClick={() => router.back()} className="text-sm text-gray-500 mb-4">&larr; Back</button>
      <h2 className="text-xl font-bold mb-2">{ad.title}</h2>
      <p className="text-sm text-gray-500 mb-4">{ad.description}</p>

      {phase === 'watching' && (
        ad.type === 'text' ? (
          <TextAdViewer ad={ad} onComplete={handleAdComplete} />
        ) : (
          <VideoAdPlayer ad={ad} onComplete={handleAdComplete} />
        )
      )}

      {phase === 'quiz' && ad.quiz && (
        <AdQuiz ad={ad} onComplete={handleQuizComplete} />
      )}

      {phase === 'completed' && (
        <div className="text-center py-8">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-lg font-semibold">Ad Completed!</p>
          <p className="text-gray-500">You earned {ad.xp_reward} XP</p>
          {bonusXP > 0 && <p className="text-green-600 font-medium mt-1">+{bonusXP} bonus XP from quiz!</p>}
          <button
            onClick={() => router.push(`/${locale}/ads`)}
            className="mt-6 px-6 py-2 bg-black text-white rounded-full text-sm"
          >
            Back to Ads
          </button>
        </div>
      )}
    </Container>
  );
}
