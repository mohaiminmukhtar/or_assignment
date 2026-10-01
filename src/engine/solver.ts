import type {
  CandidatePoint,
  FeasibleRegion,
  LPPProblem,
  LPPSolution,
  ObjectiveValue,
  OptimalSet,
  Point,
  RegionShape,
  SolutionStatus,
} from "../types/lpp";
import { clean, cleanPoint, isZero, normalize, pointsEqual } from "../utils/math";
import { indexToLabel } from "../utils/labels";
import { buildAxisEquations, buildBoundaryEquations } from "./parser";
import { computeHalfPlaneTests, computeIntercepts } from "./intercepts";
import { computePairwiseIntersections } from "./intersections";
import { checkPoint, hasStrictRestriction, isFeasible } from "./feasibility";
import { bestValue, evaluateObjective, improves, isLevelDirection, isOptimalValue } from "./objective";
import {
  analyzeParallelRegion,
  normalsRank,
  orderCounterClockwise,
  pointOnParallelLine,
  recessionDirections,
  representativeT,
} from "./region";

function regionShape(vertexCount: number, bounded: boolean): RegionShape {
  if (!bounded) return "unbounded";
  if (vertexCount === 0) return "empty";
  if (vertexCount === 1) return "point";
  if (vertexCount === 2) return "segment";
  return "polygon";
}

function add(p: Point, d: Point, scale = 1): Point {
  return { x1: p.x1 + d.x1 * scale, x2: p.x2 + d.x2 * scale };
}

/**
 * Whether the region still contains a point satisfying the strict "> 0" restrictions.
 * The region is convex, so it is enough to find one generator with x1 > 0 (if x1 is strict)
 * and one with x2 > 0 (if x2 is strict): their midpoint then satisfies both.
 */
function strictInteriorExists(problem: LPPProblem, generators: Point[]): boolean {
  const inRegion = generators.filter((p) => isFeasible(p, problem, true));
  const needs = (["x1", "x2"] as const).filter((v) => problem.restrictions[v] === "positive");
  return needs.every((v) => inRegion.some((p) => p[v] > 1e-9));
}

/**
 * Solves a two-variable LPP by the graphical (corner-point) method and returns every
 * intermediate result needed to explain the solution step by step.
 */
