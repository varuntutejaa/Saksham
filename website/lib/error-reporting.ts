"use client";

/** Best-effort client-error reporting — fire-and-forget, never throws, never
 *  blocks the caller. See app/api/log-error/route.ts for where this lands. */
export function reportError(message: string, extra?: { stack?: string }) {
  try {
    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        stack: extra?.stack,
        url: typeof window !== "undefined" ? window.location.href : undefined,
      }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

/** Call once, high in the tree (root layout's client wrapper), to catch
 *  otherwise-silent uncaught errors and unhandled promise rejections. */
export function installGlobalErrorReporting() {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (e) => {
    reportError(e.message, { stack: e.error?.stack });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    reportError(reason instanceof Error ? reason.message : String(reason), {
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}
