"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Users2, GraduationCap, WifiOff } from "lucide-react";
import { getStats, type AdminStats } from "@/lib/api";
import { getToken, handleAdminAuthError } from "@/lib/auth";
import { Card, Skeleton } from "@/components/ui";
import { AdminShell } from "./admin-shell";

export default function AdminOverview() {
  return (
    <AdminShell title="Overview" subtitle="Live numbers from every beneficiary voice session.">
      <Overview />
    </AdminShell>
  );
}

function Overview() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getStats(token)
      .then(setStats)
      .catch((err) => {
        if (handleAdminAuthError(err)) router.replace("/admin/login");
        else setError("Could not load stats — the backend may be waking up. Reload in a moment.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;

  if (!stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-14" />
          </Card>
        ))}
      </div>
    );
  }

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
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Mic} label="Voice sessions" value={stats.totals.sessions} tone="brand" />
        <Kpi icon={Users2} label="Beneficiaries" value={stats.totals.beneficiaries} tone="accent" />
        <Kpi icon={GraduationCap} label="Recommendations" value={stats.totals.recommendations} tone="brand" />
        <Kpi
          icon={WifiOff}
          label="Low-bandwidth sessions"
          value={stats.totals.lowBandwidthSessions}
          hint="≤ 256 kbps"
          tone="accent"
        />
      </div>

      <Panel title="Recommendation funnel" hint={`${Math.round(stats.funnel.conversionRate * 100)}% reach enrollment`}>
        <div className="space-y-3">
          {funnelSteps.map((s, i) => {
            const pct = (s.value / maxFunnel) * 100;
            return (
              <div key={s.label} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-foreground-dim">{s.label}</span>
                <div className="h-7 flex-1 overflow-hidden rounded-lg bg-surface-alt">
                  <div
                    className="flex h-7 items-center justify-end rounded-lg px-2 text-xs font-semibold text-on-brand transition-[width] duration-500"
                    style={{
                      width: `${Math.max(pct, 6)}%`,
                      background: `color-mix(in srgb, var(--brand) ${100 - i * 15}%, var(--accent))`,
                    }}
                  >
                    {s.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Sessions by language">
          <BarList rows={stats.byLanguage.map((l) => ({ label: l.language, value: l._count }))} max={maxLang} />
        </Panel>
        <Panel title="Top skills detected">
          <BarList rows={stats.topSkills.map((s) => ({ label: s.normalizedSkill, value: s._count }))} max={maxSkill} />
        </Panel>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint?: string;
  tone: "brand" | "accent";
}) {
  return (
    <Card className={tone === "brand" ? "rounded-tr-[26px]" : "rounded-bl-[26px]"}>
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone === "brand" ? "bg-brand/10 text-brand" : "bg-accent/10 text-accent"}`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-foreground-faint">{label}</p>
      <p className="mt-0.5 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-foreground-faint">{hint}</p>}
    </Card>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-semibold">{title}</h2>
        {hint && <span className="text-xs font-medium text-accent">{hint}</span>}
      </div>
      {children}
    </Card>
  );
}

function BarList({ rows, max }: { rows: { label: string; value: number }[]; max: number }) {
  if (rows.length === 0) return <p className="text-sm text-foreground-faint">No data yet.</p>;
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-alt text-[10px] font-semibold text-foreground-dim">
            {i + 1}
          </span>
          <span className="w-24 shrink-0 truncate text-foreground-dim">{r.label}</span>
          <div className="h-5 flex-1 rounded-full bg-surface-alt">
            <div
              className="h-5 rounded-full bg-gradient-to-r from-brand to-accent transition-[width] duration-500"
              style={{ width: `${Math.max((r.value / max) * 100, 6)}%` }}
            />
          </div>
          <span className="w-8 text-right font-semibold">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
