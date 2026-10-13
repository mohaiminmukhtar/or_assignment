import type { BoundaryEquation, CandidatePoint, LPPProblem, LPPSolution, Operator, Point } from "../types/lpp";
import { dot, isZero, pointsEqual, tolerance } from "../utils/math";
import { satisfies } from "./feasibility";
import { orderCounterClockwise } from "./region";

export interface Box {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/** Share of the data span added around the important points. */
const PADDING_RATIO = 0.15;
/** Extra padding when the region is unbounded, so the open side is visible. */
const UNBOUNDED_PADDING_RATIO = 0.8;
/** Ticks per axis used to pick a rounding step for the view bounds. */
const TARGET_TICKS = 8;

/** 1, 2, 2.5 or 5 times a power of ten, at least `raw`. */
export function niceStep(raw: number): number {
  if (raw <= 0 || !Number.isFinite(raw)) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * power;
}

function axisRange(values: number[], ratio: number): [number, number] {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const step = niceStep(span / TARGET_TICKS);
  const pad = span * ratio;
  // When everything is >= 0, show only a sliver of the negative side so the axis is visible.
  const low = min < 0 ? Math.floor((min - pad) / step) * step : -span * 0.06;
  const high = max > 0 ? Math.ceil((max + pad) / step) * step : step;
  return [low, high];
}

/**
 * View window computed from the problem itself: intercepts, candidate points, region corners
 * and constants. Points outside a sign restriction (e.g. x1 < 0 when x1 >= 0) are ignored so
 * far-away infeasible intersections do not shrink the important region.
 */
export function computeGraphBounds(solution: LPPSolution): Box {
  const { problem } = solution;
  const points: Point[] = [{ x1: 0, x2: 0 }];
  for (const intercept of solution.intercepts) {
    if (intercept.onX1Axis.kind === "point") points.push(intercept.onX1Axis.point);
    if (intercept.onX2Axis.kind === "point") points.push(intercept.onX2Axis.point);
    if (intercept.extraPoint) points.push(intercept.extraPoint);
  }
  for (const candidate of solution.intersections) points.push(candidate.point);
  if (solution.region.representativePoint) points.push(solution.region.representativePoint);
  if (solution.optimalSet?.anchor) points.push(solution.optimalSet.anchor);

  const relevant = points.filter(
    (p) =>
      (problem.restrictions.x1 === "free" || p.x1 >= -1e-9) &&
      (problem.restrictions.x2 === "free" || p.x2 >= -1e-9),
  );
  // Region corners always stay in view, whatever happens above.
  for (const v of solution.intersections) if (v.isRegionVertex) relevant.push(v.point);

  const ratio = solution.region.bounded ? PADDING_RATIO : UNBOUNDED_PADDING_RATIO;
  const [xMin, xMax] = axisRange(relevant.map((p) => p.x1), ratio);
  const [yMin, yMax] = axisRange(relevant.map((p) => p.x2), ratio);
  return { xMin, xMax, yMin, yMax };
}

/** Grows a box around its centre; used so lines and regions continue when panning. */
export function expandBox(box: Box, factor: number): Box {
  const dx = (box.xMax - box.xMin) * factor;
  const dy = (box.yMax - box.yMin) * factor;
  return { xMin: box.xMin - dx, xMax: box.xMax + dx, yMin: box.yMin - dy, yMax: box.yMax + dy };
}

export function boxPolygon(box: Box): Point[] {
  return [
    { x1: box.xMin, x2: box.yMin },
    { x1: box.xMax, x2: box.yMin },
    { x1: box.xMax, x2: box.yMax },
    { x1: box.xMin, x2: box.yMax },
  ];
}

/**
 * Sutherland–Hodgman clip of a convex polygon to the half-plane a·x1 + b·x2 (op) c.
 * "=" keeps only the part on the line (the result may be a degenerate polygon).
 */
export function clipPolygon(polygon: Point[], a: number, b: number, operator: Operator, c: number): Point[] {
  if (operator === "=") {
    return clipPolygon(clipPolygon(polygon, a, b, "<=", c), a, b, ">=", c);
  }
  // Rewrite as s(x) = sign·(a·x − c) <= 0.
  const sign = operator === "<=" ? 1 : -1;
  const s = (p: Point) => sign * (dot(a, b, p) - c);
  const tol = tolerance(c, Math.abs(a) + Math.abs(b)) * 100;

  const result: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i]!;
    const next = polygon[(i + 1) % polygon.length]!;
    const sc = s(current);
    const sn = s(next);
    const currentInside = sc <= tol;
    const nextInside = sn <= tol;
    if (currentInside) result.push(current);
    if (currentInside !== nextInside) {
      const t = sc / (sc - sn);
      result.push({ x1: current.x1 + t * (next.x1 - current.x1), x2: current.x2 + t * (next.x2 - current.x2) });
    }
  }
  return result.filter((p, i) => i === 0 || !pointsEqual(p, result[i - 1]!));
}

function polygonArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const q = points[(i + 1) % points.length]!;
    area += p.x1 * q.x2 - q.x1 * p.x2;
  }
  return Math.abs(area) / 2;
}

