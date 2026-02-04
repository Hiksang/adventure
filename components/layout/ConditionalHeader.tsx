'use client';
import { usePathname } from 'next/navigation';
import Header from './Header';

export default function ConditionalHeader() {
  const pathname = usePathname();

  const isFeedPage = pathname === '/en' || pathname === '/ko' ||
                     pathname === '/en/' || pathname === '/ko/';

  if (isFeedPage) {
    return null;
  }

  return <Header />;
}
