import type { ConverseResponse } from '@/lib/api';

/**
 * Holds the most recent assistant response, and the intent the user picked on
 * the confirm screen, so downstream screens can render without serialising a
 * large object through navigation params.
 */
let lastResult: ConverseResponse | null = null;

export function setLastResult(r: ConverseResponse) {
  lastResult = r;
}

export function getLastResult(): ConverseResponse | null {
  return lastResult;
}

export type Intent = 'jobs' | 'training' | 'certificate';

let intent: Intent = 'training';

export function setIntent(i: Intent) {
  intent = i;
}

export function getIntent(): Intent {
  return intent;
}
