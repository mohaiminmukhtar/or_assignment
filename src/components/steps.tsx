import type { ReactNode } from "react";
import type { LPPSolution, Variable } from "../types/lpp";
import {
  latexConstraint,
  latexEvaluation,
  latexNumber,
  latexOperator,
  latexPoint,
  latexSubstitution,
  variableRestrictionLatex,
} from "../utils/formatting";
import { BoundaryEquationsTable, ProblemStatement } from "./ProblemSummary";
import { InterceptWorking, InterceptsTable } from "./InterceptsTable";
import { IntersectionTable, PairCard, PairsTable, allLines } from "./IntersectionTable";
import { FeasibilityDetails, FeasibilityTable, failedNames } from "./FeasibilityTable";
import { ObjectiveTable, ObjectiveWorking } from "./ObjectiveTable";
import { FinalAnswer, niceDirection } from "./FinalAnswer";
import { MathExpression, MathLines } from "./MathExpression";
import { Callout, Explain, LineChip, SubSection } from "./StepBlocks";
import { lineColor } from "./graphStyle";
import type { StepInfo } from "./StepNavigation";

export const STEPS: StepInfo[] = [
  { key: "problem", short: "Problem", title: "Given Problem" },
  { key: "boundary", short: "Boundary", title: "Boundary Equations" },
  { key: "intercepts", short: "Intercepts", title: "Intercepts of Each Line" },
  { key: "graph", short: "Graph", title: "Graph and Feasible Region" },
  { key: "intersections", short: "Intersections", title: "All Pairwise Intersections" },
  { key: "feasibility", short: "Feasibility", title: "Feasibility Check" },
  { key: "objective", short: "Objective", title: "Objective Function Values" },
  { key: "answer", short: "Answer", title: "Final Answer" },
];

function restrictedVariables(solution: LPPSolution): Variable[] {
  return (["x1", "x2"] as Variable[]).filter((v) => solution.problem.restrictions[v] !== "free");
}

function strictText(solution: LPPSolution, variable: Variable): boolean {
  return solution.problem.restrictions[variable] === "positive";
}

// ---------------------------------------------------------------------------
// Feasible-region description (Step 4)
// ---------------------------------------------------------------------------

