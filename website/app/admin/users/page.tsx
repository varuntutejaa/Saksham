"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken, handleAdminAuthError } from "@/lib/auth";
import { fetchAllSessions, groupSessionsByUser, type UserProfile } from "@/lib/admin-users";
import { Card, Skeleton } from "@/components/ui";
import { AdminShell } from "../admin-shell";

export default function UsersPage() {
  return (
    <AdminShell title="Users" subtitle="Every beneficiary who has run at least one voice session.">
      <Users />
    </AdminShell>
  );
}

function Users() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [guestCount, setGuestCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetchAllSessions(token)
      .then((sessions) => {
        const { users, guestSessionCount } = groupSessionsByUser(sessions);
        setUsers(users);
        setGuestCount(guestSessionCount);
      })
      .catch((err) => {
        if (handleAdminAuthError(err)) router.replace("/admin/login");
        else setError("Could not load users — the backend may be waking up. Reload in a moment.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;

  if (!users) {
    return (
      <Card className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </Card>
    );
  }

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (u.name ?? "").toLowerCase().includes(q) || (u.phone ?? "").includes(q) || (u.district ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground-dim">
          {users.length} beneficiaries
          {guestCount > 0 ? ` · ${guestCount} guest session${guestCount === 1 ? "" : "s"} not linked to an account` : ""}
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone, district…"
          className="w-64 rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-[var(--shadow-soft)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-alt text-xs uppercase text-foreground-dim">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">District</th>
              <th className="px-3 py-2">Sessions</th>
              <th className="px-3 py-2">Skills detected</th>
              <th className="px-3 py-2">Languages</th>
              <th className="px-3 py-2">Furthest funnel stage</th>
              <th className="px-3 py-2">Last active</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-alt/60">
                <td className="px-3 py-2">
                  <Link href={`/admin/users/${u.id}`} className="font-medium text-brand hover:underline">
                    {u.name?.trim() || "(no name)"}
                  </Link>
                </td>
                <td className="px-3 py-2 text-foreground-dim">{u.phone ?? "—"}</td>
                <td className="px-3 py-2 text-foreground-dim">{u.district ?? "—"}</td>
                <td className="px-3 py-2">{u.sessions.length}</td>
                <td className="px-3 py-2 text-foreground-dim">{u.skills.slice(0, 3).join(", ") || "—"}</td>
                <td className="px-3 py-2 text-foreground-dim">{u.languages.join(", ")}</td>
                <td className="px-3 py-2">
                  {u.furthestStatus ? (
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">{u.furthestStatus}</span>
                  ) : (
                    <span className="text-foreground-faint">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-foreground-dim">{new Date(u.lastSeen).toLocaleString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-foreground-faint">
                  No users match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
