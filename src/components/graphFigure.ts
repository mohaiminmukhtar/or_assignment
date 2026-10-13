import type { Annotations, Data, Layout } from "plotly.js";
import type { CandidatePoint, LPPSolution, Point } from "../types/lpp";
import {
  type Box,
  expandBox,
  feasibleRegionGeometry,
  halfPlanePolygon,
  lineLabelPosition,
  lineSegmentInBox,
} from "../engine/graph";
import { formatNumber, formatPoint } from "../utils/formatting";
import { failedNames } from "./FeasibilityTable";
import { interceptPlotPoints } from "../engine/intercepts";
import { HALF_PLANE_ALPHA, INK, POINT, REGION, lineColor, lineDash, withAlpha } from "./graphStyle";

/** Which layers to draw; the graph builds up as the student moves through the steps. */
export interface GraphLayers {
  intercepts: boolean;
  region: boolean;
  candidates: boolean;
  feasibility: boolean;
  optimum: boolean;
  halfPlanes: boolean;
}

/** Step indices: 0 problem, 1 boundary, 2 intercepts, 3 graph, 4 intersections, 5 feasibility, 6 objective, 7 answer. */
export function layersForStep(step: number, halfPlanes: boolean): GraphLayers {
  return {
    intercepts: step === 2,
    region: step >= 3,
    candidates: step >= 4,
    feasibility: step >= 5,
    optimum: step >= 6,
    halfPlanes: halfPlanes && step >= 3,
  };
}

/** Lines and regions extend this far beyond the initial view so panning never reveals an edge. */
const DRAW_EXPANSION = 3;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function closed(points: Point[]): { x: number[]; y: number[] } {
  const ring = [...points, points[0]!];
  return { x: ring.map((p) => p.x1), y: ring.map((p) => p.x2) };
}

type TextPosition = "top right" | "bottom right" | "top left" | "bottom left";
const POSITIONS: { position: TextPosition; sx: number; sy: number }[] = [
  { position: "top right", sx: 1, sy: 1 },
  { position: "bottom right", sx: 1, sy: -1 },
  { position: "top left", sx: -1, sy: 1 },
  { position: "bottom left", sx: -1, sy: -1 },
];

/**
 * Chooses a label position for each point so that labels avoid other points and
 * labels already placed (approximate, in data units relative to the view).
 */
export function placeLabels(points: Point[], view: Box): TextPosition[] {
  const dx = (view.xMax - view.xMin) * 0.03;
  const dy = (view.yMax - view.yMin) * 0.04;
  const placed: Point[] = [];
  const clashes = (c: Point, own: number) =>
    [...points.filter((_, i) => i !== own), ...placed].some(
      (p) => Math.abs(p.x1 - c.x1) < dx * 1.2 && Math.abs(p.x2 - c.x2) < dy * 0.9,
    );
  return points.map((p, index) => {
    const choice =
      POSITIONS.find(({ sx, sy }) => !clashes({ x1: p.x1 + sx * dx, x2: p.x2 + sy * dy }, index)) ?? POSITIONS[0]!;
    placed.push({ x1: p.x1 + choice.sx * dx, x2: p.x2 + choice.sy * dy });
    return choice.position;
  });
}

function pointHover(candidate: CandidatePoint, solution: LPPSolution, showFeasibility: boolean, showZ: boolean): string {
  const lines = [`<b>${candidate.label} = ${formatPoint(candidate.point)}</b>`];
  lines.push(`On: ${candidate.equationIds.map((id) => (id === "AX1" ? "x₁ = 0" : id === "AX2" ? "x₂ = 0" : id)).join(", ")}`);
  if (showFeasibility) {
    lines.push(candidate.feasible ? "Feasible" : `Infeasible: violates ${failedNames(candidate).join(", ")}`);
  }
  if (showZ && candidate.isRegionVertex) {
    const value = solution.objectiveValues.find((v) => v.pointLabel === candidate.label);
    if (value) lines.push(`Z = ${formatNumber(value.value)}`);
  }
  return lines.join("<br>");
}

