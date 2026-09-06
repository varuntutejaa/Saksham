"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";
import { reportError } from "@/lib/error-reporting";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    reportError(error.message, { stack: error.stack });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <h1 className="mt-5 font-display text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-foreground-dim">
        The backend may be waking up from a cold start, or something briefly broke. Give it another try.
      </p>
      <div className="mt-6 w-full max-w-[220px]">
        <Button label="Try again" onPress={reset} />
      </div>
    </div>
  );
}
