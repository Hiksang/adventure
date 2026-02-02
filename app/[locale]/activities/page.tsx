'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Container from '@/components/layout/Container';
import ActivityCard from '@/components/activities/ActivityCard';
import Loading from '@/components/ui/Loading';
import type { Activity } from '@/types';

export default function ActivitiesPage() {
  const t = useTranslations('activities');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/activities')
      .then(r => r.json())
      .then(setActivities)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Container>
      <h2 className="text-xl font-bold mb-4">{t('title')}</h2>
      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-3">
          {activities.map(a => (
            <ActivityCard key={a.id} activity={a} />
          ))}
        </div>
      )}
    </Container>
  );
}
