import type { LPPSolution, ObjectiveValue } from "../types/lpp";
import { formatNumberWithApprox, latexEvaluation, latexLinear, latexNumber, latexPoint } from "../utils/formatting";
import { MathExpression } from "./MathExpression";
import { Badge, Table, cn, td, th } from "./ui";

/** "Z = 2x₁ + 3x₂ = 2(1) + 3(3) = 2 + 9 = 11" for one corner point. */
export function ObjectiveWorking({ solution, value }: { solution: LPPSolution; value: ObjectiveValue }) {
  const { objective } = solution.problem;
  return (
    <div
      className={cn(
        "avoid-break rounded-lg border px-3 py-2",
        value.isOptimal ? "border-blue-300 bg-blue-50/60" : "border-slate-200 bg-white",
      )}
    >
      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
        At {value.pointLabel} <MathExpression latex={`= ${latexPoint(value.point)}`} />
        {value.isOptimal && <Badge tone="blue">{objective.type === "min" ? "Smallest" : "Largest"}</Badge>}
        {!value.attainable && <Badge tone="warning">Excluded by &gt; 0</Badge>}
      </p>
      <MathExpression
        display
        className="mt-1"
        latex={`Z = ${latexLinear(objective.x1, objective.x2)} = ${latexEvaluation(objective.x1, objective.x2, value.point)}`}
      />
    </div>
  );
}

export function ObjectiveTable({ solution }: { solution: LPPSolution }) {
  const zLabel = solution.problem.objective.type === "min" ? "Minimum" : "Maximum";
  if (solution.objectiveValues.length === 0) {
    return <p className="text-sm text-slate-600">There are no feasible corner points to evaluate.</p>;
  }
  return (
    <Table caption="Objective function value at every feasible corner point">
      <thead>
        <tr>
          <th className={th}>Point</th>
          <th className={`${th} text-right`}>x₁</th>
          <th className={`${th} text-right`}>x₂</th>
          <th className={`${th} text-right`}>
            Z = <MathExpression latex={latexLinear(solution.problem.objective.x1, solution.problem.objective.x2)} />
          </th>
          <th className={th}>Note</th>
        </tr>
      </thead>
      <tbody>
        {solution.objectiveValues.map((value) => (
          <tr key={value.pointLabel} className={value.isOptimal ? "bg-blue-50/70" : undefined}>
            <td className={`${td} font-semibold`}>{value.pointLabel}</td>
            <td className={`${td} text-right`}>
              <MathExpression latex={latexNumber(value.point.x1)} />
            </td>
            <td className={`${td} text-right`}>
              <MathExpression latex={latexNumber(value.point.x2)} />
            </td>
            <td className={`${td} text-right font-semibold`} title={formatNumberWithApprox(value.value)}>
              <MathExpression latex={latexNumber(value.value)} />
            </td>
            <td className={td}>
              {value.isOptimal && <Badge tone="blue">{zLabel}</Badge>}
              {!value.attainable && <Badge tone="warning">Excluded (strict &gt; 0)</Badge>}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
