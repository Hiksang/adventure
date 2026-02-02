import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '../globals.css';
import Providers from '../providers';
import Header from '@/components/layout/Header';
import TabNavigation from '@/components/layout/TabNavigation';

export const metadata: Metadata = {
  title: 'Advertise',
  description: 'Watch ads, complete activities, earn rewards',
};

const locales = ['en', 'ko'];

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();

  let messages;
  try {
    messages = (await import(`@/messages/${locale}.json`)).default;
  } catch {
    notFound();
  }

  return (
    <html lang={locale}>
      <body className="bg-white text-black antialiased overscroll-none">
        <Providers locale={locale} messages={messages}>
          <div className="min-h-screen flex flex-col max-w-[430px] mx-auto">
            <Header />
            <div className="flex-1">{children}</div>
            <TabNavigation locale={locale} />
          </div>
        </Providers>
      </body>
    </html>
  );
}
