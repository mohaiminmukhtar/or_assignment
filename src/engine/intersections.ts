import type { BoundaryEquation, PairIntersection, Point } from "../types/lpp";
import { cleanPoint, pointsEqual, tolerance } from "../utils/math";

export type LinePair = Pick<BoundaryEquation, "a" | "b" | "c">;

export interface LineIntersection {
  determinant: number;
  kind: PairIntersection["kind"];
  point: Point | null;
}

/**
 * Solves  a1·x1 + b1·x2 = c1,  a2·x1 + b2·x2 = c2  by Cramer's rule.
 *   D  = a1·b2 − a2·b1
 *   x1 = (c1·b2 − c2·b1) / D
 *   x2 = (a1·c2 − a2·c1) / D
 * When D = 0 the lines are parallel (no point) or coincident (infinitely many points).
 */
export function intersectLines(first: LinePair, second: LinePair): LineIntersection {
  const determinant = first.a * second.b - second.a * first.b;
  const scale = tolerance(first.a * second.b, second.a * first.b);

  if (Math.abs(determinant) <= scale) {
    // Parallel normals: coincident when the right-hand sides are in the same ratio.
    const ac = first.a * second.c - second.a * first.c;
    const bc = first.b * second.c - second.b * first.c;
    const coincident =
      Math.abs(ac) <= tolerance(first.a * second.c, second.a * first.c) &&
      Math.abs(bc) <= tolerance(first.b * second.c, second.b * first.c);
    return { determinant: 0, kind: coincident ? "coincident" : "parallel", point: null };
  }

  const x1 = (first.c * second.b - second.c * first.b) / determinant;
  const x2 = (first.a * second.c - second.a * first.c) / determinant;
  return { determinant, kind: "point", point: cleanPoint({ x1, x2 }) };
}

export interface RawCandidate {
  point: Point;
  equationIds: string[];
}

/**
 * Step 5: intersect every pair of boundary lines (constraints and, when sign
 * restrictions apply, the axes). Returns every pair result plus the unique points.
 */
export function computePairwiseIntersections(lines: BoundaryEquation[]): {
  pairs: PairIntersection[];
  candidates: RawCandidate[];
} {
  const pairs: PairIntersection[] = [];
  const candidates: RawCandidate[] = [];

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const first = lines[i]!;
      const second = lines[j]!;
      const result = intersectLines(first, second);
      pairs.push({
        firstId: first.id,
        secondId: second.id,
        determinant: result.determinant,
        kind: result.kind,
        point: result.point,
        pointLabel: null,
      });

      if (result.point) {
        const existing = candidates.find((c) => pointsEqual(c.point, result.point!));
        if (existing) {
          for (const id of [first.id, second.id]) {
            if (!existing.equationIds.includes(id)) existing.equationIds.push(id);
          }
        } else {
          candidates.push({ point: result.point, equationIds: [first.id, second.id] });
        }
      }
    }
  }

  // List the lines through each point in input order (C1, C2, ..., then the axes).
  const order = new Map(lines.map((line, index) => [line.id, index]));
  for (const candidate of candidates) {
    candidate.equationIds.sort((p, q) => (order.get(p) ?? 0) - (order.get(q) ?? 0));
  }

  return { pairs, candidates };
}
