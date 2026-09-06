"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "@/lib/api";
import { saveToken } from "@/lib/auth";
import { useSlowRequestNotice } from "@/lib/use-slow-request-notice";
import { Button, Card } from "@/components/ui";

export default function AdminLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const slow = useSlowRequestNotice(loading);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token } = await login(phone, password);
      saveToken(token);
      router.replace("/admin");
    } catch {
      setError("Invalid credentials, or the backend is waking up — try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="mb-6 flex items-center gap-2.5">
        <Image src="/icon.png" alt="Saksham" width={36} height={36} className="rounded-xl" />
        <div>
          <p className="font-display text-sm font-semibold">सक्षम · Admin</p>
          <p className="text-xs text-foreground-faint">PM-AJAY Skilling Assistant</p>
        </div>
      </div>
      <Card>
        <h1 className="font-display text-xl font-semibold">Sign in</h1>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            autoFocus
            className="w-full rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          {slow && <p className="text-xs text-foreground-faint">The server is waking up — this can take up to 30 seconds…</p>}
          <Button type="submit" label={loading ? "Signing in…" : "Sign in"} loading={loading} size="md" />
        </form>
      </Card>
    </main>
  );
}
