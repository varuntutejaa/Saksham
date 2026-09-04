import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LanguageCode } from '@/lib/api';

interface Profile {
  language: LanguageCode | null;
  state?: string;
  district?: string;
}

interface StoreValue extends Profile {
  ready: boolean;
  setLanguage: (l: LanguageCode) => Promise<void>;
  setLocation: (state?: string, district?: string) => Promise<void>;
  reset: () => Promise<void>;
}

const KEY = 'saksham.profile.v1';
const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>({ language: null });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setProfile(JSON.parse(raw)))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const persist = async (next: Profile) => {
    setProfile(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  };

  const value = useMemo<StoreValue>(
    () => ({
      ...profile,
      ready,
      setLanguage: (language) => persist({ ...profile, language }),
      setLocation: (state, district) => persist({ ...profile, state, district }),
      reset: () => persist({ language: null }),
    }),
    [profile, ready],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
