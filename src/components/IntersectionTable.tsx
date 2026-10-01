import type { BoundaryEquation, LPPSolution, PairIntersection } from "../types/lpp";
import { formatDecimal, formatPoint, isFractionDisplay, latexConstraint, latexNumber, latexPoint } from "../utils/formatting";
import { clean } from "../utils/math";
import { lineColor } from "./graphStyle";
import { MathExpression, MathLines } from "./MathExpression";
import { LineChip } from "./StepBlocks";
import { Badge, Table, td, th } from "./ui";

export function allLines(solution: LPPSolution): BoundaryEquation[] {
  return [...solution.boundaryEquations, ...solution.axisEquations];
}

export function LineTag({ line }: { line: BoundaryEquation }) {
  if (line.source === "axis") return <LineChip>{line.label}</LineChip>;
  return <LineChip color={lineColor(line.constraintIndex ?? 0)}>{line.label}</LineChip>;
}

function lineLatex(line: BoundaryEquation): string {
  return latexConstraint(line.a, line.b, "=", line.c);
}

/** (v) with parentheses for negative values, for products like (6)(-1). */
function f(value: number): string {
  return `\\left(${latexNumber(value)}\\right)`;
}

/** Cramer's-rule working for one pair of lines. */
export function pairWorking(first: BoundaryEquation, second: BoundaryEquation, pair: PairIntersection): string[] {
  const { a: a1, b: b1, c: c1 } = first;
  const { a: a2, b: b2, c: c2 } = second;
  const lines = [
    `\\begin{cases} ${lineLatex(first)} \\\\ ${lineLatex(second)} \\end{cases}`,
    `D = a_1b_2 - a_2b_1 = ${f(a1)}${f(b2)} - ${f(a2)}${f(b1)} = ${latexNumber(a1 * b2 - a2 * b1)}`,
  ];
  if (pair.kind !== "point" || !pair.point) {
    lines.push(
      pair.kind === "coincident"
        ? "D = 0 \\text{ and the equations are multiples of each other: the lines coincide.}"
        : "D = 0 \\text{: the lines are parallel and never meet.}",
    );
    return lines;
  }
  const d = clean(a1 * b2 - a2 * b1);
  lines.push(
    `x_1 = \\dfrac{c_1b_2 - c_2b_1}{D} = \\dfrac{${f(c1)}${f(b2)} - ${f(c2)}${f(b1)}}{${latexNumber(d)}} = \\dfrac{${latexNumber(c1 * b2 - c2 * b1)}}{${latexNumber(d)}} = ${latexNumber(pair.point.x1)}`,
    `x_2 = \\dfrac{a_1c_2 - a_2c_1}{D} = \\dfrac{${f(a1)}${f(c2)} - ${f(a2)}${f(c1)}}{${latexNumber(d)}} = \\dfrac{${latexNumber(a1 * c2 - a2 * c1)}}{${latexNumber(d)}} = ${latexNumber(pair.point.x2)}`,
  );
  return lines;
}

export function PairCard({ solution, pair }: { solution: LPPSolution; pair: PairIntersection }) {
  const lines = allLines(solution);
  const first = lines.find((l) => l.id === pair.firstId)!;
  const second = lines.find((l) => l.id === pair.secondId)!;
  return (
    <article className="avoid-break rounded-lg border border-slate-200 bg-white p-3">
      <header className="flex flex-wrap items-center gap-2">
        <LineTag line={first} />
        <span className="text-xs text-slate-500">and</span>
        <LineTag line={second} />
        <span className="ml-auto">
          {pair.kind === "point" ? (
            <Badge tone="blue">
              Point {pair.pointLabel} = {pair.point && formatPoint(pair.point)}
            </Badge>
          ) : (
            <Badge>{pair.kind === "parallel" ? "Parallel" : "Coincident"}</Badge>
          )}
        </span>
      </header>
      <MathLines lines={pairWorking(first, second, pair)} className="mt-2 text-sm" />
    </article>
  );
}

/** Every pair of lines and what it produced. */
export function PairsTable({ solution }: { solution: LPPSolution }) {
  const lines = allLines(solution);
  const byId = (id: string) => lines.find((l) => l.id === id)!;
  return (
    <Table caption="Every pair of boundary lines">
      <thead>
        <tr>
          <th className={th}>Pair of lines</th>
          <th className={th}>D</th>
          <th className={th}>Result</th>
        </tr>
      </thead>
      <tbody>
        {solution.pairs.map((pair) => (
          <tr key={`${pair.firstId}-${pair.secondId}`}>
            <td className={td}>
              <span className="flex flex-wrap items-center gap-1.5">
                <LineTag line={byId(pair.firstId)} />
                <span className="text-xs text-slate-400">×</span>
                <LineTag line={byId(pair.secondId)} />
              </span>
            </td>
            <td className={td}>
              <MathExpression latex={latexNumber(pair.determinant)} />
            </td>
            <td className={td}>
              {pair.kind === "point" && pair.point ? (
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{pair.pointLabel}</span>
                  <MathExpression latex={latexPoint(pair.point)} />
                </span>
              ) : (
                <span className="text-slate-500">
                  {pair.kind === "parallel" ? "Parallel, no intersection" : "Same line, no single point"}
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/** Unique candidate points with the lines through them. */
export function IntersectionTable({ solution }: { solution: LPPSolution }) {
  const lines = allLines(solution);
  return (
    <Table caption="Unique intersection points">
      <thead>
        <tr>
          <th className={th}>Point</th>
          <th className={th}>Coordinates</th>
          <th className={th}>Decimal</th>
          <th className={th}>Lines intersecting</th>
        </tr>
      </thead>
      <tbody>
        {solution.intersections.map((candidate) => {
          const hasFraction = isFractionDisplay(candidate.point.x1) || isFractionDisplay(candidate.point.x2);
          return (
            <tr key={candidate.label}>
              <td className={`${td} font-semibold`}>{candidate.label}</td>
              <td className={td}>
                <MathExpression latex={latexPoint(candidate.point)} />
              </td>
              <td className={`${td} text-slate-500`}>
                {hasFraction
                  ? `≈ (${formatDecimal(candidate.point.x1)}, ${formatDecimal(candidate.point.x2)})`
                  : "—"}
              </td>
              <td className={td}>
                <span className="flex flex-wrap gap-1.5">
                  {candidate.equationIds.map((id) => {
                    const line = lines.find((l) => l.id === id)!;
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5">
                        <LineTag line={line} />
                        <MathExpression latex={lineLatex(line)} className="text-xs" />
                      </span>
                    );
                  })}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
