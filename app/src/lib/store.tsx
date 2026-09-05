import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Education, Gender, LanguageCode } from '@/lib/api';

interface Profile {
  language: LanguageCode | null;
  state?: string;
  district?: string;
}

// Voice-onboarding answers for a guest (no account). Kept in memory only —
// it lives for the current app session and is gone on restart.
export interface GuestProfile {
  name?: string;
  gender?: Gender;
  age?: number;
  education?: Education;
}

interface StoreValue extends Profile {
  ready: boolean;
  guestProfile: GuestProfile | null;
  guestOnboarded: boolean;
  setLanguage: (l: LanguageCode) => Promise<void>;
  setLocation: (state?: string, district?: string) => Promise<void>;
  setGuestProfile: (p: GuestProfile) => void;
  reset: () => Promise<void>;
}

const KEY = 'saksham.profile.v1';
const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>({ language: null });
  const [guestProfile, setGuestProfileState] = useState<GuestProfile | null>(null);
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
      guestProfile,
      guestOnboarded: guestProfile !== null,
      setLanguage: (language) => persist({ ...profile, language }),
      setLocation: (state, district) => persist({ ...profile, state, district }),
      setGuestProfile: (p) => setGuestProfileState(p),
      reset: () => {
        setGuestProfileState(null);
        return persist({ language: null });
      },
    }),
    [profile, ready, guestProfile],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
