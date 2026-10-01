import type { BoundaryEquation, LPPProblem, LPPSolution, Variable } from "../types/lpp";
import { latexConstraint, latexLinear, latexNumber, variableRestrictionLatex } from "../utils/formatting";
import { lineColor } from "./graphStyle";
import { MathExpression } from "./MathExpression";
import { LineChip } from "./StepBlocks";
import { Table, td, th } from "./ui";

export function restrictionLatex(problem: LPPProblem): string | null {
  const parts = (["x1", "x2"] as Variable[])
    .filter((v) => problem.restrictions[v] !== "free")
    .map((v) => variableRestrictionLatex(v, problem.restrictions[v] === "positive"));
  return parts.length > 0 ? parts.join(",\\quad ") : null;
}

/** The problem as a student would write it: objective, constraints, restrictions. */
export function ProblemStatement({ problem }: { problem: LPPProblem }) {
  const restrictions = restrictionLatex(problem);
  const free = (["x1", "x2"] as Variable[]).filter((v) => problem.restrictions[v] === "free");
  return (
    <div className="space-y-3 text-slate-900">
      <div>
        <p className="text-sm font-medium text-slate-600">{problem.objective.type === "min" ? "Minimize" : "Maximize"}</p>
        <MathExpression display latex={`Z = ${latexLinear(problem.objective.x1, problem.objective.x2)}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-600">Subject to</p>
        <ul className="mt-1 space-y-1">
          {problem.constraints.map((c, index) => (
            <li key={c.id} className="flex items-center gap-3">
              <LineChip color={lineColor(index)}>C{index + 1}</LineChip>
              <MathExpression latex={latexConstraint(c.x1, c.x2, c.operator, c.rhs)} />
            </li>
          ))}
        </ul>
      </div>
      {restrictions && (
        <div className="flex items-center gap-3">
          <span className="min-w-9 text-xs font-semibold text-slate-500">and</span>
          <MathExpression latex={restrictions} />
        </div>
      )}
      {free.length > 0 && (
        <p className="text-sm text-slate-600">
          {free.map((v) => (v === "x1" ? "x₁" : "x₂")).join(" and ")} {free.length > 1 ? "are" : "is"} unrestricted in
          sign.
        </p>
      )}
    </div>
  );
}

const ORIENTATION_TEXT: Record<BoundaryEquation["orientation"], string> = {
  vertical: "Vertical line",
  horizontal: "Horizontal line",
  oblique: "Slanted line",
};

/** Step 2 table: inequality -> boundary equation. */
export function BoundaryEquationsTable({ solution }: { solution: LPPSolution }) {
  const { problem } = solution;
  return (
    <Table caption="Constraints and their boundary equations">
      <thead>
        <tr>
          <th className={th}>Line</th>
          <th className={th}>Constraint</th>
          <th className={th}>Boundary equation</th>
          <th className={th}>Type</th>
        </tr>
      </thead>
      <tbody>
        {solution.boundaryEquations.map((line, index) => {
          const c = problem.constraints[index]!;
          return (
            <tr key={line.id}>
              <td className={td}>
                <LineChip color={lineColor(index)}>{line.label}</LineChip>
              </td>
              <td className={td}>
                <MathExpression latex={latexConstraint(c.x1, c.x2, c.operator, c.rhs)} />
              </td>
              <td className={td}>
                <MathExpression latex={latexConstraint(line.a, line.b, "=", line.c)} />
              </td>
              <td className={`${td} text-slate-600`}>
                {ORIENTATION_TEXT[line.orientation]}
                {line.operator === "=" && <span className="ml-1 text-slate-500">(already an equation)</span>}
              </td>
            </tr>
          );
        })}
        {solution.axisEquations.map((line) => {
          const variable: Variable = line.id === "AX1" ? "x1" : "x2";
          const strict = problem.restrictions[variable] === "positive";
          return (
            <tr key={line.id}>
              <td className={td}>
                <LineChip>{variable === "x1" ? "x₁-axis bound" : "x₂-axis bound"}</LineChip>
              </td>
              <td className={td}>
                <MathExpression latex={variableRestrictionLatex(variable, strict)} />
              </td>
              <td className={td}>
                <MathExpression latex={`${variable === "x1" ? "x_1" : "x_2"} = ${latexNumber(0)}`} />
              </td>
              <td className={`${td} text-slate-600`}>
                {variable === "x1" ? "The x₂-axis" : "The x₁-axis"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
