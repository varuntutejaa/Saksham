import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as api from '@/lib/api';
import type { AuthUser, LanguageCode } from '@/lib/api';

interface Session {
  token: string;
  user: AuthUser;
}

interface AuthValue {
  ready: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (phone: string, password: string) => Promise<void>;
  register: (input: { phone: string; password: string; name?: string; language: LanguageCode }) => Promise<void>;
  logout: () => Promise<void>;
}

const KEY = 'saksham.auth.v1';
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setSession(JSON.parse(raw)))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  async function persist(next: Session | null) {
    setSession(next);
    if (next) await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
    else await AsyncStorage.removeItem(KEY).catch(() => {});
  }

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      token: session?.token ?? null,
      user: session?.user ?? null,
      login: async (phone, password) => {
        const res = await api.login(phone, password);
        await persist(res);
      },
      register: async (input) => {
        const res = await api.register(input);
        await persist(res);
      },
      logout: () => persist(null),
    }),
    [session, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
