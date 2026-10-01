import type { AxisCrossing, BoundaryEquation, Intercept, LPPSolution, Variable } from "../types/lpp";
import { interceptPlotPoints } from "../engine/intercepts";
import { VARIABLE_LATEX, latexConstraint, latexLinear, latexNumber, latexPoint } from "../utils/formatting";
import { clean } from "../utils/math";
import { lineColor } from "./graphStyle";
import { MathExpression, MathLines } from "./MathExpression";
import { LineChip } from "./StepBlocks";
import { Badge, Table, td, th } from "./ui";

/**
 * Working for "put `known` = value in a·x1 + b·x2 = c and solve for the other variable".
 * Produces e.g.  6(0) + 2x₂ = 8  →  2x₂ = 8  →  x₂ = 8/2 = 4.
 */
export function substitutionWorking(
  line: Pick<BoundaryEquation, "a" | "b" | "c">,
  known: Variable,
  value: number,
): string[] {
  const coefficients: Record<Variable, number> = { x1: clean(line.a), x2: clean(line.b) };
  const unknown: Variable = known === "x1" ? "x2" : "x1";
  const pieces: { negative: boolean; body: string }[] = [];
  for (const variable of ["x1", "x2"] as Variable[]) {
    const k = coefficients[variable];
    if (k === 0) continue;
    const magnitude = Math.abs(k);
    let body: string;
    if (variable === known) {
      const v = latexNumber(value);
      body = magnitude === 1 ? (clean(value) < 0 ? `\\left(${v}\\right)` : v) : `${latexNumber(magnitude)}\\left(${v}\\right)`;
    } else {
      body = `${magnitude === 1 ? "" : latexNumber(magnitude)}${VARIABLE_LATEX[variable]}`;
    }
    pieces.push({ negative: k < 0, body });
  }
  const left =
    pieces.length === 0
      ? "0"
      : pieces
          .map((p, i) => (i === 0 ? `${p.negative ? "-" : ""}${p.body}` : `${p.negative ? " - " : " + "}${p.body}`))
          .join("");
  const lines = [`${left} = ${latexNumber(line.c)}`];

  const ku = coefficients[unknown];
  if (ku === 0) return lines; // the caller explains "impossible" / "always true"

  const rhs = clean(line.c - coefficients[known] * value);
  const reduced = `${latexLinear(unknown === "x1" ? ku : 0, unknown === "x2" ? ku : 0)} = ${latexNumber(rhs)}`;
  if (reduced !== lines[0]) lines.push(reduced);
  if (ku !== 1) {
    lines.push(`${VARIABLE_LATEX[unknown]} = \\dfrac{${latexNumber(rhs)}}{${latexNumber(ku)}} = ${latexNumber(rhs / ku)}`);
  }
  return lines;
}

function CrossingWorking({
  line,
  crossing,
  zeroed,
}: {
  line: BoundaryEquation;
  crossing: AxisCrossing;
  zeroed: Variable;
}) {
  const axisName = zeroed === "x1" ? "x₂-axis" : "x₁-axis";
  const working = substitutionWorking(line, zeroed, 0);
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs font-semibold text-slate-600">
        Put <MathExpression latex={`${VARIABLE_LATEX[zeroed]} = 0`} />:
      </p>
      <MathLines lines={working} className="mt-1" />
      {crossing.kind === "point" && (
        <p className="mt-1 text-sm text-slate-800">
          Point on the {axisName}: <MathExpression latex={latexPoint(crossing.point)} />
        </p>
      )}
      {crossing.kind === "none" && (
        <p className="mt-1 text-sm text-slate-700">
          This is impossible, so the line never meets the {axisName}. There is no {axisName} intercept.
        </p>
      )}
      {crossing.kind === "coincident" && (
        <p className="mt-1 text-sm text-slate-700">
          This is true for every point of the {axisName}: the line is the {axisName} itself.
        </p>
      )}
    </div>
  );
}