export function solveLPP(problem: LPPProblem): LPPSolution {
  const { objective } = problem;
  const strict = hasStrictRestriction(problem);
  const notes: string[] = [];

  // Steps 2–3: boundary lines, intercepts, side tests.
  const boundaryEquations = buildBoundaryEquations(problem);
  const axisEquations = buildAxisEquations(problem);
  const allLines = [...boundaryEquations, ...axisEquations];
  const intercepts = computeIntercepts(boundaryEquations);
  const halfPlaneTests = computeHalfPlaneTests(boundaryEquations);

  // Step 5: every pairwise intersection, de-duplicated.
  const { pairs, candidates } = computePairwiseIntersections(allLines);

  // Step 6: test each candidate against every constraint. A "region vertex" is a corner
  // of the closed region (strict "> 0" relaxed to ">= 0").
  const tested = candidates.map((candidate) => {
    const checks = checkPoint(candidate.point, problem);
    return {
      point: candidate.point,
      equationIds: candidate.equationIds,
      checks,
      feasible: checks.every((c) => c.satisfied),
      isRegionVertex: isFeasible(candidate.point, problem, true),
    };
  });

  // Labels: corners of the feasible region first (walking around it), then all other
  // candidates ordered by x1, then x2. The same labels are used in every table and the graph.
  const vertices = orderCounterClockwise(tested.filter((c) => c.isRegionVertex));
  const others = tested
    .filter((c) => !c.isRegionVertex)
    .sort((p, q) => p.point.x1 - q.point.x1 || p.point.x2 - q.point.x2);
  const intersections: CandidatePoint[] = [...vertices, ...others].map((c, index) => ({
    ...c,
    label: indexToLabel(index),
  }));
  for (const pair of pairs) {
    if (pair.point) {
      pair.pointLabel = intersections.find((c) => pointsEqual(c.point, pair.point!))?.label ?? null;
    }
  }

  const regionVertices = intersections.filter((c) => c.isRegionVertex);
  const feasiblePoints = intersections.filter((c) => c.feasible);
  const recession = recessionDirections(problem);
  const rank = normalsRank(allLines);

  // Step 7: Z at every corner of the region.
  const objectiveValues: ObjectiveValue[] = regionVertices.map((c) => ({
    pointLabel: c.label,
    point: c.point,
    value: evaluateObjective(objective, c.point),
    isOptimal: false,
    attainable: c.feasible,
  }));

  let status: SolutionStatus;
  let optimalValue: number | null = null;
  let optimalSet: OptimalSet | null = null;
  let improvingDirection: Point | null = null;
  let region: FeasibleRegion;

  if (rank === 1) {
    // ---- Every boundary line is parallel: no corner points exist. ----
    const parallel = analyzeParallelRegion(allLines);
    notes.push(
      "All boundary lines are parallel, so the lines never cross and the feasible region has no corner points.",
    );
    const along = normalize({ x1: -parallel.normal.x2, x2: parallel.normal.x1 });
    const representative = parallel.feasible
      ? cleanPoint(pointOnParallelLine(parallel.normal, representativeT(parallel.low, parallel.high)))
      : null;
    region = {
      shape: parallel.feasible ? "unbounded" : "empty",
      bounded: false,
      recessionDirections: parallel.feasible ? recession : [],
      representativePoint: representative,
    };

    const finiteTs = [parallel.low, parallel.high, (parallel.low + parallel.high) / 2, parallel.low + 1, parallel.high - 1]
      .filter((t) => Number.isFinite(t) && t >= parallel.low - 1e-9 && t <= parallel.high + 1e-9);
    const generators = finiteTs.flatMap((t) => {
      const base = pointOnParallelLine(parallel.normal, t);
      return [base, add(base, along), add(base, along, -1)];
    });

    if (!parallel.feasible || (strict && !strictInteriorExists(problem, generators))) {
      status = "infeasible";
      region = { ...region, shape: "empty", recessionDirections: [], representativePoint: null };
    } else {
      const unboundedDirection = recession.find((d) => improves(objective, d));
      if (unboundedDirection) {
        status = "unbounded";
        improvingDirection = unboundedDirection;
      } else {
        // Z = λ·t with c = λ·n; the optimum is the whole boundary line t = t*.
        const lambda = isZero(parallel.normal.x1)
          ? objective.x2 / parallel.normal.x2
          : objective.x1 / parallel.normal.x1;
        const wantsHigh = (objective.type === "max") === lambda > 0;
        const tStar = wantsHigh ? parallel.high : parallel.low;
        const anchor = cleanPoint(pointOnParallelLine(parallel.normal, tStar));
        optimalValue = evaluateObjective(objective, anchor);
        optimalSet = { pointLabels: [], excludedLabels: [], direction: along, anchor };
        status = isFeasible(anchor, problem) ? "multiple" : "unattained";
      }
    }
  } else if (regionVertices.length === 0) {
    // ---- Non-parallel lines, but no candidate point satisfies every constraint. ----
    status = "infeasible";
    region = { shape: "empty", bounded: true, recessionDirections: [], representativePoint: null };
  } else {
    const bounded = recession.length === 0;
    region = {
      shape: regionShape(regionVertices.length, bounded),
      bounded,
      recessionDirections: recession,
      representativePoint: null,
    };

    const generators = regionVertices.flatMap((v) => [v.point, ...recession.map((d) => add(v.point, d))]);
    if (regionVertices.length >= 2) {
      generators.push({
        x1: regionVertices.reduce((s, v) => s + v.point.x1, 0) / regionVertices.length,
        x2: regionVertices.reduce((s, v) => s + v.point.x2, 0) / regionVertices.length,
      });
    }

    if (strict && !strictInteriorExists(problem, generators)) {
      status = "infeasible";
      notes.push(
        "Every point of the region lies on an axis, but a strict restriction (> 0) excludes the axes, so no point is feasible.",
      );
    } else {
      const unboundedDirection = recession.find((d) => improves(objective, d));
      if (unboundedDirection) {
        // Moving along this direction stays feasible forever and keeps improving Z.
        status = "unbounded";
        improvingDirection = unboundedDirection;
      } else {
        const best = bestValue(objective.type, objectiveValues.map((v) => v.value))!;
        const optimalVertices = regionVertices.filter((v) =>
          isOptimalValue(evaluateObjective(objective, v.point), best),
        );
        const levelDirection = recession.find((d) => isLevelDirection(objective, d)) ?? null;
        const excluded = optimalVertices.filter((v) => !v.feasible);
        const attainableVertices = optimalVertices.filter((v) => v.feasible);

        optimalValue = clean(best);
        optimalSet = {
          pointLabels: optimalVertices.map((v) => v.label),
          excludedLabels: excluded.map((v) => v.label),
          direction: levelDirection,
          anchor: null,
        };

        const infinitelyMany = optimalVertices.length >= 2 || levelDirection !== null;
        if (attainableVertices.length > 0) {
          status = infinitelyMany ? "multiple" : "optimal";
        } else {
          // Every optimal corner is excluded by "> 0"; points strictly between them may still qualify.
          const between: Point[] = [];
          if (optimalVertices.length >= 2) {
            between.push({
              x1: (optimalVertices[0]!.point.x1 + optimalVertices[1]!.point.x1) / 2,
              x2: (optimalVertices[0]!.point.x2 + optimalVertices[1]!.point.x2) / 2,
            });
          }
          if (levelDirection) between.push(add(optimalVertices[0]!.point, levelDirection));
          status = between.some((p) => isFeasible(p, problem)) ? "multiple" : "unattained";
        }

        for (const value of objectiveValues) {
          value.isOptimal = value.attainable && optimalSet.pointLabels.includes(value.pointLabel);
        }
      }
    }
  }

  if (strict && status !== "infeasible" && intersections.some((c) => c.isRegionVertex && !c.feasible)) {
    notes.push(
      "Some corners of the region lie on an axis. They are excluded because the problem requires a strictly positive variable (> 0).",
    );
  }

  const optimalPoints =
    status === "optimal" || status === "multiple"
      ? intersections.filter((c) => c.feasible && optimalSet?.pointLabels.includes(c.label))
      : [];

  return {
    problem,
    boundaryEquations,
    axisEquations,
    intercepts,
    halfPlaneTests,
    pairs,
    intersections,
    feasiblePoints,
    objectiveValues,
    optimalPoints,
    optimalValue: status === "unbounded" || status === "infeasible" ? null : optimalValue,
    optimalSet: status === "unbounded" || status === "infeasible" ? null : optimalSet,
    improvingDirection,
    status,
    region,
    notes,
  };
}
