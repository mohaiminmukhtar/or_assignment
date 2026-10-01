import type { ReactNode } from "react";
import { cn } from "./ui";

/** The "What we do / Why" pair that opens every step. */
export function Explain({ what, why }: { what: ReactNode; why: ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What we do</p>
        <div className="mt-1 text-sm leading-relaxed text-slate-800">{what}</div>
      </div>
      <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Why</p>
        <div className="mt-1 text-sm leading-relaxed text-slate-800">{why}</div>
      </div>
    </div>
  );
}

/** A titled sub-section inside a step ("Calculation", "Answer", ...). */
export function SubSection({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("avoid-break", className)}>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function Callout({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "danger" | "warning";
  children: ReactNode;
}) {
  const tones = {
    neutral: "border-slate-200 bg-slate-50 text-slate-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-950",
    danger: "border-red-200 bg-red-50 text-red-950",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
  } as const;
  return <div className={cn("rounded-lg border px-4 py-3 text-sm leading-relaxed", tones[tone])}>{children}</div>;
}

/** Small "C1" style chip used to name constraints and lines. */
export function LineChip({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span className="inline-flex min-w-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-700">
      {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />}
      {children}
    </span>
  );
}
