'use client';
import { useParams } from 'next/navigation';

export function useLocale() {
  const params = useParams();
  return (params?.locale as string) || 'en';
}
