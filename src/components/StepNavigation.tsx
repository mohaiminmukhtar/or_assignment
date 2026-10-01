import { Check } from "lucide-react";
import { cn } from "./ui";

export interface StepInfo {
  key: string;
  short: string;
  title: string;
}

/**
 * Step bar: Problem → Boundary → Intercepts → Graph → Intersections → Feasibility → Objective → Answer.
 * Steps up to the furthest one reached can be revisited by clicking.
 */
export function StepNavigation({
  steps,
  current,
  furthest,
  onSelect,
}: {
  steps: StepInfo[];
  current: number;
  furthest: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav aria-label="Solution steps" className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1">
        {steps.map((step, index) => {
          const reachable = index <= furthest;
          const active = index === current;
          const done = index < furthest && !active;
          return (
            <li key={step.key} className="flex items-center gap-1">
              {index > 0 && <span className={cn("h-px w-3 sm:w-5", reachable ? "bg-blue-300" : "bg-slate-200")} aria-hidden="true" />}
              <button
                type="button"
                onClick={() => onSelect(index)}
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition-colors",
                  active && "border-blue-700 bg-blue-700 font-medium text-white",
                  !active && reachable && "border-blue-200 bg-white text-blue-900 hover:bg-blue-50",
                  !reachable && "cursor-not-allowed border-slate-200 bg-white text-slate-400",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold",
                    active ? "bg-white/20" : done ? "bg-blue-100 text-blue-800" : "bg-slate-100",
                  )}
                >
                  {done ? <Check className="h-3 w-3" aria-hidden="true" /> : index + 1}
                </span>
                {step.short}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