function orientationNote(line: BoundaryEquation, intercept: Intercept): string | null {
  const value = latexNumber(line.orientation === "vertical" ? line.c / line.a : line.c / line.b);
  if (line.orientation === "vertical") {
    return `x_1 = ${value} \\text{ is a vertical line (parallel to the } x_2\\text{-axis).}`;
  }
  if (line.orientation === "horizontal") {
    return `x_2 = ${value} \\text{ is a horizontal line (parallel to the } x_1\\text{-axis).}`;
  }
  if (intercept.passesThroughOrigin) return "\\text{The line passes through the origin.}";
  return null;
}

/** Full working for one boundary line. */
export function InterceptWorking({ line, intercept, index }: { line: BoundaryEquation; intercept: Intercept; index: number }) {
  const note = orientationNote(line, intercept);
  const plotPoints = interceptPlotPoints(intercept);
  return (
    <article className="avoid-break rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <header className="flex flex-wrap items-center gap-2">
        <LineChip color={lineColor(index)}>{line.label}</LineChip>
        <MathExpression latex={latexConstraint(line.a, line.b, "=", line.c)} />
        {line.orientation !== "oblique" && <Badge tone="blue">{line.orientation}</Badge>}
      </header>
      {note && <MathExpression display latex={note} className="mt-2 text-sm" />}
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <CrossingWorking line={line} crossing={intercept.onX2Axis} zeroed="x1" />
        <CrossingWorking line={line} crossing={intercept.onX1Axis} zeroed="x2" />
      </div>
      {intercept.extraPoint && (
        <div className="mt-2 rounded-md border border-slate-200 bg-white px-3 py-2">
          <p className="text-xs font-semibold text-slate-600">
            Both intercepts are the origin, so choose another value: put{" "}
            <MathExpression latex={`x_1 = ${latexNumber(intercept.extraPoint.x1)}`} />:
          </p>
          <MathLines lines={substitutionWorking(line, "x1", intercept.extraPoint.x1)} className="mt-1" />
          <p className="mt-1 text-sm text-slate-800">
            Second point: <MathExpression latex={latexPoint(intercept.extraPoint)} />
          </p>
        </div>
      )}
      <p className="mt-2 text-sm text-slate-700">
        Plot the line through{" "}
        {plotPoints.map((p, i) => (
          <span key={i}>
            {i > 0 && " and "}
            <MathExpression latex={latexPoint(p)} />
          </span>
        ))}
        {line.orientation === "vertical" && " and draw it straight up and down"}
        {line.orientation === "horizontal" && " and draw it straight across"}.
      </p>
    </article>
  );
}

function crossingCell(crossing: AxisCrossing) {
  if (crossing.kind === "point") return <MathExpression latex={latexPoint(crossing.point)} />;
  if (crossing.kind === "coincident") return <span className="text-slate-600">The whole axis</span>;
  return <span className="text-slate-500">None (parallel)</span>;
}

/** Summary table of every intercept. */
export function InterceptsTable({ solution }: { solution: LPPSolution }) {
  return (
    <Table caption="Intercepts of every boundary line">
      <thead>
        <tr>
          <th className={th}>Line</th>
          <th className={th}>Boundary equation</th>
          <th className={th}>
            Put <MathExpression latex="x_1 = 0" /> (meets x₂-axis)
          </th>
          <th className={th}>
            Put <MathExpression latex="x_2 = 0" /> (meets x₁-axis)
          </th>
          <th className={th}>Type</th>
        </tr>
      </thead>
      <tbody>
        {solution.boundaryEquations.map((line, index) => {
          const intercept = solution.intercepts[index]!;
          return (
            <tr key={line.id}>
              <td className={td}>
                <LineChip color={lineColor(index)}>{line.label}</LineChip>
              </td>
              <td className={td}>
                <MathExpression latex={latexConstraint(line.a, line.b, "=", line.c)} />
              </td>
              <td className={td}>{crossingCell(intercept.onX2Axis)}</td>
              <td className={td}>{crossingCell(intercept.onX1Axis)}</td>
              <td className={`${td} capitalize text-slate-600`}>
                {line.orientation === "oblique" ? "slanted" : line.orientation}
                {intercept.passesThroughOrigin && line.orientation === "oblique" && ", through origin"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
