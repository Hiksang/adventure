'use client';
import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { MiniKit } from '@worldcoin/minikit-js';
import { useEffect } from 'react';
import { AuthProvider } from '@/hooks/useAuth';

interface ProvidersProps {
  children: ReactNode;
  locale: string;
  messages: any;
}

// MiniKit initialization component
function MiniKitProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    MiniKit.install();
    console.log('[MiniKit] Installed, isInstalled:', MiniKit.isInstalled());
  }, []);

  return <>{children}</>;
}

export default function Providers({ children, locale, messages }: ProvidersProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <MiniKitProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </MiniKitProvider>
    </NextIntlClientProvider>
  );
}
