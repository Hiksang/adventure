'use client';
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  nullifierHash: string | null;
  verificationLevel: 'orb' | 'device' | null;
  walletAddress: string | null;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => void;
  setAuthData: (data: {
    nullifierHash: string;
    walletAddress?: string;
    verificationLevel?: 'orb' | 'device';
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  nullifierHash: null,
  verificationLevel: null,
  walletAddress: null,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
  setAuthData: async () => {},
});

const STORAGE_KEY = 'adwatch_auth';

interface StoredAuth {
  nullifierHash: string;
  walletAddress?: string;
  verificationLevel?: 'orb' | 'device';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [nullifierHash, setNullifierHash] = useState<string | null>(null);
  const [verificationLevel, setVerificationLevel] = useState<'orb' | 'device' | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Load stored auth on mount
  useEffect(() => {
    const loadStoredAuth = async () => {
      const isMiniKitInstalled = MiniKit.isInstalled();

      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const auth: StoredAuth = JSON.parse(stored);
          setNullifierHash(auth.nullifierHash);
          setVerificationLevel(auth.verificationLevel || null);
          setWalletAddress(auth.walletAddress || null);

          // In browser mode (no MiniKit), just use stored data
          if (!isMiniKitInstalled) {
            console.log('[Auth] Browser mode - using stored auth data');
            // Create a dev user based on stored auth
            setUser({
              id: `user-${auth.nullifierHash.slice(0, 8)}`,
              wallet_address: auth.walletAddress || '0x0000000000000000000000000000000000000000',
              username: 'User',
              world_id_verified: true,
              xp: 250,
              level: 3,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              nullifier_hash: auth.nullifierHash,
              verification_level: auth.verificationLevel || 'device',
            });
            setLoading(false);
            return;
          }

          // Fetch user data from server (World App mode)
          const res = await fetch(`/api/auth/signup?nullifier_hash=${auth.nullifierHash}`);
          if (res.ok) {
            const data = await res.json();
            if (data.exists) {
              // User exists, fetch full profile
              const profileRes = await fetch(`/api/profile?nullifier=${auth.nullifierHash}`);
              if (profileRes.ok) {
                const profile = await profileRes.json();
                setUser(profile.user);
              }
            }
          }
        }
      } catch (error) {
        console.error('[Auth] Load error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  const setAuthData = useCallback(async (data: {
    nullifierHash: string;
    walletAddress?: string;
    verificationLevel?: 'orb' | 'device';
  }) => {
    setLoading(true);
    const isMiniKitInstalled = MiniKit.isInstalled();

    try {
      setNullifierHash(data.nullifierHash);
      setVerificationLevel(data.verificationLevel || null);
      setWalletAddress(data.walletAddress || null);

      // Store in localStorage
      const authData: StoredAuth = {
        nullifierHash: data.nullifierHash,
        walletAddress: data.walletAddress,
        verificationLevel: data.verificationLevel,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));

      // In browser mode (no MiniKit), create local user
      if (!isMiniKitInstalled) {
        console.log('[Auth] Browser mode - creating local user');
        setUser({
          id: `user-${data.nullifierHash.slice(0, 8)}`,
          wallet_address: data.walletAddress || '0x0000000000000000000000000000000000000000',
          username: 'User',
          world_id_verified: true,
          xp: 0,
          level: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          nullifier_hash: data.nullifierHash,
          verification_level: data.verificationLevel || 'device',
        });
        setLoading(false);
        return;
      }

      // Create or get user from server (World App mode)
      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nullifier_hash: data.nullifierHash,
          wallet_address: data.walletAddress,
          verification_level: data.verificationLevel,
        }),
      });

      if (signupRes.ok) {
        const result = await signupRes.json();
        setUser(result.user);
      } else if (signupRes.status === 409) {
        // User already exists, fetch profile
        const profileRes = await fetch(`/api/profile?nullifier=${data.nullifierHash}`);
        if (profileRes.ok) {
          const profile = await profileRes.json();
          setUser(profile.user);
        }
      }
    } catch (error) {
      console.error('[Auth] Set auth data error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async () => {
    // Legacy login - now handled by AuthFlow
    // Kept for backward compatibility
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setNullifierHash(null);
    setVerificationLevel(null);
    setWalletAddress(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const isAuthenticated = !!nullifierHash && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        nullifierHash,
        verificationLevel,
        walletAddress,
        isAuthenticated,
        login,
        logout,
        setAuthData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
