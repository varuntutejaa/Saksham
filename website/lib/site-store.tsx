"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LanguageCode } from "./languages";

interface Profile {
  language: LanguageCode | null;
  state?: string;
  district?: string;
}

interface StoreValue extends Profile {
  ready: boolean;
  setLanguage: (l: LanguageCode) => void;
  setLocation: (state?: string, district?: string) => void;
  reset: () => void;
}

const KEY = "saksham.web.profile.v1";
const StoreContext = createContext<StoreValue | null>(null);

export function SiteStoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>({ language: null });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setProfile(JSON.parse(raw));
    } catch {
      /* ignore */
    } finally {
      setReady(true);
    }
  }, []);

  function persist(next: Profile) {
    setProfile(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  const value = useMemo<StoreValue>(
    () => ({
      ...profile,
      ready,
      setLanguage: (language) => persist({ ...profile, language }),
      setLocation: (state, district) => persist({ ...profile, state, district }),
      reset: () => persist({ language: null }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, ready],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useSiteStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useSiteStore must be used within SiteStoreProvider");
  return ctx;
}
