import type { ConstraintDraft, ProblemDraft } from "../types/lpp";

let nextId = 0;
export function newConstraintId(): string {
  nextId += 1;
  return `c${Date.now().toString(36)}${nextId}`;
}

export function emptyConstraint(): ConstraintDraft {
  return { id: newConstraintId(), x1: "", x2: "", operator: "<=", rhs: "" };
}

export function emptyDraft(): ProblemDraft {
  return {
    objectiveType: "max",
    c1: "",
    c2: "",
    constraints: [emptyConstraint()],
    restrictions: { x1: "nonNegative", x2: "nonNegative" },
  };
}

function row(x1: string, x2: string, operator: ConstraintDraft["operator"], rhs: string): ConstraintDraft {
  return { id: newConstraintId(), x1, x2, operator, rhs };
}

/** The reference example: Minimize Z = 2x1 + 3x2. Blank coefficients mean 0. */
export function exampleDraft(): ProblemDraft {
  return {
    objectiveType: "min",
    c1: "2",
    c2: "3",
    constraints: [
      row("1", "1", "=", "4"),
      row("6", "2", ">=", "8"),
      row("1", "5", ">=", "4"),
      row("1", "", "<=", "3"),
      row("", "1", "<=", "3"),
    ],
    restrictions: { x1: "nonNegative", x2: "nonNegative" },
  };
}
