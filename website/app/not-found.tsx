import { Compass } from "lucide-react";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <Compass className="h-7 w-7" />
      </span>
      <h1 className="mt-5 font-display text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-foreground-dim">This page doesn&apos;t exist, or the link is out of date.</p>
      <div className="mt-6 w-full max-w-[220px]">
        <Button label="Back to home" href="/" />
      </div>
    </div>
  );
}
