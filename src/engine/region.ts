import type { BoundaryEquation, LPPProblem, Operator, Point } from "../types/lpp";
import { approxLessOrEqual, dot, isZero, normalize, pointsEqual, tolerance } from "../utils/math";
import { satisfies } from "./feasibility";

/**
 * Directions d along which the feasible region continues forever
 * (its recession cone): a·d ≤ 0 for "≤", a·d ≥ 0 for "≥", a·d = 0 for "=",
 * and d ≥ 0 for each sign-restricted variable.
 *
 * In two dimensions every extreme direction of that cone is perpendicular to some
 * constraint normal (or is an axis direction), so testing those candidates is exhaustive.
 * Returns an empty array when the cone is {0}, i.e. a non-empty region is bounded.
 */
export function recessionDirections(problem: LPPProblem): Point[] {
  const conditions: { a: number; b: number; operator: Operator }[] = problem.constraints.map((c) => ({
    a: c.x1,
    b: c.x2,
    operator: c.operator,
  }));
  if (problem.restrictions.x1 !== "free") conditions.push({ a: 1, b: 0, operator: ">=" });
  if (problem.restrictions.x2 !== "free") conditions.push({ a: 0, b: 1, operator: ">=" });

  const candidates: Point[] = [
    { x1: 1, x2: 0 },
    { x1: -1, x2: 0 },
    { x1: 0, x2: 1 },
    { x1: 0, x2: -1 },
  ];
  for (const { a, b } of conditions) {
    const perpendicular = normalize({ x1: -b, x2: a });
    candidates.push(perpendicular, { x1: -perpendicular.x1, x2: -perpendicular.x2 });
  }

  const directions: Point[] = [];
  for (const d of candidates) {
    const inCone = conditions.every(({ a, b, operator }) => {
      const rate = dot(a, b, d) / Math.hypot(a, b);
      // Unit vectors: an absolute tolerance is appropriate here.
      if (operator === "<=") return rate <= 1e-12;
      if (operator === ">=") return rate >= -1e-12;
      return Math.abs(rate) <= 1e-12;
    });
    if (inCone && !directions.some((existing) => pointsEqual(existing, d))) directions.push(d);
  }
  return directions;
}

/** Rank of the set of boundary-line normals: 2 if any two are non-parallel, else 1. */
export function normalsRank(lines: BoundaryEquation[]): 1 | 2 {
  const first = lines[0];
  if (!first) return 1;
  for (const line of lines) {
    const cross = first.a * line.b - first.b * line.a;
    if (Math.abs(cross) > tolerance(first.a * line.b, first.b * line.a)) return 2;
  }
  return 1;
}

export interface ParallelRegion {
  feasible: boolean;
  /** Common normal n of every boundary line; each constraint reads t op c' with t = n·x. */
  normal: Point;
  /** Feasible values of t = n·x (may be infinite). */
  low: number;
  high: number;
}

/**
 * When every boundary line is parallel the region has no vertex: it is a strip,
 * a half-plane or a single line. Each constraint is rewritten as a bound on
 * t = n·x and the bounds are intersected.
 */
export function analyzeParallelRegion(lines: BoundaryEquation[]): ParallelRegion {
  const first = lines[0]!;
  const normal = { x1: first.a, x2: first.b };
  let low = -Infinity;
  let high = Infinity;

  for (const line of lines) {
    // line normal = k·n, so a·x1 + b·x2 = k·t.
    const k = isZero(normal.x1) ? line.b / normal.x2 : line.a / normal.x1;
    const bound = line.c / k;
    let operator = line.operator;
    if (k < 0 && operator !== "=") operator = operator === "<=" ? ">=" : "<=";
    if (operator === "<=" || operator === "=") high = Math.min(high, bound);
    if (operator === ">=" || operator === "=") low = Math.max(low, bound);
  }

  return { feasible: approxLessOrEqual(low, high), normal, low, high };
}

/** Point on the line n·x = t closest to the origin. */
export function pointOnParallelLine(normal: Point, t: number): Point {
  const squared = normal.x1 * normal.x1 + normal.x2 * normal.x2;
  return { x1: (t * normal.x1) / squared, x2: (t * normal.x2) / squared };
}

/** A representative value of t inside [low, high], preferring 0 and finite midpoints. */
export function representativeT(low: number, high: number): number {
  if (Number.isFinite(low) && Number.isFinite(high)) return (low + high) / 2;
  if (Number.isFinite(low)) return Math.max(low, 0) + (low >= 0 ? 1 : 0);
  if (Number.isFinite(high)) return Math.min(high, 0) - (high <= 0 ? 1 : 0);
  return 0;
}

/**
 * Orders vertices counter-clockwise around their centroid, starting from the
 * vertex with the smallest x1 (then smallest x2), so labels walk around the region.
 */
export function orderCounterClockwise<T extends { point: Point }>(items: T[]): T[] {
  if (items.length <= 1) return [...items];
  const cx = items.reduce((sum, item) => sum + item.point.x1, 0) / items.length;
  const cy = items.reduce((sum, item) => sum + item.point.x2, 0) / items.length;
  const start = [...items].sort((p, q) => p.point.x1 - q.point.x1 || p.point.x2 - q.point.x2)[0]!;
  const angle = (item: T) => Math.atan2(item.point.x2 - cy, item.point.x1 - cx);
  const startAngle = angle(start);
  const turn = (item: T) => {
    const delta = angle(item) - startAngle;
    return delta < -1e-12 ? delta + 2 * Math.PI : delta;
  };
  return [...items].sort((p, q) => {
    if (p === start) return -1;
    if (q === start) return 1;
    return turn(p) - turn(q) || p.point.x1 - q.point.x1;
  });
}

/** Whether a point satisfies a single linear condition (used by the graph clipper). */
export function satisfiesLine(line: Pick<BoundaryEquation, "a" | "b" | "c" | "operator">, point: Point): boolean {
  return satisfies(dot(line.a, line.b, point), line.operator, line.c);
}
