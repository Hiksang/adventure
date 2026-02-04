'use client';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface SettingsListProps {
  locale: string;
  onLogout: () => void;
}

export default function SettingsList({ locale, onLogout }: SettingsListProps) {
  const t = useTranslations('profile');

  const settings = [
    {
      label: t('notifications'),
      icon: '🔔',
      action: 'link',
      href: `/${locale}/profile/notifications`,
    },
    {
      label: t('language'),
      icon: '🌐',
      action: 'link',
      href: `/${locale}/profile/language`,
      value: locale === 'ko' ? '한국어' : 'English',
    },
    {
      label: t('logout'),
      icon: '🚪',
      action: 'button',
      onClick: onLogout,
      danger: true,
    },
  ];

  return (
    <div>
      <h3 className="font-semibold mb-3">{t('settings')}</h3>
      <div className="space-y-2">
        {settings.map((setting) => {
          const content = (
            <div className="flex items-center justify-between">
              <span className={`flex items-center gap-2 text-sm ${setting.danger ? 'text-red-500' : 'text-gray-600'}`}>
                <span>{setting.icon}</span>
                {setting.label}
              </span>
              <div className="flex items-center gap-2">
                {setting.value && (
                  <span className="text-sm text-gray-400">{setting.value}</span>
                )}
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          );

          if (setting.action === 'button') {
            return (
              <button
                key={setting.label}
                onClick={setting.onClick}
                className="w-full bg-gray-50 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors text-left"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={setting.label}
              href={setting.href!}
              className="block bg-gray-50 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
