import type { CheckOperator, ConstraintCheck, LPPProblem, Point, Variable } from "../types/lpp";
import { approxEqual, approxGreater, approxGreaterOrEqual, approxLessOrEqual, dot } from "../utils/math";
import { constraintLabel } from "../utils/labels";

/** Tolerance-aware comparison lhs (op) rhs. Never uses raw floating-point equality. */
export function satisfies(lhs: number, operator: CheckOperator, rhs: number): boolean {
  switch (operator) {
    case "<=":
      return approxLessOrEqual(lhs, rhs);
    case ">=":
      return approxGreaterOrEqual(lhs, rhs);
    case "=":
      return approxEqual(lhs, rhs);
    case ">":
      return approxGreater(lhs, rhs);
  }
}

/**
 * Step 6: substitute the point into every original constraint, then into every
 * sign restriction. With `relaxStrict`, x > 0 is treated as x >= 0 (closure of the region).
 */
export function checkPoint(point: Point, problem: LPPProblem, relaxStrict = false): ConstraintCheck[] {
  const checks: ConstraintCheck[] = problem.constraints.map((constraint, index) => {
    const lhs = dot(constraint.x1, constraint.x2, point);
    return {
      targetId: constraintLabel(index),
      a: constraint.x1,
      b: constraint.x2,
      operator: constraint.operator,
      rhs: constraint.rhs,
      lhs,
      satisfied: satisfies(lhs, constraint.operator, constraint.rhs),
    };
  });

  const variables: Variable[] = ["x1", "x2"];
  for (const variable of variables) {
    const restriction = problem.restrictions[variable];
    if (restriction === "free") continue;
    const operator: CheckOperator = restriction === "positive" && !relaxStrict ? ">" : ">=";
    const lhs = point[variable];
    checks.push({
      targetId: variable,
      a: variable === "x1" ? 1 : 0,
      b: variable === "x2" ? 1 : 0,
      operator,
      rhs: 0,
      lhs,
      satisfied: satisfies(lhs, operator, 0),
    });
  }
  return checks;
}

export function isFeasible(point: Point, problem: LPPProblem, relaxStrict = false): boolean {
  return checkPoint(point, problem, relaxStrict).every((check) => check.satisfied);
}

export function hasStrictRestriction(problem: LPPProblem): boolean {
  return problem.restrictions.x1 === "positive" || problem.restrictions.x2 === "positive";
}
