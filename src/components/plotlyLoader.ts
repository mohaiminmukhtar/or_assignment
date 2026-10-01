export type PlotlyModule = typeof import("plotly.js");

let pending: Promise<PlotlyModule> | null = null;

/** Loads Plotly once, in its own chunk, the first time a graph is shown. */
export function loadPlotly(): Promise<PlotlyModule> {
  pending ??= import("plotly.js-dist-min").then((module) => module.default);
  return pending;
}
