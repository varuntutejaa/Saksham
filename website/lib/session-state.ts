"use client";

import type { ConverseResponse } from "./site-api";

const RESULT_KEY = "saksham.web.lastResult";
const INTENT_KEY = "saksham.web.intent";

export function setLastResult(r: ConverseResponse) {
  try {
    sessionStorage.setItem(RESULT_KEY, JSON.stringify(r));
  } catch {
    /* ignore */
  }
}

export function getLastResult(): ConverseResponse | null {
  try {
    const raw = sessionStorage.getItem(RESULT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export type Intent = "jobs" | "training" | "certificate";

export function setIntent(i: Intent) {
  try {
    sessionStorage.setItem(INTENT_KEY, i);
  } catch {
    /* ignore */
  }
}

export function getIntent(): Intent {
  try {
    return (sessionStorage.getItem(INTENT_KEY) as Intent) || "training";
  } catch {
    return "training";
  }
}
