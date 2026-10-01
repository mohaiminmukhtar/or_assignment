import { useState } from "react";
import { Check, X } from "lucide-react";
import type { CandidatePoint, ConstraintCheck, LPPSolution } from "../types/lpp";
import { VARIABLE_LATEX, latexConstraint, latexNumber, latexOperator, latexPoint, latexSubstitution } from "../utils/formatting";
import { lineColor } from "./graphStyle";
import { MathExpression } from "./MathExpression";
import { LineChip } from "./StepBlocks";
import { Badge, Table, cn, td, th } from "./ui";

function checkHeader(check: ConstraintCheck): string {
  if (check.targetId === "x1" || check.targetId === "x2") {
    return `${check.targetId === "x1" ? "x₁" : "x₂"} ${check.operator === ">" ? ">" : "≥"} 0`;
  }
  return check.targetId;
}

export function Mark({ ok }: { ok: boolean }) {
  return ok ? (
    <Check className="h-4 w-4 text-emerald-700" aria-label="satisfied" />
  ) : (
    <X className="h-4 w-4 text-red-600" aria-label="violated" />
  );
}

export function FeasibleBadge({ feasible }: { feasible: boolean }) {
  return feasible ? <Badge tone="success">Feasible</Badge> : <Badge tone="danger">Infeasible</Badge>;
}

/** Point × constraint matrix of ✓ / ✗. */
export function FeasibilityTable({ solution }: { solution: LPPSolution }) {
  const headers = solution.intersections[0]?.checks ?? [];
  return (
    <Table caption="Feasibility of every candidate point">
      <thead>
        <tr>
          <th className={th}>Point</th>
          <th className={th}>Coordinates</th>
          {headers.map((check) => (
            <th key={check.targetId} className={`${th} text-center`}>
              {checkHeader(check)}
            </th>
          ))}
          <th className={th}>Feasible?</th>
        </tr>
      </thead>
      <tbody>
        {solution.intersections.map((candidate) => (
          <tr key={candidate.label} className={candidate.feasible ? "bg-emerald-50/40" : undefined}>
            <td className={`${td} font-semibold`}>{candidate.label}</td>
            <td className={`${td} whitespace-nowrap`}>
              <MathExpression latex={latexPoint(candidate.point)} />
            </td>
            {candidate.checks.map((check) => (
              <td key={check.targetId} className={`${td} text-center`}>
                <span className="inline-flex justify-center">
                  <Mark ok={check.satisfied} />
                </span>
              </td>
            ))}
            <td className={td}>
              <span className={cn("font-semibold", candidate.feasible ? "text-emerald-800" : "text-red-700")}>
                {candidate.feasible ? "YES" : "NO"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/** Substitution working for one check: "6(1) + 2(3) ≥ 8  →  12 ≥ 8". */
function checkWorking(check: ConstraintCheck, candidate: CandidatePoint): { original: string; substituted: string; result: string } {
  const op = latexOperator(check.operator);
  if (check.targetId === "x1" || check.targetId === "x2") {
    const variable = check.targetId;
    return {
      original: `${VARIABLE_LATEX[variable]} ${op} 0`,
      substituted: `${VARIABLE_LATEX[variable]} = ${latexNumber(candidate.point[variable])}`,
      result: `${latexNumber(check.lhs)} ${op} 0`,
    };
  }
  const { substituted } = latexSubstitution(check.a, check.b, candidate.point);
  return {
    original: latexConstraint(check.a, check.b, check.operator, check.rhs),
    substituted: `${substituted} ${op} ${latexNumber(check.rhs)}`,
    result: `${latexNumber(check.lhs)} ${op} ${latexNumber(check.rhs)}`,
  };
}

/** Every substitution for one candidate point. */
export function PointChecks({ candidate }: { candidate: CandidatePoint }) {
  return (
    <article className="avoid-break rounded-lg border border-slate-200 bg-white">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
        <span className="font-semibold text-slate-900">Point {candidate.label}</span>
        <MathExpression latex={`= ${latexPoint(candidate.point)}`} />
        <span className="ml-auto">
          <FeasibleBadge feasible={candidate.feasible} />
        </span>
      </header>
      <ul className="divide-y divide-slate-100">
        {candidate.checks.map((check) => {
          const working = checkWorking(check, candidate);
          const constraintIndex = /^C(\d+)$/.exec(check.targetId);
          return (
            <li key={check.targetId} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2">
              <LineChip color={constraintIndex ? lineColor(Number(constraintIndex[1]) - 1) : undefined}>
                {constraintIndex ? check.targetId : "Sign"}
              </LineChip>
              <div className="min-w-0 space-y-0.5 overflow-x-auto text-sm">
                <MathExpression latex={working.original} className="text-slate-500" />
                <div className="flex flex-wrap items-center gap-x-2">
                  <MathExpression latex={working.substituted} />
                  <span className="text-slate-400" aria-hidden="true">→</span>
                  <MathExpression latex={working.result} />
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs font-medium">
                <Mark ok={check.satisfied} />
                <span className={check.satisfied ? "text-emerald-800" : "text-red-700"}>
                  {check.satisfied ? "True" : "False"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {!candidate.feasible && (
        <p className="border-t border-slate-100 px-3 py-2 text-sm text-red-800">
          Violates {failedNames(candidate).join(", ")}, so {candidate.label} is not in the feasible region.
        </p>
      )}
    </article>
  );
}

export function failedNames(candidate: CandidatePoint): string[] {
  return candidate.checks.filter((c) => !c.satisfied).map(checkHeader);
}

/** Point picker with the detailed checks; `expandAll` lists every point (used for printing). */
export function FeasibilityDetails({ solution, expandAll = false }: { solution: LPPSolution; expandAll?: boolean }) {
  const [selected, setSelected] = useState(solution.intersections[0]?.label ?? "");
  if (expandAll) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {solution.intersections.map((candidate) => (
          <PointChecks key={candidate.label} candidate={candidate} />
        ))}
      </div>
    );
  }
  const candidate = solution.intersections.find((c) => c.label === selected) ?? solution.intersections[0];
  return (
    <div>
      <div role="tablist" aria-label="Choose a point to check" className="flex flex-wrap gap-1.5">
        {solution.intersections.map((c) => (
          <button
            key={c.label}
            type="button"
            role="tab"
            aria-selected={c.label === candidate?.label}
            onClick={() => setSelected(c.label)}
            className={cn(
              "h-8 min-w-10 rounded-md border px-2 text-sm font-semibold transition-colors",
              c.label === candidate?.label
                ? "border-blue-700 bg-blue-700 text-white"
                : c.feasible
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">Green buttons are feasible points.</p>
      {candidate && (
        <div className="mt-3 max-w-2xl">
          <PointChecks candidate={candidate} />
        </div>
      )}
    </div>
  );
}
