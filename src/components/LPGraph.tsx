import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import type { Config } from "plotly.js";
import type { LPPSolution } from "../types/lpp";
import { computeGraphBounds } from "../engine/graph";
import { latexConstraint } from "../utils/formatting";
import { buildFigure, layersForStep, type GraphLayers } from "./graphFigure";
import { INK, POINT, REGION, lineColor, lineDash } from "./graphStyle";
import { loadPlotly } from "./plotlyLoader";
import { MathExpression } from "./MathExpression";
import { Button, cn } from "./ui";

const DASH_ARRAY = { solid: undefined, dash: "6 4", dot: "2 3" } as const;

function LineSwatch({ color, dash, width }: { color: string; dash: keyof typeof DASH_ARRAY; width: number }) {
  return (
    <svg width="26" height="10" aria-hidden="true" className="shrink-0">
      <line x1="1" y1="5" x2="25" y2="5" stroke={color} strokeWidth={width} strokeDasharray={DASH_ARRAY[dash]} strokeLinecap="round" />
    </svg>
  );
}

function MarkerSwatch({ kind }: { kind: "feasible" | "infeasible" | "optimal" | "region" | "zline" | "neutral" | "intercept" }) {
  return (
    <svg width="26" height="16" aria-hidden="true" className="shrink-0">
      {kind === "region" && <rect x="2" y="2" width="22" height="12" rx="2" fill={REGION.fill} stroke={REGION.edge} />}
      {kind === "feasible" && <circle cx="13" cy="8" r="5.5" fill={POINT.feasible} stroke="#fff" strokeWidth="1.5" />}
      {kind === "neutral" && <circle cx="13" cy="8" r="4.5" fill={POINT.neutral} />}
      {kind === "intercept" && <circle cx="13" cy="8" r="4.5" fill="#fff" stroke={INK.primary} strokeWidth="2" />}
      {kind === "infeasible" && <circle cx="13" cy="8" r="4.5" fill="none" stroke={POINT.infeasible} strokeWidth="2" />}
      {kind === "optimal" && (
        <polygon
          points="13,1 15.1,5.9 20.4,6.3 16.4,9.8 17.6,15 13,12.2 8.4,15 9.6,9.8 5.6,6.3 10.9,5.9"
          fill={POINT.optimal}
        />
      )}
      {kind === "zline" && <line x1="1" y1="8" x2="25" y2="8" stroke={INK.secondary} strokeWidth="1.5" strokeDasharray="5 3" />}
    </svg>
  );
}

function Legend({ solution, layers }: { solution: LPPSolution; layers: GraphLayers }) {
  const hasOptimum = layers.optimum && solution.optimalValue !== null && solution.optimalSet !== null;
  return (
    <div className="grid gap-3 border-t border-slate-100 px-4 py-3 text-sm sm:grid-cols-2">
      <ul className="space-y-1" aria-label="Constraint lines">
        {solution.boundaryEquations.map((line, index) => (
          <li key={line.id} className="flex items-center gap-2">
            <LineSwatch color={lineColor(index)} dash={lineDash(index)} width={line.operator === "=" ? 3 : 2} />
            <span className="font-semibold text-slate-700">{line.label}:</span>
            <MathExpression latex={latexConstraint(line.a, line.b, "=", line.c)} className="text-slate-800" />
          </li>
        ))}
      </ul>
      <ul className="space-y-1 text-slate-700" aria-label="Symbols">
        {layers.region && solution.region.shape !== "empty" && (
          <li className="flex items-center gap-2">
            <MarkerSwatch kind="region" /> Feasible region
          </li>
        )}
        {layers.intercepts && (
          <li className="flex items-center gap-2">
            <MarkerSwatch kind="intercept" /> Intercept point
          </li>
        )}
        {layers.candidates && !layers.feasibility && (
          <li className="flex items-center gap-2">
            <MarkerSwatch kind="neutral" /> Intersection point
          </li>
        )}
        {layers.feasibility && (
          <>
            <li className="flex items-center gap-2">
              <MarkerSwatch kind="feasible" /> Feasible point
            </li>
            <li className="flex items-center gap-2">
              <MarkerSwatch kind="infeasible" /> Infeasible point
            </li>
          </>
        )}
        {hasOptimum && (
          <>
            <li className="flex items-center gap-2">
              <MarkerSwatch kind="optimal" /> Optimal point
            </li>
            <li className="flex items-center gap-2">
              <MarkerSwatch kind="zline" /> Objective line at the optimum
            </li>
          </>
        )}
        <li className="pt-1 text-xs text-slate-500">Thicker line: equality constraint.</li>
      </ul>
    </div>
  );
}

