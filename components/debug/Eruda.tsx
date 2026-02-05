'use client';

import { useEffect } from 'react';

/**
 * Eruda - Mobile Console Debugger
 * Only loads in development mode
 * Recommended by World Mini Apps docs for mobile testing
 */
export default function Eruda() {
  useEffect(() => {
    // Only load in development or when explicitly enabled
    const isDev = process.env.NEXT_PUBLIC_APP_ENV === 'DEV';
    const isDebugEnabled = typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('debug');

    if (isDev || isDebugEnabled) {
      // Dynamically load Eruda
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/eruda';
      script.onload = () => {
        // @ts-expect-error - Eruda is loaded from CDN
        if (window.eruda) {
          // @ts-expect-error - Eruda is loaded from CDN
          window.eruda.init();
          console.log('[Eruda] Mobile debugger initialized');
        }
      };
      document.body.appendChild(script);

      return () => {
        // Cleanup on unmount
        // @ts-expect-error - Eruda is loaded from CDN
        if (window.eruda) {
          // @ts-expect-error - Eruda is loaded from CDN
          window.eruda.destroy();
        }
      };
    }
  }, []);

  return null;
}
