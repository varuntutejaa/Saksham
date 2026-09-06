"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { AuthShell } from "./AuthShell";

/** Used by the auth-family pages (welcome, auth, forgot-password,
 *  onboarding). Renders a branded split-screen panel on wide viewports via
 *  AuthShell instead of a phone-width column floating in empty space. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <AuthShell>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">{children}</div>
    </AuthShell>
  );
}

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/icon.png"
      alt="Saksham"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="rounded-2xl"
    />
  );
}

export function Button({
  label,
  onPress,
  href,
  variant = "primary",
  size = "lg",
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  className = "",
  type = "button",
}: {
  label: string;
  onPress?: () => void;
  href?: string;
  variant?: "primary" | "accent" | "secondary" | "ghost" | "danger" | "success";
  size?: "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const variants: Record<string, string> = {
    primary: "bg-brand text-on-brand hover:bg-brand-strong active:scale-[0.98]",
    accent:
      "bg-accent text-on-accent hover:bg-accent-strong active:scale-[0.98]",
    secondary:
      "bg-surface-alt text-foreground hover:brightness-95 dark:hover:brightness-110 active:scale-[0.98]",
    ghost:
      "bg-transparent text-foreground-dim hover:bg-surface-alt active:scale-[0.98]",
    danger: "bg-danger text-white hover:brightness-95 active:scale-[0.98]",
    success: "bg-success text-white hover:brightness-95 active:scale-[0.98]",
  };
  const cls = `inline-flex items-center justify-center gap-2 rounded-2xl font-semibold shadow-[var(--shadow-soft)] transition-all duration-150 disabled:opacity-50 disabled:shadow-none ${
    size === "lg" ? "h-[54px] px-6 text-base" : "h-11 px-4 text-sm"
  } ${fullWidth ? "w-full" : ""} ${variants[variant]} ${className}`;

  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type={type}
      onClick={onPress}
      disabled={disabled || loading}
      className={cls}
    >
      {content}
    </button>
  );
}

export function Card({
  children,
  className = "",
  notch = false,
}: {
  children: ReactNode;
  className?: string;
  /** Cuts the top-right corner with a larger radius — a small signature
   * detail used sparingly on featured cards instead of a uniform template look. */
  notch?: boolean;
}) {
  return (
    <div
      className={`border border-border bg-surface p-4 shadow-[var(--shadow-soft)] ${
        notch ? "rounded-2xl rounded-tr-[28px]" : "rounded-2xl"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Chip({
  label,
  tone = "default",
  icon,
}: {
  label: string;
  tone?: "default" | "primary" | "accent" | "success" | "warning";
  icon?: ReactNode;
}) {
  const tones: Record<string, string> = {
    default: "border-border text-foreground-dim",
    primary: "border-brand/25 bg-brand/10 text-brand",
    accent: "border-accent/25 bg-accent/10 text-accent",
    success: "border-success/25 bg-success-soft text-success",
    warning: "border-warning/25 bg-warning-soft text-warning",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}
    >
      {icon}
      {label}
    </span>
  );
}

export function Meter({ value, size = 48 }: { value: number; size?: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={5}
          fill="none"
          className="text-surface-alt"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={5}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          strokeLinecap="round"
          className="text-brand transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold">
        {pct}%
      </span>
    </div>
  );
}

export function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < step ? "bg-brand" : "bg-surface-alt"}`}
        />
      ))}
    </div>
  );
}

export function OptionRow({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      onClick={onPress}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-all duration-150 active:scale-[0.99] ${
        selected
          ? "border-brand bg-brand/5 shadow-[var(--shadow-soft)]"
          : "border-border bg-surface hover:border-brand/40"
      }`}
    >
      {icon && (
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${selected ? "bg-brand text-on-brand" : "bg-surface-alt text-foreground-dim"}`}
        >
          {icon}
        </span>
      )}
      <span className="flex-1 font-medium">{label}</span>
    </button>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-surface-alt ${className}`} />
  );
}
