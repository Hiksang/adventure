'use client';
import { useEffect, useState } from 'react';
import { initMiniKit, isMiniKitReady } from '@/lib/minikit';

export function useMiniKit() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initMiniKit();
    setReady(isMiniKitReady());
  }, []);

  return { ready };
}
