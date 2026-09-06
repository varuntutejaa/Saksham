"use client";

import type { Education, Gender } from "./site-api";

interface Answers {
  gender?: Gender;
  age?: number;
  education?: Education;
}

const KEY = "saksham.web.onboardingAnswers";

export function setAnswer<K extends keyof Answers>(key: K, value: Answers[K]) {
  const next = { ...getAnswers(), [key]: value };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function getAnswers(): Answers {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function resetAnswers() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
