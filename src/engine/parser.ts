import type {
  BoundaryEquation,
  Constraint,
  LineOrientation,
  LPPProblem,
  Operator,
  ParseResult,
  ProblemDraft,
  ValidationError,
} from "../types/lpp";
import { isZero } from "../utils/math";
import { AXIS_X1_ID, AXIS_X2_ID, constraintLabel } from "../utils/labels";

const DECIMAL = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const FRACTION = /^([+-]?(?:\d+\.?\d*|\.\d+))\s*\/\s*([+-]?(?:\d+\.?\d*|\.\d+))$/;
const OPERATORS: readonly Operator[] = ["<=", ">=", "="];

/** Largest magnitude accepted, to keep floating-point arithmetic meaningful. */
export const MAX_ABS_VALUE = 1e9;

export type NumberParse =
  | { ok: true; value: number }
  | { ok: false; reason: "empty" | "invalid" | "division-by-zero" | "too-large" };

/** Parses "3", "-2.5", ".5", "1e3", "4/3", "-1/2". */
export function parseNumber(raw: string): NumberParse {
  const text = raw.trim().replace(/−/g, "-"); // accept the Unicode minus sign
  if (text === "") return { ok: false, reason: "empty" };

  let value: number;
  const fraction = FRACTION.exec(text);
  if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    if (denominator === 0) return { ok: false, reason: "division-by-zero" };
    value = numerator / denominator;
  } else if (DECIMAL.test(text)) {
    value = Number(text);
  } else {
    return { ok: false, reason: "invalid" };
  }

  if (!Number.isFinite(value)) return { ok: false, reason: "invalid" };
  if (Math.abs(value) > MAX_ABS_VALUE) return { ok: false, reason: "too-large" };
  return { ok: true, value: value === 0 ? 0 : value };
}

function numberError(reason: Exclude<NumberParse, { ok: true }>["reason"], what: string): string {
  switch (reason) {
    case "empty":
      return `${what} is missing.`;
    case "invalid":
      return `${what} is not a valid number. Use forms like 3, -2.5 or 4/3.`;
    case "division-by-zero":
      return `${what} divides by zero.`;
    case "too-large":
      return `${what} is too large (limit ±${MAX_ABS_VALUE.toExponential(0)}).`;
  }
}

/**
 * Reads a coefficient. A blank coefficient means the variable is absent,
 * so "x1 <= 3" is entered as [1] x1 + [ ] x2 <= [3] and becomes 1x1 + 0x2 <= 3.
 */
function readCoefficient(
  raw: string,
  field: string,
  what: string,
  errors: ValidationError[],
): number {
  if (raw.trim() === "") return 0;
  const parsed = parseNumber(raw);
  if (parsed.ok) return parsed.value;
  errors.push({ field, message: numberError(parsed.reason, what) });
  return 0;
}

/** Validates the draft typed by the student and converts it into a numeric problem. */
export function parseProblem(draft: ProblemDraft): ParseResult {
  const errors: ValidationError[] = [];

  if (draft.objectiveType !== "min" && draft.objectiveType !== "max") {
    errors.push({ field: "objective.type", message: "Choose Minimize or Maximize." });
  }
  const c1 = readCoefficient(draft.c1, "objective.c1", "The x₁ coefficient of Z", errors);
  const c2 = readCoefficient(draft.c2, "objective.c2", "The x₂ coefficient of Z", errors);
  if (!errors.some((e) => e.field.startsWith("objective.")) && isZero(c1) && isZero(c2)) {
    errors.push({
      field: "objective",
      message: "The objective function needs at least one non-zero coefficient (Z = 0x₁ + 0x₂ is constant).",
    });
  }

  if (draft.constraints.length === 0) {
    errors.push({ field: "constraints", message: "Add at least one constraint." });
  }

  const constraints: Constraint[] = draft.constraints.map((row, index) => {
    const name = `Constraint ${index + 1}`;
    const prefix = `constraint.${row.id}`;
    const before = errors.length;
    const x1 = readCoefficient(row.x1, `${prefix}.x1`, `${name}: the x₁ coefficient`, errors);
    const x2 = readCoefficient(row.x2, `${prefix}.x2`, `${name}: the x₂ coefficient`, errors);

    let rhs = 0;
    const parsedRhs = parseNumber(row.rhs);
    if (parsedRhs.ok) rhs = parsedRhs.value;
    else errors.push({ field: `${prefix}.rhs`, message: numberError(parsedRhs.reason, `${name}: the right-hand side`) });

    if (!OPERATORS.includes(row.operator)) {
      errors.push({ field: `${prefix}.operator`, message: `${name}: choose ≤, ≥ or =.` });
    }

    if (errors.length === before && isZero(x1) && isZero(x2)) {
      errors.push({
        field: prefix,
        message: `${name}: both coefficients are zero, so 0x₁ + 0x₂ ${row.operator} ${row.rhs.trim()} contains no variable and has no boundary line. Enter at least one non-zero coefficient.`,
      });
    }
    return { id: row.id, x1, x2, operator: row.operator, rhs };
  });

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    problem: {
      objective: { type: draft.objectiveType, x1: c1, x2: c2 },
      constraints,
      restrictions: { ...draft.restrictions },
    },
  };
}

export function lineOrientation(a: number, b: number): LineOrientation {
  if (isZero(b)) return "vertical";
  if (isZero(a)) return "horizontal";
  return "oblique";
}

/** Step 2: replace each inequality sign by "=" to obtain the boundary line. */
export function buildBoundaryEquations(problem: LPPProblem): BoundaryEquation[] {
  return problem.constraints.map((constraint, index) => ({
    id: constraintLabel(index),
    label: constraintLabel(index),
    source: "constraint",
    constraintIndex: index,
    a: constraint.x1,
    b: constraint.x2,
    c: constraint.rhs,
    operator: constraint.operator,
    orientation: lineOrientation(constraint.x1, constraint.x2),
  }));
}

/** Axis lines contributed by sign restrictions (x1 >= 0 gives the line x1 = 0, etc.). */
export function buildAxisEquations(problem: LPPProblem): BoundaryEquation[] {
  const axes: BoundaryEquation[] = [];
  if (problem.restrictions.x1 !== "free") {
    axes.push({
      id: AXIS_X1_ID,
      label: "x₁ = 0",
      source: "axis",
      constraintIndex: null,
      a: 1,
      b: 0,
      c: 0,
      operator: ">=",
      orientation: "vertical",
    });
  }
  if (problem.restrictions.x2 !== "free") {
    axes.push({
      id: AXIS_X2_ID,
      label: "x₂ = 0",
      source: "axis",
      constraintIndex: null,
      a: 0,
      b: 1,
      c: 0,
      operator: ">=",
      orientation: "horizontal",
    });
  }
  return axes;
}
