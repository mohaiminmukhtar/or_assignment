import type { AxisCrossing, BoundaryEquation, HalfPlaneTest, Intercept, Point } from "../types/lpp";
import { clean, dot, isZero } from "../utils/math";
import { satisfies } from "./feasibility";

/**
 * Where the line a·x1 + b·x2 = c meets the axis obtained by setting `zeroed` to 0.
 * Setting x1 = 0 leaves b·x2 = c (the x2-axis); setting x2 = 0 leaves a·x1 = c (the x1-axis).
 */
function axisCrossing(line: BoundaryEquation, zeroed: "x1" | "x2"): AxisCrossing {
  const remaining = zeroed === "x1" ? line.b : line.a;
  if (isZero(remaining)) {
    // 0 = c: either no solution (parallel to this axis) or every point (the line is this axis).
    return isZero(line.c) ? { kind: "coincident" } : { kind: "none" };
  }
  const value = clean(line.c / remaining);
  const point: Point = zeroed === "x1" ? { x1: 0, x2: value } : { x1: value, x2: 0 };
  return { kind: "point", point };
}

/** Step 3: intercepts of one boundary line, handling vertical/horizontal/through-origin lines. */
export function computeIntercept(line: BoundaryEquation): Intercept {
  const onX2Axis = axisCrossing(line, "x1");
  const onX1Axis = axisCrossing(line, "x2");
  const passesThroughOrigin = isZero(line.c);

  // An oblique line through the origin gives the same intercept (0, 0) twice,
  // so pick a second point: x1 = |b| makes x2 = -a·sign(b), avoiding fractions.
  let extraPoint: Point | null = null;
  if (passesThroughOrigin && line.orientation === "oblique") {
    const x1 = Math.abs(line.b);
    extraPoint = { x1: clean(x1), x2: clean((line.c - line.a * x1) / line.b) };
  }

  return {
    equationId: line.id,
    orientation: line.orientation,
    onX2Axis,
    onX1Axis,
    passesThroughOrigin,
    extraPoint,
  };
}

export function computeIntercepts(lines: BoundaryEquation[]): Intercept[] {
  return lines.map(computeIntercept);
}

/** Points used to draw a line: its axis crossings, plus the extra point for lines through the origin. */
export function interceptPlotPoints(intercept: Intercept): Point[] {
  const points: Point[] = [];
  if (intercept.onX2Axis.kind === "point") points.push(intercept.onX2Axis.point);
  if (intercept.onX1Axis.kind === "point") {
    const p = intercept.onX1Axis.point;
    if (!points.some((q) => q.x1 === p.x1 && q.x2 === p.x2)) points.push(p);
  }
  if (intercept.extraPoint) points.push(intercept.extraPoint);
  return points;
}

/**
 * Chooses a test point that does not lie on the line: the origin when possible,
 * otherwise (1, 0) or (0, 1).
 */
export function chooseTestPoint(line: BoundaryEquation): Point {
  const candidates: Point[] = [
    { x1: 0, x2: 0 },
    { x1: 1, x2: 0 },
    { x1: 0, x2: 1 },
  ];
  return candidates.find((p) => !isZero(dot(line.a, line.b, p) - line.c)) ?? { x1: 1, x2: 1 };
}

/**
 * For each inequality, substitute a test point to decide which side of its boundary
 * line is feasible. Equality constraints have no side: only the line itself is feasible.
 */
export function computeHalfPlaneTests(lines: BoundaryEquation[]): HalfPlaneTest[] {
  return lines
    .filter((line) => line.operator !== "=")
    .map((line) => {
      const testPoint = chooseTestPoint(line);
      const lhs = dot(line.a, line.b, testPoint);
      return {
        equationId: line.id,
        testPoint,
        lhs,
        satisfied: satisfies(lhs, line.operator, line.c),
      };
    });
}
