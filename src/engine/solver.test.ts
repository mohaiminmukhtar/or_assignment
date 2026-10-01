import { describe, expect, it } from "vitest";
import type { LPPProblem, LPPSolution, Operator, Point, VariableRestriction } from "../types/lpp";
import { solveLPP } from "./solver";
import { computeIntercept } from "./intercepts";
import { buildBoundaryEquations, parseProblem } from "./parser";
import { computeGraphBounds, feasibleRegionGeometry } from "./graph";
import { exampleDraft } from "../data/examples";
import { formatNumber, formatPoint } from "../utils/formatting";

type Row = [number, number, Operator, number];

function lpp(
  type: "min" | "max",
  c: [number, number],
  rows: Row[],
  restrictions: [VariableRestriction, VariableRestriction] = ["nonNegative", "nonNegative"],
): LPPProblem {
  return {
    objective: { type, x1: c[0], x2: c[1] },
    constraints: rows.map(([x1, x2, operator, rhs], i) => ({ id: `r${i}`, x1, x2, operator, rhs })),
    restrictions: { x1: restrictions[0], x2: restrictions[1] },
  };
}

function find(solution: LPPSolution, point: Point) {
  return solution.intersections.find(
    (c) => Math.abs(c.point.x1 - point.x1) < 1e-9 && Math.abs(c.point.x2 - point.x2) < 1e-9,
  );
}

function optimalCoordinates(solution: LPPSolution): string[] {
  return solution.optimalPoints.map((p) => formatPoint(p.point)).sort();
}

describe("exact reference example", () => {
  const parsed = parseProblem(exampleDraft());
  if (!parsed.ok) throw new Error("example should parse");
  const solution = solveLPP(parsed.problem);

  it("reads blank coefficients as zero", () => {
    expect(parsed.problem.constraints[3]).toMatchObject({ x1: 1, x2: 0, operator: "<=", rhs: 3 });
    expect(parsed.problem.constraints[4]).toMatchObject({ x1: 0, x2: 1, operator: "<=", rhs: 3 });
  });

  it("computes the intercepts of every boundary line", () => {
    const [c1, c2, c3, c4, c5] = solution.intercepts;
    expect(c1).toMatchObject({ onX2Axis: { point: { x1: 0, x2: 4 } }, onX1Axis: { point: { x1: 4, x2: 0 } } });
    expect(c2).toMatchObject({ onX2Axis: { point: { x1: 0, x2: 4 } } });
    expect(c2!.onX1Axis.kind === "point" && formatNumber(c2!.onX1Axis.point.x1)).toBe("4/3");
    expect(c3!.onX2Axis.kind === "point" && formatNumber(c3!.onX2Axis.point.x2)).toBe("4/5");
    expect(c3).toMatchObject({ onX1Axis: { point: { x1: 4, x2: 0 } } });
    expect(c4).toMatchObject({ orientation: "vertical", onX2Axis: { kind: "none" }, onX1Axis: { point: { x1: 3, x2: 0 } } });
    expect(c5).toMatchObject({ orientation: "horizontal", onX1Axis: { kind: "none" }, onX2Axis: { point: { x1: 0, x2: 3 } } });
  });

  it("labels the two feasible corners A = (1,3) and B = (3,1)", () => {
    expect(solution.feasiblePoints.map((p) => `${p.label}=${formatPoint(p.point)}`)).toEqual([
      "A=(1, 3)",
      "B=(3, 1)",
    ]);
  });

  it("finds every relevant intersection and marks the others infeasible", () => {
    for (const p of [
      { x1: 3, x2: 3 },
      { x1: 0, x2: 4 },
      { x1: 4, x2: 0 },
      { x1: 8 / 7, x2: 4 / 7 },
    ]) {
      const candidate = find(solution, p);
      expect(candidate, formatPoint(p)).toBeDefined();
      expect(candidate!.feasible).toBe(false);
    }
    // (0,4) lies on C1, C2 and the x2-axis, and violates x2 <= 3 (C5).
    const d = find(solution, { x1: 0, x2: 4 })!;
    expect(d.equationIds).toEqual(["C1", "C2", "AX1"]);
    expect(d.checks.find((c) => c.targetId === "C5")!.satisfied).toBe(false);
    // (4,0) violates x1 <= 3 (C4).
    expect(find(solution, { x1: 4, x2: 0 })!.checks.find((c) => c.targetId === "C4")!.satisfied).toBe(false);
    expect(formatPoint(find(solution, { x1: 8 / 7, x2: 4 / 7 })!.point)).toBe("(8/7, 4/7)");
  });

  it("evaluates Z only at feasible points and minimises", () => {
    expect(solution.objectiveValues.map((v) => [v.pointLabel, v.value])).toEqual([
      ["A", 11],
      ["B", 9],
    ]);
    expect(solution.status).toBe("optimal");
    expect(solution.optimalValue).toBe(9);
    expect(optimalCoordinates(solution)).toEqual(["(3, 1)"]);
    expect(solution.region.shape).toBe("segment");
  });

  it("frames the graph around 0..5", () => {
    const box = computeGraphBounds(solution);
    expect(box.xMax).toBe(5);
    expect(box.yMax).toBe(5);
    expect(box.xMin).toBeLessThanOrEqual(0);
    const geometry = feasibleRegionGeometry(parsed.problem, box);
    expect(geometry.kind).toBe("segment");
  });
});

