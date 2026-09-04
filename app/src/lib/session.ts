import type { ConverseResponse } from '@/lib/api';

/**
 * Holds the most recent assistant response so the results screen can render it
 * without serialising a large object through navigation params.
 */
let lastResult: ConverseResponse | null = null;

export function setLastResult(r: ConverseResponse) {
  lastResult = r;
}

export function getLastResult(): ConverseResponse | null {
  return lastResult;
}
