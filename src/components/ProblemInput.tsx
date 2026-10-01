import { useMemo } from "react";
import { AlertCircle, BookOpen, RotateCcw } from "lucide-react";
import type { ProblemDraft, ValidationError, Variable, VariableRestriction } from "../types/lpp";
import { parseProblem } from "../engine/parser";
import { ObjectiveInput } from "./ObjectiveInput";
import { ConstraintList } from "./ConstraintList";
import { SolveButton } from "./SolveButton";
import { ProblemStatement } from "./ProblemSummary";
import { Button, Card, CardHeader, cn } from "./ui";

const RESTRICTION_OPTIONS: { value: VariableRestriction; label: (v: string) => string }[] = [
  { value: "nonNegative", label: (v) => `${v} ≥ 0` },
  { value: "positive", label: (v) => `${v} > 0` },
  { value: "free", label: () => "Unrestricted" },
];

function RestrictionControl({
  variable,
  value,
  onChange,
}: {
  variable: Variable;
  value: VariableRestriction;
  onChange: (value: VariableRestriction) => void;
}) {
  const name = variable === "x1" ? "x₁" : "x₂";
  return (
    <div role="radiogroup" aria-label={`Restriction on ${name}`} className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 shadow-xs">
      {RESTRICTION_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-8 rounded px-3 text-sm transition-colors",
              selected ? "bg-blue-700 font-medium text-white" : "text-slate-700 hover:bg-slate-100",
            )}
          >
            {option.label(name)}
          </button>
        );
      })}
    </div>
  );
}

export function ProblemInput({
  draft,
  errors,
  onChange,
  onLoadExample,
  onClear,
  onSolve,
}: {
  draft: ProblemDraft;
  errors: ValidationError[];
  onChange: (draft: ProblemDraft) => void;
  onLoadExample: () => void;
  onClear: () => void;
  onSolve: () => void;
}) {
  const invalidFields = useMemo(() => new Set(errors.map((e) => e.field)), [errors]);
  const preview = useMemo(() => parseProblem(draft), [draft]);

  const setRestriction = (variable: Variable, value: VariableRestriction) =>
    onChange({ ...draft, restrictions: { ...draft.restrictions, [variable]: value } });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <Card>
        <CardHeader
          eyebrow="Problem setup"
          title="Enter your linear programming problem"
          subtitle="Two decision variables, any number of constraints."
          actions={
            <>
              <Button size="sm" onClick={onLoadExample}>
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Load Example
              </Button>
              <Button size="sm" variant="ghost" onClick={onClear}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Clear
              </Button>
            </>
          }
        />
        <form
          noValidate
          className="space-y-7 px-5 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSolve();
          }}
        >
          {errors.length > 0 && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <p className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                Please fix the following before solving:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6">
                {errors.map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </div>
          )}

          <ObjectiveInput draft={draft} onChange={onChange} invalidFields={invalidFields} />

          <ConstraintList
            constraints={draft.constraints}
            onChange={(constraints) => onChange({ ...draft, constraints })}
            invalidFields={invalidFields}
          />

          <fieldset>
            <legend className="text-sm font-semibold text-slate-900">Variable restrictions</legend>
            <p className="mt-1 text-xs text-slate-500">
              Standard problems use x₁ ≥ 0 and x₂ ≥ 0. Choose &gt; 0 to exclude points on the axes.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <RestrictionControl variable="x1" value={draft.restrictions.x1} onChange={(v) => setRestriction("x1", v)} />
              <RestrictionControl variable="x2" value={draft.restrictions.x2} onChange={(v) => setRestriction("x2", v)} />
            </div>
          </fieldset>

          <div className="border-t border-slate-100 pt-5">
            <SolveButton />
          </div>
        </form>
      </Card>

      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader title="Preview" subtitle="How your problem will be read." />
        <div className="px-5 py-4">
          {preview.ok ? (
            <ProblemStatement problem={preview.problem} />
          ) : (
            <p className="text-sm text-slate-500">
              Complete the objective and constraints to see the formatted problem here.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