export function RegionSummary({ solution }: { solution: LPPSolution }) {
  const { region } = solution;
  const vertices = solution.intersections.filter((c) => c.isRegionVertex).map((c) => c.label);
  const list = vertices.join(", ");
  switch (region.shape) {
    case "empty":
      return (
        <Callout tone="danger">
          <strong>No feasible solution exists.</strong> The allowed sides of the constraints do not overlap anywhere, so
          there is no feasible region to shade.
        </Callout>
      );
    case "point":
      return (
        <Callout>
          The constraints meet in a single point, <strong>{list}</strong>. The feasible region is just that point.
        </Callout>
      );
    case "segment":
      return (
        <Callout>
          The feasible region is a <strong>line segment</strong> (drawn as a thick band) with end points{" "}
          <strong>{vertices.join(" and ")}</strong>.
          {solution.problem.constraints.some((c) => c.operator === "=") &&
            " This happens because an equality constraint only allows points that lie on its line."}
        </Callout>
      );
    case "polygon":
      return (
        <Callout>
          The feasible region is the shaded <strong>closed polygon</strong> with corners {list}. It is bounded.
        </Callout>
      );
    case "unbounded": {
      const directions = region.recessionDirections.map((d) => latexPoint(niceDirection(d)));
      return (
        <Callout tone="warning">
          <strong>The feasible region is unbounded.</strong> It is not a closed polygon: it extends without limit
          {directions.length > 0 && (
            <>
              {" "}
              in the direction{directions.length > 1 ? "s" : ""}{" "}
              {directions.map((d, i) => (
                <span key={i}>
                  {i > 0 && ", "}
                  <MathExpression latex={d} />
                </span>
              ))}
            </>
          )}
          .{vertices.length > 0 && ` Its corner points are ${list}.`}
        </Callout>
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Left-hand explanations
// ---------------------------------------------------------------------------

function ProblemStep({ solution }: { solution: LPPSolution }) {
  return (
    <>
      <Explain
        what="Write down the objective function Z that has to be optimised and every constraint it is subject to. Each constraint gets a name (C1, C2, …)."
        why="Naming the constraints lets us refer to them in every later step, in the tables and on the graph. Each constraint is linear, so on a graph it becomes a straight line."
      />
      <SubSection title="The problem">
        <ProblemStatement problem={solution.problem} />
      </SubSection>
    </>
  );
}

function BoundaryStep({ solution }: { solution: LPPSolution }) {
  const { problem } = solution;
  return (
    <>
      <Explain
        what="Replace the ≤ or ≥ sign of every constraint by = . An equality constraint is already an equation."
        why="The edge of the region allowed by an inequality is a straight line, called its boundary. We draw these lines first; the inequality sign then tells us which side of the line is allowed."
      />
      <SubSection title="Calculation">
        <ul className="space-y-1.5">
          {solution.boundaryEquations.map((line, index) => {
            const c = problem.constraints[index]!;
            return (
              <li key={line.id} className="flex flex-wrap items-center gap-2">
                <LineChip color={lineColor(index)}>{line.label}</LineChip>
                <MathExpression
                  latex={`${latexConstraint(c.x1, c.x2, c.operator, c.rhs)} \\;\\longrightarrow\\; ${latexConstraint(line.a, line.b, "=", line.c)}`}
                />
              </li>
            );
          })}
          {restrictedVariables(solution).map((v) => (
            <li key={v} className="flex flex-wrap items-center gap-2">
              <LineChip>Sign</LineChip>
              <MathExpression
                latex={`${variableRestrictionLatex(v, strictText(solution, v))} \\;\\longrightarrow\\; ${v === "x1" ? "x_1" : "x_2"} = 0 \\quad (\\text{the } ${v === "x1" ? "x_2" : "x_1"}\\text{-axis})`}
              />
            </li>
          ))}
        </ul>
      </SubSection>
      {restrictedVariables(solution).length > 0 && (
        <Callout>
          The sign restrictions also act as boundaries: their lines are the coordinate axes. They are used when finding
          corner points in Step 5.
        </Callout>
      )}
    </>
  );
}

function InterceptsStep({ solution }: { solution: LPPSolution }) {
  return (
    <>
      <Explain
        what={
          <>
            For every boundary line, put <MathExpression latex="x_1 = 0" /> and solve for <MathExpression latex="x_2" /> (where the
            line meets the x₂-axis), then put <MathExpression latex="x_2 = 0" /> and solve for <MathExpression latex="x_1" /> (where it
            meets the x₁-axis).
          </>
        }
        why="To draw a straight line we need two points. The points where the line crosses the axes are the easiest to find, because one coordinate is zero. Vertical and horizontal lines cross only one axis."
      />
      <SubSection title="Calculation">
        <div className="space-y-3">
          {solution.boundaryEquations.map((line, index) => (
            <InterceptWorking key={line.id} line={line} intercept={solution.intercepts[index]!} index={index} />
          ))}
        </div>
      </SubSection>
    </>
  );
}

function GraphStep({ solution }: { solution: LPPSolution }) {
  const { problem } = solution;
  return (
    <>
      <Explain
        what="Draw every boundary line through its intercepts. For each inequality, substitute a test point that is not on the line (usually the origin). If the test point satisfies the inequality, the allowed side is the side containing it; otherwise it is the opposite side."
        why="The feasible region is the set of points that satisfy every constraint at the same time, so it is the overlap of all the allowed sides. Only this overlap is shaded on the graph."
      />
      <SubSection title="Which side of each line?">
        <ul className="space-y-2">
          {solution.boundaryEquations.map((line, index) => {
            const c = problem.constraints[index]!;
            const test = solution.halfPlaneTests.find((t) => t.equationId === line.id);
            return (
              <li key={line.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <LineChip color={lineColor(index)}>{line.label}</LineChip>
                  <MathExpression latex={latexConstraint(c.x1, c.x2, c.operator, c.rhs)} />
                </div>
                {test ? (
                  <div className="mt-1 text-sm text-slate-700">
                    Test <MathExpression latex={latexPoint(test.testPoint)} />:{" "}
                    <MathExpression
                      latex={`${latexSubstitution(c.x1, c.x2, test.testPoint).substituted} = ${latexNumber(test.lhs)} ${latexOperator(c.operator)} ${latexNumber(c.rhs)}`}
                    />{" "}
                    is <strong className={test.satisfied ? "text-emerald-800" : "text-red-700"}>{test.satisfied ? "true" : "false"}</strong>, so
                    shade the side {test.satisfied ? "containing" : "away from"}{" "}
                    {test.testPoint.x1 === 0 && test.testPoint.x2 === 0 ? "the origin" : <MathExpression latex={latexPoint(test.testPoint)} />}.
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-slate-700">
                    This is an equation, so there is no side to shade: only points <strong>on the line itself</strong> satisfy it.
                  </p>
                )}
              </li>
            );
          })}
          {restrictedVariables(solution).length > 0 && (
            <li className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <MathExpression
                latex={restrictedVariables(solution)
                  .map((v) => variableRestrictionLatex(v, strictText(solution, v)))
                  .join(",\\ ")}
              />{" "}
              {restrictedVariables(solution).length === 2
                ? "keep the region in the first quadrant."
                : `keep the region on one side of the ${restrictedVariables(solution)[0] === "x1" ? "x₂" : "x₁"}-axis.`}
            </li>
          )}
        </ul>
      </SubSection>
      <SubSection title="Feasible region">
        <RegionSummary solution={solution} />
      </SubSection>
      <p className="screen-only text-xs text-slate-500">
        Tip: tick “Shade each inequality separately” above the graph to see every allowed side on its own.
      </p>
    </>
  );
}

function IntersectionsStep({ solution }: { solution: LPPSolution }) {
  const lines = allLines(solution);
  const pairCount = solution.pairs.length;
  const pointPairs = solution.pairs.filter((p) => p.kind === "point").length;
  const example =
    solution.pairs.find((p) => p.kind === "point" && solution.intersections.find((c) => c.label === p.pointLabel)?.isRegionVertex) ??
    solution.pairs.find((p) => p.kind === "point");
  return (
    <>
      <Explain
        what={
          <>
            Solve every pair of boundary lines simultaneously
            {solution.axisEquations.length > 0 && ", including the axes from the sign restrictions,"} using determinants
            (Cramer's rule). Points produced by more than one pair are kept only once and then labelled A, B, C, …
          </>
        }
        why="If an optimal solution exists, it is found at a corner of the feasible region, and every corner is where two boundary lines cross. Finding all crossings first guarantees no corner is missed. Not every crossing is a corner: Step 6 removes the ones that break a constraint."
      />
      <SubSection title="Method">
        <MathLines
          lines={[
            "\\begin{cases} a_1x_1 + b_1x_2 = c_1 \\\\ a_2x_1 + b_2x_2 = c_2 \\end{cases}",
            "D = a_1b_2 - a_2b_1,\\qquad x_1 = \\dfrac{c_1b_2 - c_2b_1}{D},\\qquad x_2 = \\dfrac{a_1c_2 - a_2c_1}{D}",
          ]}
          className="text-sm"
        />
        <p className="mt-2 text-sm text-slate-700">
          If <MathExpression latex="D = 0" />, the lines are parallel (or the same line) and give no single point.
        </p>
      </SubSection>
      <Callout>
        {lines.length} lines give {pairCount} pairs. {pointPairs} pairs intersect in a point; after removing duplicates
        there are <strong>{solution.intersections.length} distinct candidate points</strong>.
      </Callout>
      {example && (
        <SubSection title="Worked example">
          <PairCard solution={solution} pair={example} />
        </SubSection>
      )}
    </>
  );
}

function FeasibilityStep({ solution }: { solution: LPPSolution }) {
  // The most instructive counter-example: an infeasible crossing that breaks as few constraints as possible.
  const counterExample = solution.intersections
    .filter((c) => !c.feasible)
    .sort((p, q) => failedNames(p).length - failedNames(q).length)[0];
  const feasible = solution.feasiblePoints;
  return (
    <>
      <Explain
        what="Substitute each candidate point into every original constraint and every sign restriction, and check whether it holds."
        why={
          <>
            A crossing of two lines may still break another constraint.
            {counterExample && (
              <>
                {" "}For example, {counterExample.label} = <MathExpression latex={latexPoint(counterExample.point)} /> lies on{" "}
                {counterExample.equationIds.length} boundary lines but violates {failedNames(counterExample).join(", ")}.
              </>
            )}{" "}
            Only points satisfying everything are corners of the feasible region.
          </>
        }
      />
      <SubSection title="Rules">
        <ul className="space-y-1 text-sm text-slate-700">
          <li>
            <MathExpression latex="=" />: the left side must equal the right side.
          </li>
          <li>
            <MathExpression latex="\le" />: the left side must not exceed the right side.
          </li>
          <li>
            <MathExpression latex="\ge" />: the left side must be at least the right side.
          </li>
        </ul>
      </SubSection>
      <SubSection title="Answer">
        {feasible.length > 0 ? (
          <Callout tone="success">
            Feasible points:{" "}
            {feasible.map((c, i) => (
              <span key={c.label}>
                {i > 0 && ", "}
                <strong>{c.label}</strong> <MathExpression latex={latexPoint(c.point)} />
              </span>
            ))}
            . All other candidates are infeasible.
          </Callout>
        ) : (
          <Callout tone="danger">
            No candidate point satisfies every constraint. <strong>No feasible solution exists.</strong>
          </Callout>
        )}
      </SubSection>
      {solution.notes.length > 0 && solution.notes.map((note) => <Callout key={note}>{note}</Callout>)}
    </>
  );
}

function ObjectiveStep({ solution }: { solution: LPPSolution }) {
  const { objective } = solution.problem;
  return (
    <>
      <Explain
        what="Substitute the coordinates of every feasible corner point into the objective function Z."
        why={`By the corner-point theorem, if the problem has an optimal solution it occurs at a corner of the feasible region. So we compare Z at the corners and choose the ${objective.type === "min" ? "smallest" : "largest"} value.`}
      />
      {solution.objectiveValues.length === 0 ? (
        <Callout tone="danger">There are no feasible corner points, so Z cannot be evaluated.</Callout>
      ) : (
        <SubSection title="Calculation">
          <div className="space-y-2">
            {solution.objectiveValues.map((value) => (
              <ObjectiveWorking key={value.pointLabel} solution={solution} value={value} />
            ))}
          </div>
        </SubSection>
      )}
      {solution.status === "unbounded" && (
        <Callout tone="warning">
          The feasible region is unbounded and Z keeps {objective.type === "max" ? "increasing" : "decreasing"} along it, so
          the corner values do not give the {objective.type === "max" ? "maximum" : "minimum"}. See the final answer.
        </Callout>
      )}
      {solution.region.shape === "unbounded" && solution.objectiveValues.length === 0 && solution.optimalSet?.anchor && (
        <Callout>
          The region has no corners. Z is constant along the boundary lines, so we evaluate it on the best boundary line:
          <MathExpression display latex={`Z = ${latexEvaluation(objective.x1, objective.x2, solution.optimalSet.anchor)}`} />
        </Callout>
      )}
    </>
  );
}

function AnswerStep({ solution }: { solution: LPPSolution }) {
  return <FinalAnswer solution={solution} />;
}

export function StepExplanation({ step, solution }: { step: number; solution: LPPSolution }) {
  switch (step) {
    case 0:
      return <ProblemStep solution={solution} />;
    case 1:
      return <BoundaryStep solution={solution} />;
    case 2:
      return <InterceptsStep solution={solution} />;
    case 3:
      return <GraphStep solution={solution} />;
    case 4:
      return <IntersectionsStep solution={solution} />;
    case 5:
      return <FeasibilityStep solution={solution} />;
    case 6:
      return <ObjectiveStep solution={solution} />;
    default:
      return <AnswerStep solution={solution} />;
  }
}

/** Full-width tables shown under the explanation + graph. `print` expands every collapsible part. */
export function StepDetails({ step, solution, print = false }: { step: number; solution: LPPSolution; print?: boolean }): ReactNode {
  switch (step) {
    case 1:
      return <BoundaryEquationsTable solution={solution} />;
    case 2:
      return <InterceptsTable solution={solution} />;
    case 4:
      return (
        <div className="space-y-5">
          <SubSection title="Candidate points">
            <IntersectionTable solution={solution} />
          </SubSection>
          <SubSection title="Every pair of lines">
            <PairsTable solution={solution} />
          </SubSection>
          {print ? (
            <SubSection title="Working for every pair">
              <div className="grid gap-3 sm:grid-cols-2">
                {solution.pairs.map((pair) => (
                  <PairCard key={`${pair.firstId}-${pair.secondId}`} solution={solution} pair={pair} />
                ))}
              </div>
            </SubSection>
          ) : (
            <details className="group rounded-lg border border-slate-200">
              <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                Show the working for every pair ({solution.pairs.length})
              </summary>
              <div className="grid gap-3 border-t border-slate-100 p-3 md:grid-cols-2">
                {solution.pairs.map((pair) => (
                  <PairCard key={`${pair.firstId}-${pair.secondId}`} solution={solution} pair={pair} />
                ))}
              </div>
            </details>
          )}
        </div>
      );
    case 5:
      return (
        <div className="space-y-5">
          <SubSection title="Feasibility table">
            <FeasibilityTable solution={solution} />
          </SubSection>
          <SubSection title={print ? "Substitution for every point" : "Substitution for a point"}>
            <FeasibilityDetails solution={solution} expandAll={print} />
          </SubSection>
        </div>
      );
    case 6:
      return <ObjectiveTable solution={solution} />;
    default:
      return null;
  }
}
