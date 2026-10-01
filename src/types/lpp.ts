// ---------------------------------------------------------------------------
// Problem definition
// ---------------------------------------------------------------------------

export type Operator = "<=" | ">=" | "=";

/** Operators that can appear in a feasibility check (strict ">" comes from x > 0). */
export type CheckOperator = Operator | ">";

export type ObjectiveType = "min" | "max";

/**
 * Sign restriction on a decision variable.
 * - nonNegative: x >= 0 (axis points allowed)
 * - positive:    x > 0  (axis points excluded)
 * - free:        no restriction
 */
export type VariableRestriction = "nonNegative" | "positive" | "free";

export type Variable = "x1" | "x2";

export interface Objective {
  type: ObjectiveType;
  x1: number;
  x2: number;
}

export interface Constraint {
  id: string;
  x1: number;
  x2: number;
  operator: Operator;
  rhs: number;
}

export interface LPPProblem {
  objective: Objective;
  constraints: Constraint[];
  restrictions: Record<Variable, VariableRestriction>;
}

// ---------------------------------------------------------------------------
// Draft (form) model: raw strings as typed by the student
// ---------------------------------------------------------------------------

export interface ConstraintDraft {
  id: string;
  x1: string;
  x2: string;
  operator: Operator;
  rhs: string;
}

export interface ProblemDraft {
  objectiveType: ObjectiveType;
  c1: string;
  c2: string;
  constraints: ConstraintDraft[];
  restrictions: Record<Variable, VariableRestriction>;
}

export interface ValidationError {
  /** Field key, e.g. "objective.c1", "constraint.<id>.rhs", "constraint.<id>", "constraints". */
  field: string;
  message: string;
}

export type ParseResult =
  | { ok: true; problem: LPPProblem }
  | { ok: false; errors: ValidationError[] };

// ---------------------------------------------------------------------------
// Solution model
// ---------------------------------------------------------------------------

export interface Point {
  x1: number;
  x2: number;
}

export type LineOrientation = "vertical" | "horizontal" | "oblique";

/** A boundary line a·x1 + b·x2 = c. */
export interface BoundaryEquation {
  /** Stable id: "C1", "C2", ... for constraints, "AX1"/"AX2" for the axes x1 = 0 / x2 = 0. */
  id: string;
  /** Short label shown in tables and on the graph. */
  label: string;
  source: "constraint" | "axis";
  /** Zero-based index into problem.constraints, or null for axis lines. */
  constraintIndex: number | null;
  a: number;
  b: number;
  c: number;
  /** Operator of the original constraint (axis lines carry ">="). */
  operator: Operator;
  orientation: LineOrientation;
}

/** Result of substituting 0 for one variable to find where a line meets an axis. */
export type AxisCrossing =
  | { kind: "point"; point: Point }
  /** The line never meets this axis (it is parallel to it). */
  | { kind: "none" }
  /** The line IS this axis, so every point of the axis lies on it. */
  | { kind: "coincident" };

export interface Intercept {
  equationId: string;
  orientation: LineOrientation;
  /** Put x1 = 0 and solve for x2: where the line meets the x2-axis. */
  onX2Axis: AxisCrossing;
  /** Put x2 = 0 and solve for x1: where the line meets the x1-axis. */
  onX1Axis: AxisCrossing;
  passesThroughOrigin: boolean;
  /**
   * When an oblique line passes through the origin both intercepts are (0, 0),
   * so a second point is needed to draw the line.
   */
  extraPoint: Point | null;
}

/** Origin (or fallback) test used to decide which side of a line to shade. */
export interface HalfPlaneTest {
  equationId: string;
  testPoint: Point;
  lhs: number;
  satisfied: boolean;
}

export type PairKind = "point" | "parallel" | "coincident";

export interface PairIntersection {
  firstId: string;
  secondId: string;
  determinant: number;
  kind: PairKind;
  point: Point | null;
  /** Label of the candidate point this pair produced (after de-duplication). */
  pointLabel: string | null;
}

export interface ConstraintCheck {
  /** "C1", ... or "x1" / "x2" for sign restrictions. */
  targetId: string;
  a: number;
  b: number;
  operator: CheckOperator;
  rhs: number;
  lhs: number;
  satisfied: boolean;
}

export interface CandidatePoint {
  label: string;
  point: Point;
  /** Ids of every boundary line passing through this point. */
  equationIds: string[];
  checks: ConstraintCheck[];
  /** Satisfies every constraint and restriction exactly as entered. */
  feasible: boolean;
  /**
   * Satisfies everything when strict "> 0" is relaxed to ">= 0".
   * Equal to `feasible` unless a strict restriction is used.
   */
  isRegionVertex: boolean;
}

export interface ObjectiveValue {
  pointLabel: string;
  point: Point;
  value: number;
  isOptimal: boolean;
  /** False when the point is a vertex of the closed region but excluded by a strict "> 0". */
  attainable: boolean;
}

export type SolutionStatus =
  | "optimal"
  | "multiple"
  | "infeasible"
  | "unbounded"
  /** The optimum of the closed region lies only on excluded (strict) boundary points. */
  | "unattained";

export type RegionShape = "empty" | "point" | "segment" | "polygon" | "unbounded";

export interface FeasibleRegion {
  shape: RegionShape;
  bounded: boolean;
  /** Extreme directions d along which the region extends forever (empty when bounded). */
  recessionDirections: Point[];
  /**
   * When the region has no vertex at all (all boundary lines parallel), it is a strip,
   * half-plane or line; this holds a representative feasible point for that case.
   */
  representativePoint: Point | null;
}

export interface OptimalSet {
  /** Vertices of the (closed) region where Z reaches its optimal value. */
  pointLabels: string[];
  /** Subset of pointLabels excluded by a strict "> 0" restriction. */
  excludedLabels: string[];
  /** Direction of an optimal ray (from a vertex) or line (no vertex), if any. */
  direction: Point | null;
  /** Point the optimal line passes through when the region has no vertex (all lines parallel). */
  anchor: Point | null;
}

export interface LPPSolution {
  problem: LPPProblem;
  /** One boundary line per user constraint, in input order. */
  boundaryEquations: BoundaryEquation[];
  /** Axis lines x1 = 0 / x2 = 0 included because of sign restrictions. */
  axisEquations: BoundaryEquation[];
  intercepts: Intercept[];
  halfPlaneTests: HalfPlaneTest[];
  pairs: PairIntersection[];
  /** Every unique candidate point, labelled A, B, C, ... */
  intersections: CandidatePoint[];
  feasiblePoints: CandidatePoint[];
  objectiveValues: ObjectiveValue[];
  optimalPoints: CandidatePoint[];
  optimalValue: number | null;
  optimalSet: OptimalSet | null;
  /** Direction along which Z improves without limit (status "unbounded"). */
  improvingDirection: Point | null;
  status: SolutionStatus;
  region: FeasibleRegion;
  /** Extra explanations for special cases (strict restrictions, parallel boundaries, ...). */
  notes: string[];
}
