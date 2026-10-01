import type { ReactNode } from "react";
import { AlertTriangle, CircleSlash, Infinity as InfinityIcon, Target } from "lucide-react";
import type { LPPSolution, Point } from "../types/lpp";
import { latexConstraint, latexEvaluation, latexLinear, latexNumber, latexPoint } from "../utils/formatting";
import { clean } from "../utils/math";
import { objectiveRate } from "../engine/objective";
import { MathExpression } from "./MathExpression";
import { Callout } from "./StepBlocks";
import { cn } from "./ui";

/** Scales a unit direction to small whole numbers where possible, e.g. (0.707, 0.707) -> (1, 1). */
export function niceDirection(direction: Point): Point {
  const components = [direction.x1, direction.x2].map(Math.abs).filter((v) => v > 1e-9);
  const smallest = Math.min(...components);
  const scaled = { x1: clean(direction.x1 / smallest), x2: clean(direction.x2 / smallest) };
  return scaled;
}

function zName(solution: LPPSolution): string {
  return solution.problem.objective.type === "min" ? "Z_{\\min}" : "Z_{\\max}";
}

function StatusHeader({ icon, title, tone }: { icon: ReactNode; title: string; tone: "blue" | "red" | "amber" }) {
  const tones = {
    blue: "bg-blue-700 text-white",
    red: "bg-red-700 text-white",
    amber: "bg-amber-600 text-white",
  } as const;
  return (
    <div className={cn("flex items-center gap-2.5 rounded-t-xl px-5 py-3", tones[tone])}>
      {icon}
      <h3 className="text-base font-semibold">{title}</h3>
    </div>
  );
}

function Verification({ solution, labels }: { solution: LPPSolution; labels: string[] }) {
  const { objective } = solution.problem;
  return (
    <div className="space-y-1">
      {labels.map((label) => {
        const point = solution.intersections.find((c) => c.label === label)!.point;
        return (
          <div key={label} className="rounded-md bg-slate-50 px-3 py-1.5">
            <p className="text-xs font-semibold text-slate-500">Check at {label}</p>
            <MathExpression display latex={`Z = ${latexEvaluation(objective.x1, objective.x2, point)}`} />
          </div>
        );
      })}
    </div>
  );
}

export function FinalAnswer({ solution }: { solution: LPPSolution }) {
  const { status, problem, optimalSet, optimalValue } = solution;
  const { objective } = problem;
  const word = objective.type === "min" ? "minimum" : "maximum";

  if (status === "infeasible") {
    return (
      <div className="avoid-break overflow-hidden rounded-xl border border-red-200 bg-white">
        <StatusHeader tone="red" title="No feasible solution" icon={<CircleSlash className="h-5 w-5" aria-hidden="true" />} />
        <div className="space-y-3 px-5 py-4 text-sm text-slate-800">
          <p>The constraints do not have a common feasible region: no point satisfies all of them at the same time.</p>
          <p>Without a feasible point there is nothing to optimise, so the problem has no optimal solution.</p>
          {solution.notes.map((note) => (
            <Callout key={note}>{note}</Callout>
          ))}
        </div>
      </div>
    );
  }

  if (status === "unbounded") {
    const d = solution.improvingDirection ? niceDirection(solution.improvingDirection) : null;
    return (
      <div className="avoid-break overflow-hidden rounded-xl border border-amber-200 bg-white">
        <StatusHeader tone="amber" title={`Unbounded: no finite ${word}`} icon={<InfinityIcon className="h-5 w-5" aria-hidden="true" />} />
        <div className="space-y-3 px-5 py-4 text-sm text-slate-800">
          <p>The feasible region is unbounded, and Z keeps {objective.type === "max" ? "increasing" : "decreasing"} without limit inside it.</p>
          {d && (
            <>
              <p>
                From any feasible point, moving in the direction <MathExpression latex={latexPoint(d)} /> stays inside the
                region forever. Along that direction Z changes by
              </p>
              <MathExpression
                display
                latex={`${latexNumber(objective.x1)}\\left(${latexNumber(d.x1)}\\right) + ${latexNumber(objective.x2)}\\left(${latexNumber(d.x2)}\\right) = ${latexNumber(objectiveRate(objective, d))}`}
              />
              <p>per step, so Z can be made as {objective.type === "max" ? "large" : "small"} as we like.</p>
            </>
          )}
          <p className="font-semibold">
            Therefore the problem has an unbounded solution:{" "}
            <MathExpression latex={`${zName(solution)} = ${objective.type === "max" ? "+\\infty" : "-\\infty"}`} />
          </p>
        </div>
      </div>
    );
  }

  if (status === "unattained") {
    return (
      <div className="avoid-break overflow-hidden rounded-xl border border-amber-200 bg-white">
        <StatusHeader tone="amber" title={`The ${word} is not attained`} icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />} />
        <div className="space-y-3 px-5 py-4 text-sm text-slate-800">
          <p>
            Over the closed region the best value would be <MathExpression latex={`Z = ${latexNumber(optimalValue ?? 0)}`} />{" "}
            at {optimalSet?.pointLabels.join(", ")}, but those points lie on an axis, which the strict restriction
            (&gt; 0) excludes.
          </p>
          <p>
            Z can come arbitrarily close to this value but never reaches it, so there is no optimal solution. The{" "}
            {word === "minimum" ? "infimum (greatest lower bound)" : "supremum (least upper bound)"} of Z is{" "}
            <MathExpression latex={latexNumber(optimalValue ?? 0)} />.
          </p>
        </div>
      </div>
    );
  }

  // optimal or multiple
  const value = optimalValue ?? 0;
  const points = solution.optimalPoints;
  const single = status === "optimal" ? points[0] : undefined;

  return (
    <div className="avoid-break overflow-hidden rounded-xl border border-blue-200 bg-white">
      <StatusHeader
        tone="blue"
        title={status === "optimal" ? "Optimal Solution" : "Multiple Optimal Solutions"}
        icon={<Target className="h-5 w-5" aria-hidden="true" />}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 px-5 py-5">
        <div>
          <p className="text-sm font-medium text-slate-600">{objective.type === "min" ? "Minimum" : "Maximum"} value</p>
          <MathExpression display latex={`${zName(solution)} = ${latexNumber(value)}`} className="text-2xl text-slate-950" />
          {single && (
            <>
              <p className="mt-3 text-sm font-medium text-slate-600">At</p>
              <MathExpression display latex={`x_1 = ${latexNumber(single.point.x1)},\\quad x_2 = ${latexNumber(single.point.x2)}`} className="text-lg" />
              <p className="mt-3 text-sm font-medium text-slate-600">Optimal point</p>
              <MathExpression display latex={`${single.label} = ${latexPoint(single.point)}`} className="text-lg" />
            </>
          )}
          {status === "multiple" && <MultipleDescription solution={solution} />}
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-600">Verification</p>
          {points.length > 0 ? (
            <Verification solution={solution} labels={points.map((p) => p.label)} />
          ) : (
            optimalSet?.anchor && (
              <div className="rounded-md bg-slate-50 px-3 py-1.5">
                <MathExpression display latex={`Z = ${latexEvaluation(objective.x1, objective.x2, optimalSet.anchor)}`} />
              </div>
            )
          )}
          {!solution.region.bounded && (
            <Callout>
              The feasible region is unbounded, but Z does not {objective.type === "max" ? "increase" : "decrease"} along any
              of its unbounded directions, so a finite {word} exists.
            </Callout>
          )}
          {solution.notes.map((note) => (
            <Callout key={note}>{note}</Callout>
          ))}
        </div>
      </div>
    </div>
  );
}

