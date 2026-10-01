import type { LPPSolution } from "../types/lpp";
import { LPGraph } from "./LPGraph";
import { STEPS, StepDetails, StepExplanation } from "./steps";

/** Index of the graph step; the full graph is printed there. */
const GRAPH_STEP = 3;
/** Graph state used for printing: every layer up to the optimum. */
const FINAL_STEP = STEPS.length - 1;

/**
 * The complete solution on one document for printing. It is rendered off-screen
 * at all times so the graph is already laid out when the print dialog opens.
 */
export function PrintView({ solution }: { solution: LPPSolution }) {
  return (
    <div className="print-root bg-white text-slate-900" aria-hidden="true">
      <h1 className="text-2xl font-semibold">Linear Programming: Graphical Method</h1>
      <p className="mt-1 text-sm text-slate-600">Complete step-by-step solution</p>
      {STEPS.map((step, index) => (
        <section key={step.key} className={index > 0 ? "mt-8" : "mt-6"}>
          <h2 className="border-b border-slate-300 pb-1 text-lg font-semibold">
            Step {index + 1}: {step.title}
          </h2>
          <div className="mt-3 space-y-4">
            <StepExplanation step={index} solution={solution} />
            {index === GRAPH_STEP && (
              <div className="avoid-break rounded-lg border border-slate-200">
                <LPGraph solution={solution} step={FINAL_STEP} printMode />
              </div>
            )}
            <StepDetails step={index} solution={solution} print />
          </div>
        </section>
      ))}
    </div>
  );
}
