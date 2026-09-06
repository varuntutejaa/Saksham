import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Education, Gender, LanguageCode } from '@/lib/api';

interface Profile {
  language: LanguageCode | null;
  state?: string;
  district?: string;
}

// Voice-onboarding answers for a guest (no account). Persisted on-device so a
// returning guest is greeted by name and doesn't re-answer every question on
// each launch — re-asking four questions by voice is a real cost for the
// low-literacy users this app serves. Stored only in this app's local
// AsyncStorage, never sent anywhere; `reset()` erases it.
export interface GuestProfile {
  name?: string;
  gender?: Gender;
  age?: number;
  education?: Education;
  experienceYears?: number;
  workPreference?: 'home' | 'other';
  preferredLocation?: string;
  state?: string;
  district?: string;
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
const GUEST_KEY = 'saksham.guestProfile.v1';
const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>({ language: null });
  const [guestProfile, setGuestProfileState] = useState<GuestProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(GUEST_KEY)])
      .then(([rawProfile, rawGuest]) => {
        // parse independently: a corrupt guest record must not also discard
        // the language the user already chose
        try {
          if (rawProfile) setProfile(JSON.parse(rawProfile));
        } catch {
          /* keep defaults */
        }
        try {
          if (rawGuest) setGuestProfileState(JSON.parse(rawGuest));
        } catch {
          /* onboarding will re-collect */
        }
      })
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
      setGuestProfile: (p) => {
        setGuestProfileState(p);
        // best-effort: a storage failure must not block onboarding
        AsyncStorage.setItem(GUEST_KEY, JSON.stringify(p)).catch(() => {});
      },
      reset: async () => {
        setGuestProfileState(null);
        await AsyncStorage.removeItem(GUEST_KEY).catch(() => {});
        await persist({ language: null });
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