function MultipleDescription({ solution }: { solution: LPPSolution }) {
  const { optimalSet, problem } = solution;
  if (!optimalSet) return null;
  const labels = optimalSet.pointLabels;
  const vertices = labels.map((l) => solution.intersections.find((c) => c.label === l)!);
  const excluded = new Set(optimalSet.excludedLabels);
  const zLatex = `${latexLinear(problem.objective.x1, problem.objective.x2)} = ${latexNumber(solution.optimalValue ?? 0)}`;

  return (
    <div className="mt-3 space-y-3 text-sm text-slate-800">
      <p>
        Multiple optimal solutions exist. The objective function has the same optimal value along the corresponding
        feasible boundary {optimalSet.direction && vertices.length < 2 ? "ray" : "segment"}, because the line{" "}
        <MathExpression latex={zLatex} /> lies along it.
      </p>
      {vertices.length >= 2 && (
        <>
          <p>Optimal corner points:</p>
          <ul className="space-y-1">
            {vertices.map((v) => (
              <li key={v.label}>
                <MathExpression latex={`${v.label} = ${latexPoint(v.point)}`} />
                {excluded.has(v.label) && <span className="ml-2 text-amber-800">(excluded by &gt; 0)</span>}
              </li>
            ))}
          </ul>
          <p>Every point of the segment between them is optimal:</p>
          <MathExpression
            display
            latex={`(x_1, x_2) = \\lambda\\,${vertices[0]!.label} + (1-\\lambda)\\,${vertices[1]!.label},\\quad ${
              excluded.size > 0 ? "0 < \\lambda < 1" : "0 \\le \\lambda \\le 1"
            }`}
          />
        </>
      )}
      {vertices.length === 1 && optimalSet.direction && (
        <>
          <p>
            Every point of the ray starting at {vertices[0]!.label} = <MathExpression latex={latexPoint(vertices[0]!.point)} /> in
            direction <MathExpression latex={latexPoint(niceDirection(optimalSet.direction))} /> is optimal:
          </p>
          <MathExpression
            display
            latex={`(x_1, x_2) = ${latexPoint(vertices[0]!.point)} + t\\,${latexPoint(niceDirection(optimalSet.direction))},\\quad t ${
              excluded.size > 0 ? ">" : "\\ge"
            } 0`}
          />
        </>
      )}
      {vertices.length === 0 && optimalSet.anchor && (
        <>
          <p>Every point of the boundary line below is optimal (the region has no corner points):</p>
          <MathExpression
            display
            latex={latexConstraint(problem.objective.x1, problem.objective.x2, "=", solution.optimalValue ?? 0)}
          />
          <p>
            For example <MathExpression latex={latexPoint(optimalSet.anchor)} />.
          </p>
        </>
      )}
    </div>
  );
}
