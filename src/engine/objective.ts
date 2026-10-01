import type { Objective, ObjectiveType, Point } from "../types/lpp";
import { approxEqual, clean, dot, tolerance } from "../utils/math";

/** Z = c1·x1 + c2·x2 */
export function evaluateObjective(objective: Objective, point: Point): number {
  return clean(dot(objective.x1, objective.x2, point));
}

/** Rate at which Z changes when moving along direction d: c·d. */
export function objectiveRate(objective: Objective, direction: Point): number {
  return dot(objective.x1, objective.x2, direction);
}

/** True when moving along `direction` strictly improves Z for this objective type. */
export function improves(objective: Objective, direction: Point): boolean {
  const rate = objectiveRate(objective, direction);
  const tol = tolerance(objective.x1, objective.x2);
  return objective.type === "max" ? rate > tol : rate < -tol;
}

/** True when Z is constant along `direction` (c·d = 0). */
export function isLevelDirection(objective: Objective, direction: Point): boolean {
  return Math.abs(objectiveRate(objective, direction)) <= tolerance(objective.x1, objective.x2);
}

/** The best of the given values: smallest for "min", largest for "max". */
export function bestValue(type: ObjectiveType, values: number[]): number | null {
  if (values.length === 0) return null;
  return type === "min" ? Math.min(...values) : Math.max(...values);
}

export function isOptimalValue(value: number, best: number): boolean {
  return approxEqual(value, best);
}
