'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

const tabs = [
  {
    key: 'feed',
    href: '',
    icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z'
  },
  {
    key: 'rewards',
    href: '/rewards',
    icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7'
  },
  {
    key: 'profile',
    href: '/profile',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
  },
];

export default function TabNavigation({ locale }: { locale: string }) {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 max-w-[430px] mx-auto">
        {tabs.map((tab) => {
          const fullHref = `/${locale}${tab.href}`;
          const isActive = tab.href === ''
            ? pathname === `/${locale}` || pathname === `/${locale}/`
            : pathname.startsWith(fullHref);

          return (
            <Link
              key={tab.key}
              href={fullHref}
              className={`flex flex-col items-center gap-1 px-6 py-2 text-xs transition-colors ${
                isActive ? 'text-black' : 'text-gray-400'
              }`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 2.5 : 1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              <span className={isActive ? 'font-semibold' : ''}>{t(tab.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
