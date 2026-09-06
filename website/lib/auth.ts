"use client";

import { UnauthorizedError } from "./api";

const KEY = "saksham.admin.token";

export function saveToken(token: string) {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    /* ignore */
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Call from a page's fetch .catch() — if the token was rejected as
 *  invalid/expired, this clears it and returns true so the caller can
 *  redirect to login instead of showing a stale "could not load" error. */
export function handleAdminAuthError(err: unknown): boolean {
  if (err instanceof UnauthorizedError) {
    clearToken();
    return true;
  }
  return false;
}
