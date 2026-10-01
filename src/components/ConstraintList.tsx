import { Plus } from "lucide-react";
import type { ConstraintDraft } from "../types/lpp";
import { emptyConstraint } from "../data/examples";
import { ConstraintRow } from "./ConstraintRow";
import { Button } from "./ui";

/** Upper limit that keeps the pairwise-intersection tables readable. */
export const MAX_CONSTRAINTS = 15;

export function ConstraintList({
  constraints,
  onChange,
  invalidFields,
}: {
  constraints: ConstraintDraft[];
  onChange: (constraints: ConstraintDraft[]) => void;
  invalidFields: Set<string>;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-900">Subject to the constraints</legend>
      <p className="mt-1 text-xs text-slate-500">
        Leave a coefficient blank for 0. For example, enter <span className="font-medium">x₁ ≤ 3</span> as{" "}
        <span className="font-medium">[1] x₁ + [ ] x₂ ≤ [3]</span>. Fractions such as 4/3 are accepted.
      </p>
      <ol className="mt-3 space-y-2">
        {constraints.map((row, index) => (
          <ConstraintRow
            key={row.id}
            index={index}
            row={row}
            canDelete={constraints.length > 1}
            invalidFields={invalidFields}
            onChange={(next) => onChange(constraints.map((r) => (r.id === row.id ? next : r)))}
            onDelete={() => onChange(constraints.filter((r) => r.id !== row.id))}
          />
        ))}
      </ol>
      <Button
        className="mt-3"
        onClick={() => onChange([...constraints, emptyConstraint()])}
        disabled={constraints.length >= MAX_CONSTRAINTS}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add Constraint
      </Button>
      {constraints.length >= MAX_CONSTRAINTS && (
        <p className="mt-2 text-xs text-slate-500">Up to {MAX_CONSTRAINTS} constraints are supported.</p>
      )}
    </fieldset>
  );
}
