'use client';
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { IS_DEV } from '@/lib/env';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  login: async () => {},
  logout: () => {},
});

const DEV_USER: User = {
  id: 'dev-user-001',
  wallet_address: '0x0000000000000000000000000000000000000000',
  username: 'DevUser',
  world_id_verified: true,
  xp: 250,
  level: 3,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (IS_DEV) {
      setUser(DEV_USER);
    }
  }, []);

  const login = useCallback(async () => {
    setLoading(true);
    try {
      if (IS_DEV) {
        setUser(DEV_USER);
      } else {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const session = await res.json();
          if (session?.user) {
            setUser({
              id: session.user.id,
              wallet_address: session.walletAddress,
              username: session.user.name || 'User',
              world_id_verified: false,
              xp: 0,
              level: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
