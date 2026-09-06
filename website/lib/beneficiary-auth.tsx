"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as api from "./site-api";
import { UnauthorizedError, type AuthUser, type Education, type Gender } from "./site-api";
import type { LanguageCode } from "./languages";

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
  resetPassword: (phone: string, otp: string, newPassword: string) => Promise<void>;
  updateProfile: (input: {
    gender?: Gender;
    age?: number;
    education?: Education;
    onboarded?: boolean;
    avatarUrl?: string | null;
  }) => Promise<void>;
  logout: () => void;
}

const KEY = "saksham.web.auth.v1";
const AuthContext = createContext<AuthValue | null>(null);

export function BeneficiaryAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {
      /* ignore */
    } finally {
      setReady(true);
    }
  }, []);

  function persist(next: Session | null) {
    setSession(next);
    try {
      if (next) localStorage.setItem(KEY, JSON.stringify(next));
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      token: session?.token ?? null,
      user: session?.user ?? null,
      login: async (phone, password) => {
        const res = await api.login(phone, password);
        persist(res);
      },
      register: async (input) => {
        const res = await api.register(input);
        persist(res);
      },
      resetPassword: async (phone, otp, newPassword) => {
        const res = await api.resetPassword(phone, otp, newPassword);
        persist(res);
      },
      updateProfile: async (input) => {
        if (!session) throw new Error("Not signed in");
        try {
          const res = await api.updateProfile(session.token, input);
          persist({ token: session.token, user: res.user });
        } catch (e) {
          if (e instanceof UnauthorizedError) persist(null);
          throw e;
        }
      },
      logout: () => persist(null),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useBeneficiaryAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useBeneficiaryAuth must be used within BeneficiaryAuthProvider");
  return ctx;
}
