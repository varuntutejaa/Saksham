"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { use } from "react";
import { ArrowLeft } from "lucide-react";
import { getToken, handleAdminAuthError } from "@/lib/auth";
import { fetchAllSessions, groupSessionsByUser, type UserProfile } from "@/lib/admin-users";
import { Card, Skeleton } from "@/components/ui";
import { AdminShell } from "../../admin-shell";

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AdminShell>
      <UserDetail id={id} />
    </AdminShell>
  );
}

function UserDetail({ id }: { id: string }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetchAllSessions(token)
      .then((sessions) => {
        const { users } = groupSessionsByUser(sessions);
        setUser(users.find((u) => u.id === id) ?? null);
      })
      .catch((err) => {
        if (handleAdminAuthError(err)) router.replace("/admin/login");
        else setError("Could not load this user's profile — the backend may be waking up.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <p className="text-sm text-danger">{error}</p>;

  if (user === undefined) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Card className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </Card>
      </div>
    );
  }

  if (user === null)
    return (
      <div>
        <BackLink />
        <p className="mt-4 text-sm text-foreground-dim">No session activity found for this user.</p>
      </div>
    );

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold">{user.name?.trim() || "(no name)"}</h1>
          <p className="text-sm text-foreground-dim">
            {[user.phone, user.district].filter(Boolean).join(" · ") || "No phone or district on file"}
          </p>
        </div>
        {user.furthestStatus && (
          <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
            Furthest stage: {user.furthestStatus}
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Voice sessions" value={user.sessions.length} />
        <Kpi label="Recommendations received" value={user.recommendationCount} />
        <Kpi label="Distinct skills detected" value={user.skills.length} />
        <Kpi label="Languages used" value={user.languages.length} />
      </div>

      <Panel title="Skills detected across all sessions">
        {user.skills.length === 0 ? (
          <p className="text-sm text-foreground-faint">None yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {user.skills.map((s) => (
              <span key={s} className="rounded-full bg-surface-alt px-2.5 py-1 text-xs">
                {s}
              </span>
            ))}
          </div>
        )}
      </Panel>

      <Panel title={`Session history (${user.sessions.length})`}>
        <div className="space-y-3">
          {user.sessions
            .slice()
            .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
            .map((s) => (
              <div key={s.id} className="rounded-xl border border-border p-3.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-foreground-faint">
                  <span>{new Date(s.createdAt).toLocaleString()}</span>
                  <span className="rounded bg-surface-alt px-2 py-0.5">{s.language}</span>
                </div>
                {s.rawTranscript && <p className="mt-1.5 italic">&ldquo;{s.rawTranscript}&rdquo;</p>}
                {s.mappings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {s.mappings.map((m) => (
                      <div key={m.id} className="text-xs">
                        {m.nsqfQualification ? (
                          <>
                            <span className="font-medium">{m.nsqfQualification.qpCode}</span> · {m.nsqfQualification.title}{" "}
                            <span className="font-medium text-success">{Math.round(m.confidence * 100)}%</span>
                          </>
                        ) : (
                          <span className="text-warning">{m.normalizedSkill} (needs review)</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {s.recommendations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.recommendations.map((r) => (
                      <span key={r.id} className="rounded-full border border-border px-2 py-0.5 text-xs">
                        {r.trainingProgram.name} · {r.status}
                      </span>
                    ))}
                  </div>
                )}
                {(s.district || s.state || s.bandwidthKbps) && (
                  <p className="mt-1.5 text-xs text-foreground-faint">
                    {[s.district, s.state].filter(Boolean).join(", ")}
                    {s.bandwidthKbps ? ` · ${s.bandwidthKbps} kbps` : ""}
                  </p>
                )}
              </div>
            ))}
        </div>
      </Panel>

      <p className="text-xs text-foreground-faint">
        This view is derived entirely from this user&apos;s voice-session activity (the only per-user data the admin
        API exposes) — it does not include their private onboarding answers (gender/age/education) or profile photo,
        which only the user themselves can read via their own account.
      </p>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-foreground-dim hover:text-brand">
      <ArrowLeft className="h-4 w-4" />
      Back to users
    </Link>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-foreground-faint">{label}</p>
      <p className="mt-0.5 font-display text-3xl font-semibold">{value}</p>
    </Card>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </Card>
  );
}
