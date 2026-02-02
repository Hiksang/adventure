'use client';
import UserDisplay from '../ui/UserDisplay';
import { useAuth } from '@/hooks/useAuth';

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Advertise</h1>
        {user && <UserDisplay username={user.username} level={user.level} />}
      </div>
    </header>
  );
}
