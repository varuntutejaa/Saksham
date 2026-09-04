import type { Education, Gender } from '@/lib/api';

/**
 * In-progress answers for the post-signup onboarding flow (gender/age/
 * education), held across its screens. Not persisted — the flow is short and
 * submitted to the backend (PATCH /api/auth/profile) on the final step.
 */
interface Answers {
  gender?: Gender;
  age?: number;
  education?: Education;
}

let answers: Answers = {};

export function setAnswer<K extends keyof Answers>(key: K, value: Answers[K]) {
  answers = { ...answers, [key]: value };
}

export function getAnswers(): Answers {
  return answers;
}

export function resetAnswers() {
  answers = {};
}
