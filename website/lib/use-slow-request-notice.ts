"use client";

import { useEffect, useState } from "react";

/** Returns true once `active` has been true for longer than `delayMs` —
 *  use this to show a "the server is waking up" message during a real
 *  backend cold start (Render's free tier sleeps after inactivity and can
 *  take 30-50s to respond on the first request) instead of leaving the
 *  user staring at a bare spinner with no idea whether it's still working. */
export function useSlowRequestNotice(active: boolean, delayMs = 5000): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  return slow;
}
