"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessions, type SessionRow } from "@/lib/api";
import { getToken, handleAdminAuthError } from "@/lib/auth";
import { Button, Card, Skeleton } from "@/components/ui";
import { AdminShell } from "../admin-shell";

const PAGE_SIZE = 100;

export default function SessionsPage() {
  return (
    <AdminShell title="Sessions" subtitle="Every voice session, most recent first.">
      <Sessions />
    </AdminShell>
  );
}

function Sessions() {
  const router = useRouter();
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");

  function load(skip: number, append: boolean) {
    const token = getToken();
    if (!token) return;
    getSessions(token, { take: PAGE_SIZE, skip })
      .then((r) => {
        setRows((prev) => (append && prev ? [...prev, ...r.items] : r.items));
        setTotal(r.total);
      })
      .catch((err) => {
        if (handleAdminAuthError(err)) router.replace("/admin/login");
        else setError("Could not load sessions — the backend may be waking up. Reload in a moment.");
      })
      .finally(() => setLoadingMore(false));
  }

  useEffect(() => load(0, false), []);

  if (error) return <p className="text-sm text-danger">{error}</p>;

  if (!rows) {
    return (
      <Card className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </Card>
    );
  }

  const filtered = rows.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (s.rawTranscript ?? "").toLowerCase().includes(q) ||
      (s.user?.name ?? "").toLowerCase().includes(q) ||
      (s.district ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground-dim">
          {rows.length} of {total} sessions loaded
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search transcript, user, district…"
          className="w-64 rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-[var(--shadow-soft)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-alt text-xs uppercase text-foreground-dim">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Lang</th>
              <th className="px-3 py-2">Transcript</th>
              <th className="px-3 py-2">NSQF mapping</th>
              <th className="px-3 py-2">Top recommendation</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Bandwidth</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-border align-top last:border-0">
                <td className="whitespace-nowrap px-3 py-2 text-foreground-dim">{new Date(s.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{s.language}</td>
                <td className="max-w-xs px-3 py-2">{s.rawTranscript}</td>
                <td className="px-3 py-2">
                  {s.mappings.length === 0 ? (
                    <span className="text-foreground-faint">—</span>
                  ) : (
                    s.mappings.map((m) => (
                      <div key={m.id}>
                        {m.nsqfQualification ? (
                          <>
                            {m.nsqfQualification.qpCode} · {m.nsqfQualification.title}{" "}
                            <span className="font-medium text-success">{Math.round(m.confidence * 100)}%</span>
                          </>
                        ) : (
                          <span className="text-warning">{m.normalizedSkill} (review)</span>
                        )}
                      </div>
                    ))
                  )}
                </td>
                <td className="px-3 py-2">
                  {s.recommendations[0]?.trainingProgram.name ?? <span className="text-foreground-faint">—</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-foreground-dim">
                  {[s.district, s.state].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-3 py-2 text-foreground-dim">{s.bandwidthKbps ? `${s.bandwidthKbps} kbps` : "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-foreground-faint">
                  No sessions match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length < total && (
        <div className="mt-4 flex justify-center">
          <Button
            label={`Load ${Math.min(PAGE_SIZE, total - rows.length)} more`}
            variant="secondary"
            size="md"
            fullWidth={false}
            loading={loadingMore}
            onPress={() => {
              setLoadingMore(true);
              load(rows.length, true);
            }}
          />
        </div>
      )}
    </div>
  );
}
