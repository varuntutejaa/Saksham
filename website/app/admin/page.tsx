"use client";

import { useEffect, useState } from "react";
import { getStats, type AdminStats } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { AdminShell } from "./admin-shell";

export default function AdminOverview() {
  return (
    <AdminShell>
      <Overview />
    </AdminShell>
  );
}

function Overview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getStats(token)
      .then(setStats)
      .catch(() => setError("Could not load stats. Is the backend running on :4000?"));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!stats) return <p className="text-sm text-neutral-500">Loading…</p>;

  const funnelSteps = [
    { label: "Suggested", value: stats.funnel.suggested },
    { label: "Viewed", value: stats.funnel.viewed },
    { label: "Interested", value: stats.funnel.interested },
    { label: "Applied", value: stats.funnel.applied },
    { label: "Enrolled", value: stats.funnel.enrolled },
  ];
  const maxFunnel = Math.max(1, ...funnelSteps.map((s) => s.value));
  const maxLang = Math.max(1, ...stats.byLanguage.map((l) => l._count));
  const maxSkill = Math.max(1, ...stats.topSkills.map((s) => s._count));

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Voice sessions" value={stats.totals.sessions} />
        <Kpi label="Beneficiaries" value={stats.totals.beneficiaries} />
        <Kpi label="Recommendations" value={stats.totals.recommendations} />
        <Kpi
          label="Low-bandwidth sessions"
          value={stats.totals.lowBandwidthSessions}
          hint="≤ 256 kbps"
        />
      </div>

      <Panel title="Recommendation funnel" hint={`Conversion ${Math.round(stats.funnel.conversionRate * 100)}%`}>
        <div className="space-y-2">
          {funnelSteps.map((s) => (
            <div key={s.label} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 text-neutral-500">{s.label}</span>
              <div className="h-6 flex-1 rounded bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-6 rounded bg-brand"
                  style={{ width: `${(s.value / maxFunnel) * 100}%` }}
                />
              </div>
              <span className="w-10 text-right font-semibold">{s.value}</span>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Sessions by language">
          <BarList
            rows={stats.byLanguage.map((l) => ({ label: l.language, value: l._count }))}
            max={maxLang}
          />
        </Panel>
        <Panel title="Top skills detected">
          <BarList
            rows={stats.topSkills.map((s) => ({ label: s.normalizedSkill, value: s._count }))}
            max={maxSkill}
          />
        </Panel>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {hint && <p className="text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-semibold">{title}</h2>
        {hint && <span className="text-xs text-neutral-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function BarList({ rows, max }: { rows: { label: string; value: number }[]; max: number }) {
  if (rows.length === 0)
    return <p className="text-sm text-neutral-400">No data yet.</p>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-neutral-500">{r.label}</span>
          <div className="h-5 flex-1 rounded bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-5 rounded bg-brand/80"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
          <span className="w-8 text-right font-semibold">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
