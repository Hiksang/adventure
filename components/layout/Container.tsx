import { ReactNode } from 'react';

export default function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <main className={`px-6 py-4 pb-24 ${className}`}>
      {children}
    </main>
  );
}
