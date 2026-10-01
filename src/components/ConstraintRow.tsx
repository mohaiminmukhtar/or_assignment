import { Trash2 } from "lucide-react";
import type { ConstraintDraft, Operator } from "../types/lpp";
import { MathExpression } from "./MathExpression";
import { NumberField } from "./NumberField";
import { Button } from "./ui";

const OPERATOR_OPTIONS: { value: Operator; label: string }[] = [
  { value: "<=", label: "≤" },
  { value: ">=", label: "≥" },
  { value: "=", label: "=" },
];

export function ConstraintRow({
  index,
  row,
  onChange,
  onDelete,
  canDelete,
  invalidFields,
}: {
  index: number;
  row: ConstraintDraft;
  onChange: (row: ConstraintDraft) => void;
  onDelete: () => void;
  canDelete: boolean;
  invalidFields: Set<string>;
}) {
  const prefix = `constraint.${row.id}`;
  const rowInvalid = invalidFields.has(prefix);
  const name = `Constraint ${index + 1}`;
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
      <span className="w-8 shrink-0 text-xs font-semibold text-slate-500">C{index + 1}</span>
      <span className="flex items-center gap-2">
        <NumberField
          value={row.x1}
          onChange={(x1) => onChange({ ...row, x1 })}
          label={`${name}, coefficient of x1`}
          placeholder="0"
          invalid={rowInvalid || invalidFields.has(`${prefix}.x1`)}
        />
        <MathExpression latex="x_1 \;+" />
        <NumberField
          value={row.x2}
          onChange={(x2) => onChange({ ...row, x2 })}
          label={`${name}, coefficient of x2`}
          placeholder="0"
          invalid={rowInvalid || invalidFields.has(`${prefix}.x2`)}
        />
        <MathExpression latex="x_2" />
      </span>
      <span className="flex items-center gap-2">
        <select
          value={row.operator}
          aria-label={`${name}, relation`}
          onChange={(event) => onChange({ ...row, operator: event.target.value as Operator })}
          className="h-10 w-16 rounded-md border border-slate-300 bg-white px-2 text-center text-base text-slate-900 shadow-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
        >
          {OPERATOR_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <NumberField
          value={row.rhs}
          onChange={(rhs) => onChange({ ...row, rhs })}
          label={`${name}, right-hand side`}
          invalid={invalidFields.has(`${prefix}.rhs`)}
        />
      </span>
      <Button
        variant="danger"
        size="sm"
        className="ml-auto"
        onClick={onDelete}
        disabled={!canDelete}
        aria-label={`Delete ${name}`}
        title={canDelete ? `Delete ${name}` : "At least one constraint is required"}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
    </li>
  );
}