describe("generic problems", () => {
  it("1. simple minimisation (unbounded region, finite minimum)", () => {
    const s = solveLPP(lpp("min", [3, 2], [[1, 1, ">=", 4], [1, 3, ">=", 6]]));
    expect(s.status).toBe("optimal");
    expect(s.optimalValue).toBe(8);
    expect(optimalCoordinates(s)).toEqual(["(0, 4)"]);
    expect(s.region.bounded).toBe(false);
    expect(s.region.shape).toBe("unbounded");
  });

  it("2. simple maximisation", () => {
    const s = solveLPP(lpp("max", [3, 5], [[1, 0, "<=", 4], [0, 2, "<=", 12], [3, 2, "<=", 18]]));
    expect(s.status).toBe("optimal");
    expect(s.optimalValue).toBe(36);
    expect(optimalCoordinates(s)).toEqual(["(2, 6)"]);
    expect(s.region.shape).toBe("polygon");
    expect(s.feasiblePoints).toHaveLength(5);
  });

  it("3. vertical constraint has no x2-axis intercept", () => {
    const [line] = buildBoundaryEquations(lpp("max", [1, 1], [[2, 0, "<=", 6]]));
    const intercept = computeIntercept(line!);
    expect(intercept.orientation).toBe("vertical");
    expect(intercept.onX2Axis.kind).toBe("none");
    expect(intercept.onX1Axis).toEqual({ kind: "point", point: { x1: 3, x2: 0 } });
  });

  it("4. horizontal constraint has no x1-axis intercept", () => {
    const [line] = buildBoundaryEquations(lpp("max", [1, 1], [[0, 5, "<=", 20]]));
    const intercept = computeIntercept(line!);
    expect(intercept.orientation).toBe("horizontal");
    expect(intercept.onX1Axis.kind).toBe("none");
    expect(intercept.onX2Axis).toEqual({ kind: "point", point: { x1: 0, x2: 4 } });
  });

  it("5. parallel lines produce no intersection", () => {
    const s = solveLPP(lpp("max", [2, 1], [[1, 1, "<=", 4], [1, 1, ">=", 2]]));
    const pair = s.pairs.find((p) => p.firstId === "C1" && p.secondId === "C2")!;
    expect(pair.kind).toBe("parallel");
    expect(pair.point).toBeNull();
    expect(s.optimalValue).toBe(8);
    expect(optimalCoordinates(s)).toEqual(["(4, 0)"]);
  });

  it("5b. coincident (duplicate) constraints do not duplicate points", () => {
    const s = solveLPP(lpp("max", [1, 1], [[1, 2, "<=", 4], [2, 4, "<=", 8], [1, 0, "<=", 2]]));
    const pair = s.pairs.find((p) => p.firstId === "C1" && p.secondId === "C2")!;
    expect(pair.kind).toBe("coincident");
    const keys = s.intersections.map((c) => formatPoint(c.point));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("6. negative coefficients", () => {
    const s = solveLPP(lpp("max", [2, 1], [[-2, 3, ">=", 6], [1, 1, "<=", 10]]));
    expect(s.status).toBe("optimal");
    expect(formatNumber(s.optimalValue!)).toBe("74/5");
    expect(optimalCoordinates(s)).toEqual(["(24/5, 26/5)"]);
    expect(s.halfPlaneTests[0]).toMatchObject({ testPoint: { x1: 0, x2: 0 }, satisfied: false });
  });

  it("7. fraction intersections are shown exactly", () => {
    const s = solveLPP(lpp("max", [1, 1], [[3, 1, "<=", 4], [1, 2, "<=", 3]]));
    // 3x1 + x2 = 4 and x1 + 2x2 = 3 meet at (1, 1); x1 + 2x2 = 3 meets x2 = 0 at (3, 0) etc.
    expect(optimalCoordinates(s)).toEqual(["(1, 1)"]);
    const t = solveLPP(lpp("max", [1, 1], [[3, 4, "<=", 5], [2, -1, "<=", 1]]));
    expect(t.intersections.map((c) => formatPoint(c.point))).toContain("(9/11, 7/11)");
    expect(formatNumber(4 / 3)).toBe("4/3");
    expect(formatNumber(0.25)).toBe("1/4");
  });

  it("8. infeasible problem", () => {
    const s = solveLPP(lpp("max", [1, 1], [[1, 1, "<=", 2], [1, 1, ">=", 5]]));
    expect(s.status).toBe("infeasible");
    expect(s.feasiblePoints).toHaveLength(0);
    expect(s.optimalValue).toBeNull();
    expect(s.region.shape).toBe("empty");

    const t = solveLPP(lpp("min", [1, 1], [[1, 0, ">=", 3], [1, 0, "<=", 1], [0, 1, "<=", 4]]));
    expect(t.status).toBe("infeasible");
  });

  it("9. multiple optimal solutions", () => {
    const s = solveLPP(lpp("max", [2, 4], [[1, 2, "<=", 5], [1, 1, "<=", 4]]));
    expect(s.status).toBe("multiple");
    expect(s.optimalValue).toBe(10);
    expect(optimalCoordinates(s)).toEqual(["(0, 5/2)", "(3, 1)"]);
  });

  it("10. unbounded objective", () => {
    const s = solveLPP(lpp("max", [1, 1], [[1, -1, "<=", 1], [-1, 1, "<=", 2]]));
    expect(s.status).toBe("unbounded");
    expect(s.region.bounded).toBe(false);
    expect(s.optimalValue).toBeNull();
    expect(s.improvingDirection).not.toBeNull();
  });

  it("10b. optimum along an unbounded edge is reported as multiple", () => {
    const s = solveLPP(lpp("min", [0, 1], [[0, 1, ">=", 2]]));
    expect(s.status).toBe("multiple");
    expect(s.optimalValue).toBe(2);
    expect(s.optimalSet!.direction).toEqual({ x1: 1, x2: 0 });
  });

  it("11. non-negativity changes the answer", () => {
    const rows: Row[] = [[1, 0, ">=", -2], [0, 1, ">=", -3], [1, 0, "<=", 5]];
    const restricted = solveLPP(lpp("min", [1, 1], rows));
    expect(restricted.optimalValue).toBe(0);
    expect(optimalCoordinates(restricted)).toEqual(["(0, 0)"]);
    expect(restricted.axisEquations.map((l) => l.id)).toEqual(["AX1", "AX2"]);

    const free = solveLPP(lpp("min", [1, 1], rows, ["free", "free"]));
    expect(free.optimalValue).toBe(-5);
    expect(optimalCoordinates(free)).toEqual(["(-2, -3)"]);
    expect(free.axisEquations).toHaveLength(0);
  });

  it("11b. strict positivity excludes axis points", () => {
    const unattained = solveLPP(lpp("min", [2, 3], [[1, 1, ">=", 1]], ["positive", "positive"]));
    expect(unattained.status).toBe("unattained");
    expect(unattained.optimalValue).toBe(2);
    expect(find(unattained, { x1: 1, x2: 0 })!.feasible).toBe(false);

    const segment = solveLPP(lpp("min", [1, 1], [[1, 1, ">=", 1]], ["positive", "positive"]));
    expect(segment.status).toBe("multiple");
    expect(segment.optimalSet!.excludedLabels).toHaveLength(2);
  });

  it("12. all boundary lines parallel (no corner points)", () => {
    const line = solveLPP(lpp("max", [1, 0], [[1, 0, "<=", 3], [1, 0, ">=", -1]], ["free", "free"]));
    expect(line.status).toBe("multiple");
    expect(line.optimalValue).toBe(3);
    expect(line.optimalSet!.anchor).toEqual({ x1: 3, x2: 0 });

    const unbounded = solveLPP(lpp("max", [0, 1], [[1, 0, "<=", 3]], ["free", "free"]));
    expect(unbounded.status).toBe("unbounded");
  });

  it("intercepts of a line through the origin use an extra point", () => {
    const [line] = buildBoundaryEquations(lpp("max", [1, 1], [[1, -1, "<=", 0]]));
    const intercept = computeIntercept(line!);
    expect(intercept.passesThroughOrigin).toBe(true);
    expect(intercept.extraPoint).toEqual({ x1: 1, x2: 1 });
  });
});

describe("input validation", () => {
  const base = exampleDraft();

  it("rejects 0x1 + 0x2 = 5", () => {
    const draft = { ...base, constraints: [{ id: "z", x1: "0", x2: "", operator: "=" as const, rhs: "5" }] };
    const result = parseProblem(draft);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]!.field).toBe("constraint.z");
  });

  it("rejects missing RHS, invalid numbers and division by zero", () => {
    const draft = {
      ...base,
      constraints: [
        { id: "a", x1: "1", x2: "1", operator: "<=" as const, rhs: "" },
        { id: "b", x1: "abc", x2: "1", operator: "<=" as const, rhs: "3" },
        { id: "c", x1: "1/0", x2: "1", operator: "<=" as const, rhs: "3" },
      ],
    };
    const result = parseProblem(draft);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((e) => e.field)).toEqual(["constraint.a.rhs", "constraint.b.x1", "constraint.c.x1"]);
    }
  });

  it("rejects an empty constraint list and a constant objective", () => {
    const result = parseProblem({ ...base, c1: "0", c2: "", constraints: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.field).sort()).toEqual(["constraints", "objective"]);
  });

  it("accepts fractions and decimals", () => {
    const result = parseProblem({ ...base, c1: "1/2", c2: "-0.25" });
    expect(result.ok && result.problem.objective).toMatchObject({ x1: 0.5, x2: -0.25 });
  });
});
