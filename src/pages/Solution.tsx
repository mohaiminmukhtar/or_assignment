import { useState } from "react";
import { ArrowLeft, ArrowRight, FilePlus2, Pencil, Printer } from "lucide-react";
import type { LPPSolution, SolutionStatus } from "../types/lpp";
import { LPGraph } from "../components/LPGraph";
import { StepNavigation } from "../components/StepNavigation";
import { STEPS, StepDetails, StepExplanation } from "../components/steps";
import { PrintView } from "../components/PrintView";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Badge, Button, Card, CardHeader, cn } from "../components/ui";

const STATUS_BADGE: Record<SolutionStatus, { text: string; tone: "blue" | "success" | "danger" | "warning" }> = {
  optimal: { text: "Optimal solution found", tone: "success" },
  multiple: { text: "Multiple optimal solutions", tone: "blue" },
  infeasible: { text: "No feasible solution", tone: "danger" },
  unbounded: { text: "Unbounded", tone: "warning" },
  unattained: { text: "Optimum not attained", tone: "warning" },
};

export default function Solution({
  solution,
  onEdit,
  onNewProblem,
}: {
  solution: LPPSolution;
  onEdit: () => void;
  onNewProblem: () => void;
}) {
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [mobileTab, setMobileTab] = useState<"solution" | "graph">("solution");

  const goTo = (index: number) => {
    const next = Math.max(0, Math.min(STEPS.length - 1, index));
    setStep(next);
    setFurthest((f) => Math.max(f, next));
  };

  const details = StepDetails({ step, solution });
  const badge = STATUS_BADGE[solution.status];
  const isLast = step === STEPS.length - 1;

  const pager = (
    <div className="flex items-center justify-between gap-3">
      <Button onClick={() => goTo(step - 1)} disabled={step === 0}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Previous
      </Button>
      <span className="text-sm text-slate-500">
        Step {step + 1} of {STEPS.length}
      </span>
      <Button variant="primary" onClick={() => goTo(step + 1)} disabled={isLast}>
        Next
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );

  return (
    <>
      <main className="screen-only mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">Solution</h1>
            <Badge tone={badge.tone}>{badge.text}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit Problem
            </Button>
            <Button size="sm" onClick={onNewProblem}>
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
              New Problem
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print Solution
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <StepNavigation steps={STEPS} current={step} furthest={furthest} onSelect={goTo} />
        </div>

        <div role="tablist" aria-label="Show" className="mt-4 grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1 lg:hidden">
          {(["solution", "graph"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={mobileTab === tab}
              onClick={() => setMobileTab(tab)}
              className={cn(
                "h-9 rounded-md text-sm font-medium capitalize",
                mobileTab === tab ? "bg-blue-700 text-white" : "text-slate-700",
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,43fr)_minmax(0,57fr)]">
          <Card className={cn(mobileTab === "graph" && "hidden lg:block")}>
            <CardHeader eyebrow={`Step ${step + 1}`} title={STEPS[step]!.title} />
            <div className="space-y-5 px-5 py-5">
              <StepExplanation step={step} solution={solution} />
            </div>
            <div className="border-t border-slate-100 px-5 py-3">{pager}</div>
          </Card>

          <Card className={cn("lg:sticky lg:top-4", mobileTab === "solution" && "hidden lg:block")}>
            <CardHeader title="Graph" subtitle="Drawn from the calculated equations; it builds up step by step." />
            <ErrorBoundary
              fallback={<p className="p-5 text-sm text-slate-600">The graph could not be drawn. The tables still show every result.</p>}
            >
              <LPGraph solution={solution} step={step} />
            </ErrorBoundary>
          </Card>
        </div>

        {details && (
          <Card className="mt-5">
            <CardHeader title="Tables and detailed calculations" subtitle={STEPS[step]!.title} />
            <div className="px-5 py-5">{details}</div>
          </Card>
        )}

        <div className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-3 lg:hidden">{pager}</div>
      </main>
      <PrintView solution={solution} />
    </>
  );
}
