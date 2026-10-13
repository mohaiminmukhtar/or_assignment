/**
 * Visual encoding for the graph. Colours are assigned by constraint index in a fixed,
 * colour-blind-validated order; beyond eight constraints the hues repeat with a different
 * dash pattern, and every line also carries a direct "C#" label, so identity never relies on colour alone.
 */
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"] as const;
const DASHES = ["solid", "dash", "dot"] as const;

export function lineColor(index: number): string {
  return SERIES[index % SERIES.length]!;
}

export function lineDash(index: number): (typeof DASHES)[number] {
  return DASHES[Math.floor(index / SERIES.length) % DASHES.length]!;
}

export const INK = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e7e6e1",
  axis: "#52514e",
  surface: "#ffffff",
} as const;

export const REGION = {
  fill: "rgba(37, 99, 235, 0.40)",
  edge: "rgba(29, 78, 216, 1)",
  segment: "rgba(37, 99, 235, 0.65)",
} as const;

export const POINT = {
  feasible: "#1d4ed8",
  infeasible: "#898781",
  neutral: "#52514e",
  optimal: "#0b0b0b",
} as const;

/** Alpha used when every inequality's own half-plane is shaded. */
export const HALF_PLANE_ALPHA = 0.08;

export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
