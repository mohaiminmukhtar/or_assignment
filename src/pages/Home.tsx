import { ArrowRight } from "lucide-react";
import type { ProblemDraft, ValidationError } from "../types/lpp";
import { ProblemInput } from "../components/ProblemInput";
import { MathExpression } from "../components/MathExpression";
import { Button } from "../components/ui";

const METHOD_STEPS = [
  "Write the problem",
  "Find the intercepts",
  "Draw the graph",
  "Find every intersection",
  "Test feasibility",
  "Evaluate Z at the corners",
  "Read off the optimum",
];

export default function Home({
  started,
  onStart,
  ...inputProps
}: {
  started: boolean;
  onStart: () => void;
  draft: ProblemDraft;
  errors: ValidationError[];
  onChange: (draft: ProblemDraft) => void;
  onLoadExample: () => void;
  onClear: () => void;
  onSolve: () => void;
}) {
  if (started) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <ProblemInput {...inputProps} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
      <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <p className="text-sm font-semibold text-blue-700">Operations Research</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Linear Programming Solver
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Solve two-variable linear programming problems using the graphical method, with every step of the
            working shown.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="primary" size="lg" onClick={onStart}>
              Start Solving
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              size="lg"
              onClick={() => {
                inputProps.onLoadExample();
                onStart();
              }}
            >
              Try the example
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">The method, step by step</p>
          <ol className="mt-4 space-y-2.5">
            {METHOD_STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-3 text-sm text-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-800">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            For example:
            <MathExpression display latex="\text{Minimize } Z = 2x_1 + 3x_2" className="mt-1" />
          </div>
        </div>
      </div>
    </main>
  );
}