export function buildFigure(
  solution: LPPSolution,
  layers: GraphLayers,
  view: Box,
): { data: Data[]; layout: Partial<Layout> } {
  const { problem } = solution;
  const drawBox = expandBox(view, DRAW_EXPANSION);
  const data: Data[] = [];
  const annotations: Partial<Annotations>[] = [];

  // 1. Each inequality's own half-plane (optional).
  if (layers.halfPlanes) {
    solution.boundaryEquations.forEach((line, index) => {
      if (line.operator === "=") return;
      const polygon = halfPlanePolygon(line, drawBox);
      if (polygon.length < 3) return;
      data.push({
        type: "scatter",
        mode: "lines",
        ...closed(polygon),
        fill: "toself",
        fillcolor: withAlpha(lineColor(index), HALF_PLANE_ALPHA),
        line: { width: 0 },
        hoverinfo: "skip",
      });
    });
  }

  // 2. The combined feasible region.
  if (layers.region) {
    const geometry = feasibleRegionGeometry(problem, drawBox);
    if (geometry.kind === "polygon") {
      data.push({
        type: "scatter",
        mode: "lines",
        ...closed(geometry.points),
        fill: "toself",
        fillcolor: REGION.fill,
        line: { color: REGION.edge, width: 2.5 },
        hoverinfo: "skip",
      });
    } else if (geometry.kind === "segment") {
      data.push({
        type: "scatter",
        mode: "lines",
        x: geometry.points.map((p) => p.x1),
        y: geometry.points.map((p) => p.x2),
        line: { color: REGION.segment, width: 16 },
        hoverinfo: "skip",
      });
    } else if (geometry.kind === "point") {
      data.push({
        type: "scatter",
        mode: "markers",
        x: [geometry.points[0].x1],
        y: [geometry.points[0].x2],
        marker: { size: 30, color: REGION.segment },
        hoverinfo: "skip",
      });
    }
  }

  // 3. Boundary lines of the constraints.
  solution.boundaryEquations.forEach((line, index) => {
    const segment = lineSegmentInBox(line, drawBox);
    if (!segment) return;
    data.push({
      type: "scatter",
      mode: "lines",
      x: segment.map((p) => p.x1),
      y: segment.map((p) => p.x2),
      line: { color: lineColor(index), width: line.operator === "=" ? 3 : 2, dash: lineDash(index) },
      hoverinfo: "skip",
    });
    const labelAt = lineLabelPosition(line, view, index);
    if (labelAt) {
      annotations.push({
        x: labelAt.x1,
        y: labelAt.x2,
        text: `<b>${line.label}</b>`,
        showarrow: false,
        bgcolor: "#ffffff",
        bordercolor: lineColor(index),
        borderwidth: 1.5,
        borderpad: 2,
        font: { size: 12, color: INK.primary, family: FONT },
      });
    }
  });

  // 4. Intercepts (step 3 only): where each line meets the axes.
  if (layers.intercepts) {
    const markers: { point: Point; notes: string[] }[] = [];
    solution.intercepts.forEach((intercept, index) => {
      const label = solution.boundaryEquations[index]!.label;
      for (const point of interceptPlotPoints(intercept)) {
        const existing = markers.find((m) => m.point.x1 === point.x1 && m.point.x2 === point.x2);
        if (existing) existing.notes.push(label);
        else markers.push({ point, notes: [label] });
      }
    });
    data.push({
      type: "scatter",
      mode: "text+markers",
      x: markers.map((m) => m.point.x1),
      y: markers.map((m) => m.point.x2),
      text: markers.map((m) => formatPoint(m.point)),
      textposition: "top right",
      textfont: { size: 12, color: INK.primary, family: FONT },
      customdata: markers.map((m) => `<b>${formatPoint(m.point)}</b><br>Point of ${m.notes.join(", ")}`),
      hovertemplate: "%{customdata}<extra></extra>",
      marker: { size: 10, color: "#ffffff", line: { color: INK.primary, width: 2 } },
    });
  }

  // 5. Candidate intersection points, then their feasibility.
  if (layers.candidates) {
    const positions = placeLabels(
      solution.intersections.map((c) => c.point),
      view,
    );
    const positionOf = new Map(solution.intersections.map((c, i) => [c.label, positions[i]!]));
    const groups: { points: CandidatePoint[]; feasible: boolean | null }[] = layers.feasibility
      ? [
          { points: solution.intersections.filter((c) => !c.feasible), feasible: false },
          { points: solution.intersections.filter((c) => c.feasible), feasible: true },
        ]
      : [{ points: solution.intersections, feasible: null }];
    for (const group of groups) {
      if (group.points.length === 0) continue;
      data.push({
        type: "scatter",
        mode: "text+markers",
        x: group.points.map((c) => c.point.x1),
        y: group.points.map((c) => c.point.x2),
        text: group.points.map((c) => `<b>${c.label}</b>`),
        // Plotly accepts one position per point; @types/plotly.js only declares a single value.
        textposition: group.points.map((c) => positionOf.get(c.label) ?? "top right") as unknown as TextPosition,
        textfont: {
          size: 13,
          family: FONT,
          color: group.feasible === false ? INK.muted : INK.primary,
        },
        customdata: group.points.map((c) => pointHover(c, solution, layers.feasibility, layers.optimum)),
        hovertemplate: "%{customdata}<extra></extra>",
        marker:
          group.feasible === false
            ? { size: 10, symbol: "circle-open", color: POINT.infeasible, line: { width: 2 } }
            : {
                size: group.feasible ? 12 : 9,
                color: group.feasible ? POINT.feasible : POINT.neutral,
                line: { color: "#ffffff", width: 2 },
              },
      });
    }
  }

  // 6. Optimum: objective line Z = Z*, optimal set and the optimal point(s).
  if (layers.optimum && solution.optimalValue !== null && solution.optimalSet) {
    const { objective } = problem;
    const zLine = { a: objective.x1, b: objective.x2, c: solution.optimalValue };
    const segment = lineSegmentInBox(zLine, drawBox);
    if (segment) {
      data.push({
        type: "scatter",
        mode: "lines",
        x: segment.map((p) => p.x1),
        y: segment.map((p) => p.x2),
        line: { color: INK.secondary, width: 1.5, dash: "dash" },
        hoverinfo: "skip",
      });
      const labelAt = lineSegmentInBox(zLine, view);
      if (labelAt) {
        const [p, q] = labelAt;
        annotations.push({
          x: p.x1 + 0.15 * (q.x1 - p.x1),
          y: p.x2 + 0.15 * (q.x2 - p.x2),
          text: `Z = ${formatNumber(solution.optimalValue)}`,
          showarrow: false,
          bgcolor: "#ffffff",
          bordercolor: INK.muted,
          borderwidth: 1,
          borderpad: 2,
          font: { size: 12, color: INK.primary, family: FONT },
        });
      }
    }

    // Highlight the whole optimal edge or ray when there are infinitely many optima.
    const optimalVertices = solution.optimalSet.pointLabels.map(
      (label) => solution.intersections.find((c) => c.label === label)!.point,
    );
    const direction = solution.optimalSet.direction;
    let highlight: Point[] | null = null;
    if (optimalVertices.length >= 2) highlight = optimalVertices.slice(0, 2);
    else if (optimalVertices.length === 1 && direction) {
      const reach = (drawBox.xMax - drawBox.xMin) + (drawBox.yMax - drawBox.yMin);
      const v = optimalVertices[0]!;
      highlight = [v, { x1: v.x1 + direction.x1 * reach, x2: v.x2 + direction.x2 * reach }];
    } else if (solution.optimalSet.anchor && segment) highlight = segment;
    if (highlight) {
      data.push({
        type: "scatter",
        mode: "lines",
        x: highlight.map((p) => p.x1),
        y: highlight.map((p) => p.x2),
        line: { color: INK.primary, width: 5 },
        opacity: 0.55,
        hoverinfo: "skip",
      });
    }

    const stars = solution.intersections.filter((c) => solution.optimalSet!.pointLabels.includes(c.label));
    if (stars.length > 0) {
      data.push({
        type: "scatter",
        mode: "markers",
        x: stars.map((c) => c.point.x1),
        y: stars.map((c) => c.point.x2),
        customdata: stars.map(
          (c) =>
            `<b>${c.feasible ? "Optimal" : "Excluded (> 0)"}: ${c.label} = ${formatPoint(c.point)}</b><br>Z = ${formatNumber(solution.optimalValue!)}`,
        ),
        hovertemplate: "%{customdata}<extra></extra>",
        marker: {
          size: 22,
          symbol: stars.map((c) => (c.feasible ? "star" : "star-open")),
          color: POINT.optimal,
          line: { color: "#ffffff", width: 1.5 },
        },
      });
    }
  }

  const axis = (title: string, range: [number, number]) => ({
    range,
    title: { text: title, font: { size: 15, color: INK.primary, family: FONT } },
    gridcolor: INK.grid,
    zeroline: true,
    zerolinecolor: INK.axis,
    zerolinewidth: 1.5,
    ticks: "outside" as const,
    tickcolor: INK.grid,
    tickfont: { color: INK.secondary, size: 12 },
    automargin: true,
  });

  return {
    data,
    layout: {
      margin: { l: 48, r: 16, t: 12, b: 44 },
      paper_bgcolor: INK.surface,
      plot_bgcolor: INK.surface,
      font: { family: FONT, size: 12, color: INK.secondary },
      xaxis: axis("x₁", [view.xMin, view.xMax]),
      yaxis: axis("x₂", [view.yMin, view.yMax]),
      dragmode: "pan",
      hovermode: "closest",
      showlegend: false,
      annotations,
      hoverlabel: { bgcolor: "#ffffff", bordercolor: "#cbd5e1", font: { color: INK.primary, family: FONT, size: 13 } },
    },
  };
}