function farthestPair(points: Point[]): [Point, Point] {
  let best: [Point, Point] = [points[0]!, points[0]!];
  let bestDistance = -1;
  for (const p of points) {
    for (const q of points) {
      const d = Math.hypot(p.x1 - q.x1, p.x2 - q.x2);
      if (d > bestDistance) {
        bestDistance = d;
        best = [p, q];
      }
    }
  }
  return best;
}

export type RegionGeometry =
  | { kind: "polygon"; points: Point[] }
  | { kind: "segment"; points: [Point, Point] }
  | { kind: "point"; points: [Point] }
  | { kind: "none" };

/**
 * The combined feasible region (every constraint at once) inside `box`, obtained by
 * clipping the box successively by each constraint and sign restriction.
 * Strict "> 0" restrictions are drawn as their closure; excluded boundary points are
 * marked separately on the graph.
 */
export function feasibleRegionGeometry(
  problem: LPPProblem,
  box: Box,
  options: { inequalitiesOnly?: boolean } = {},
): RegionGeometry {
  let polygon = boxPolygon(box);
  for (const constraint of problem.constraints) {
    if (options.inequalitiesOnly && constraint.operator === "=") continue;
    polygon = clipPolygon(polygon, constraint.x1, constraint.x2, constraint.operator, constraint.rhs);
    if (polygon.length === 0) return { kind: "none" };
  }
  if (problem.restrictions.x1 !== "free") polygon = clipPolygon(polygon, 1, 0, ">=", 0);
  if (problem.restrictions.x2 !== "free") polygon = clipPolygon(polygon, 0, 1, ">=", 0);

  const unique = polygon.filter((p, i) => polygon.findIndex((q) => pointsEqual(p, q)) === i);
  if (unique.length === 0) return { kind: "none" };
  if (unique.length === 1) return { kind: "point", points: [unique[0]!] };

  const boxArea = (box.xMax - box.xMin) * (box.yMax - box.yMin);
  if (unique.length >= 3 && polygonArea(unique) > boxArea * 1e-9) return { kind: "polygon", points: unique };
  const [p, q] = farthestPair(unique);
  return pointsEqual(p, q) ? { kind: "point", points: [p] } : { kind: "segment", points: [p, q] };
}

export function hasEqualityConstraint(problem: LPPProblem): boolean {
  return problem.constraints.some((c) => c.operator === "=");
}

/**
 * Corners of the region allowed by the inequality constraints alone (equalities ignored):
 * candidate points that satisfy every ≤ / ≥ constraint and sign restriction, and lie on at
 * least two inequality boundaries (or axes). Used to describe the shaded area when an
 * equality constraint makes the true feasible region a segment or point inside it.
 * Ordered counter-clockwise, like the region vertices.
 */
export function inequalityRegionCorners(solution: LPPSolution): CandidatePoint[] {
  const equalityIds = new Set(solution.boundaryEquations.filter((l) => l.operator === "=").map((l) => l.id));
  const corners = solution.intersections.filter(
    (candidate) =>
      candidate.checks.every((check) =>
        check.operator === "=" ? true : satisfies(check.lhs, check.operator === ">" ? ">=" : check.operator, check.rhs),
      ) && candidate.equationIds.filter((id) => !equalityIds.has(id)).length >= 2,
  );
  return orderCounterClockwise(corners);
}

/** The half-plane of a single inequality inside `box` (for optional per-constraint shading). */
export function halfPlanePolygon(line: BoundaryEquation, box: Box): Point[] {
  return clipPolygon(boxPolygon(box), line.a, line.b, line.operator, line.c);
}

/** The part of the line a·x1 + b·x2 = c inside `box`, ordered left-to-right (bottom-to-top if vertical). */
export function lineSegmentInBox(line: Pick<BoundaryEquation, "a" | "b" | "c">, box: Box): [Point, Point] | null {
  const hits: Point[] = [];
  if (!isZero(line.b)) {
    for (const x1 of [box.xMin, box.xMax]) hits.push({ x1, x2: (line.c - line.a * x1) / line.b });
  }
  if (!isZero(line.a)) {
    for (const x2 of [box.yMin, box.yMax]) hits.push({ x1: (line.c - line.b * x2) / line.a, x2 });
  }
  const inside = hits.filter(
    (p) =>
      p.x1 >= box.xMin - 1e-9 && p.x1 <= box.xMax + 1e-9 && p.x2 >= box.yMin - 1e-9 && p.x2 <= box.yMax + 1e-9,
  );
  if (inside.length < 2) return null;
  const [p, q] = farthestPair(inside);
  if (pointsEqual(p, q)) return null;
  return p.x1 < q.x1 || (p.x1 === q.x1 && p.x2 < q.x2) ? [p, q] : [q, p];
}

/**
 * Where to print a line's label inside the view: staggered along the visible
 * segment so labels of lines meeting at a common point do not overlap.
 */
export function lineLabelPosition(line: BoundaryEquation, view: Box, index: number): Point | null {
  const segment = lineSegmentInBox(line, view);
  if (!segment) return null;
  const [p, q] = segment;
  const fractions = [0.86, 0.68, 0.94, 0.5, 0.77, 0.6];
  const t = fractions[index % fractions.length]!;
  return { x1: p.x1 + t * (q.x1 - p.x1), x2: p.x2 + t * (q.x2 - p.x2) };
}
