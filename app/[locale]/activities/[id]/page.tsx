'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Container from '@/components/layout/Container';
import CodeInput from '@/components/activities/CodeInput';
import KnowledgeQuiz from '@/components/activities/KnowledgeQuiz';
import Loading from '@/components/ui/Loading';
import { useLocale } from '@/hooks/useLocale';
import type { Activity } from '@/types';

export default function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const locale = useLocale();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [result, setResult] = useState<{ xp: number; message: string } | null>(null);

  useEffect(() => {
    fetch('/api/activities')
      .then(r => r.json())
      .then((acts: Activity[]) => setActivity(acts.find(a => a.id === id) || null))
      .catch(() => {});
  }, [id]);

  if (!activity) return <Container><Loading /></Container>;

  if (result) {
    return (
      <Container className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-4xl">{'\ud83c\udf89'}</p>
        <p className="text-lg font-semibold">{result.message}</p>
        <p className="text-gray-500">You earned {result.xp} XP</p>
        <button
          onClick={() => router.push(`/${locale}/activities`)}
          className="text-sm text-gray-500 underline mt-4"
        >
          Back to activities
        </button>
      </Container>
    );
  }

  return (
    <Container>
      <button onClick={() => router.back()} className="text-sm text-gray-500 mb-4">&larr; Back</button>
      <h2 className="text-xl font-bold mb-2">{activity.title}</h2>
      <p className="text-sm text-gray-500 mb-6">{activity.description}</p>

      {activity.type === 'code_entry' ? (
        <CodeInput
          activityId={activity.id}
          onSuccess={(xp) => setResult({ xp, message: 'Code verified!' })}
        />
      ) : activity.questions ? (
        <KnowledgeQuiz
          questions={activity.questions}
          activityId={activity.id}
          onComplete={(correct, total, xp) =>
            setResult({ xp, message: `Quiz completed! ${correct}/${total} correct` })
          }
        />
      ) : null}
    </Container>
  );
}
