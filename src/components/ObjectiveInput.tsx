import type { ObjectiveType, ProblemDraft } from "../types/lpp";
import { MathExpression } from "./MathExpression";
import { NumberField } from "./NumberField";

export function ObjectiveInput({
  draft,
  onChange,
  invalidFields,
}: {
  draft: ProblemDraft;
  onChange: (draft: ProblemDraft) => void;
  invalidFields: Set<string>;
}) {
  const objectiveInvalid = invalidFields.has("objective");
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-900">Objective function</legend>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-3">
        <select
          value={draft.objectiveType}
          aria-label="Optimization type"
          onChange={(event) => onChange({ ...draft, objectiveType: event.target.value as ObjectiveType })}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 shadow-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
        >
          <option value="min">Minimize</option>
          <option value="max">Maximize</option>
        </select>
        <span className="flex items-center gap-2">
          <MathExpression latex="Z =" />
          <NumberField
            value={draft.c1}
            onChange={(c1) => onChange({ ...draft, c1 })}
            label="Objective coefficient of x1"
            placeholder="0"
            invalid={objectiveInvalid || invalidFields.has("objective.c1")}
          />
          <MathExpression latex="x_1 \;+" />
          <NumberField
            value={draft.c2}
            onChange={(c2) => onChange({ ...draft, c2 })}
            label="Objective coefficient of x2"
            placeholder="0"
            invalid={objectiveInvalid || invalidFields.has("objective.c2")}
          />
          <MathExpression latex="x_2" />
        </span>
      </div>
    </fieldset>
  );
}