export function LPGraph({
  solution,
  step,
  printMode = false,
}: {
  solution: LPPSolution;
  /** Current solution step (0-based); controls which layers are visible. */
  step: number;
  /** Static, fixed-size rendering for printing. */
  printMode?: boolean;
}) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [showHalfPlanes, setShowHalfPlanes] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  const view = useMemo(() => computeGraphBounds(solution), [solution]);
  const layers = useMemo(() => layersForStep(step, showHalfPlanes), [step, showHalfPlanes]);
  const figure = useMemo(() => buildFigure(solution, layers, view), [solution, layers, view]);

  // Draw / update the plot whenever the figure changes. The uirevision keeps the user's
  // zoom and pan while stepping through the solution.
  useEffect(() => {
    let cancelled = false;
    const element = plotRef.current;
    if (!element) return;
    const config: Partial<Config> = printMode
      ? { staticPlot: true, responsive: false }
      : {
          responsive: true,
          scrollZoom: true,
          displaylogo: false,
          modeBarButtonsToRemove: ["select2d", "lasso2d", "autoScale2d"],
          toImageButtonOptions: { filename: "lpp-graph", scale: 2 },
        };
    loadPlotly()
      .then((Plotly) => {
        if (cancelled) return;
        return Plotly.react(element, figure.data, { ...figure.layout, uirevision: "lpp" }, config);
      })
      .then(() => {
        if (!cancelled) setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [figure, printMode]);

  // Free Plotly resources on unmount.
  useEffect(() => {
    const element = plotRef.current;
    return () => {
      if (element) void loadPlotly().then((Plotly) => Plotly.purge(element));
    };
  }, []);

  // Resize with the container (e.g. when the mobile Solution/Graph tab changes).
  useEffect(() => {
    const element = plotRef.current;
    if (!element || printMode || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (element.offsetWidth > 0) void loadPlotly().then((Plotly) => Plotly.Plots.resize(element));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [printMode]);

  const resetView = () => {
    const element = plotRef.current;
    if (!element) return;
    void loadPlotly().then((Plotly) =>
      Plotly.relayout(element, {
        "xaxis.range": [view.xMin, view.xMax],
        "yaxis.range": [view.yMin, view.yMax],
      }),
    );
  };

  return (
    <div>
      {!printMode && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2">
          <label className={cn("flex items-center gap-2 text-sm text-slate-700", step < 3 && "opacity-50")}>
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue-700"
              checked={showHalfPlanes}
              disabled={step < 3}
              onChange={(event) => setShowHalfPlanes(event.target.checked)}
            />
            Shade each inequality separately
          </label>
          <Button size="sm" onClick={resetView}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset Graph
          </Button>
        </div>
      )}
      <div className="relative">
        <div
          ref={plotRef}
          role="img"
          aria-label="Coordinate graph of the constraint lines, intersection points and feasible region. The same information is listed in the tables."
          className={printMode ? "h-[460px] w-[700px]" : "h-[360px] w-full sm:h-[440px] lg:h-[520px]"}
        />
        {loadState !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm text-slate-600">
            {loadState === "loading" ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Drawing graph…
              </span>
            ) : (
              <span>The graph could not be loaded. The tables still show every result.</span>
            )}
          </div>
        )}
      </div>
      {!printMode && (
        <p className="px-4 pb-1 text-xs text-slate-500">Drag to pan, scroll or pinch to zoom, hover a point for details.</p>
      )}
      <Legend solution={solution} layers={layers} />
    </div>
  );
}
