import type { Point } from "../types/lpp";

/** Base tolerance for floating-point comparisons. */
export const EPSILON = 1e-9;

/** Tolerance scaled to the magnitude of the values being compared. */
export function tolerance(...values: number[]): number {
  let scale = 1;
  for (const v of values) scale = Math.max(scale, Math.abs(v));
  return EPSILON * scale;
}

export function isZero(value: number): boolean {
  return Math.abs(value) <= EPSILON;
}

export function approxEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= tolerance(a, b);
}

export function approxLessOrEqual(a: number, b: number): boolean {
  return a <= b + tolerance(a, b);
}

export function approxGreaterOrEqual(a: number, b: number): boolean {
  return a >= b - tolerance(a, b);
}

/** Strictly greater, i.e. greater by more than the tolerance. */
export function approxGreater(a: number, b: number): boolean {
  return a > b + tolerance(a, b);
}

/**
 * Removes floating-point noise: snaps values within tolerance of an integer
 * (or of a simple fraction) to that exact value, and turns -0 into 0.
 */
export function clean(value: number): number {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) <= tolerance(value)) return rounded === 0 ? 0 : rounded;
  const fraction = toFraction(value);
  if (fraction) return fraction.numerator / fraction.denominator;
  return value === 0 ? 0 : value;
}

export function cleanPoint(point: Point): Point {
  return { x1: clean(point.x1), x2: clean(point.x2) };
}

export function pointsEqual(p: Point, q: Point): boolean {
  return approxEqual(p.x1, q.x1) && approxEqual(p.x2, q.x2);
}

export function dot(a: number, b: number, point: Point): number {
  return a * point.x1 + b * point.x2;
}

export interface Fraction {
  numerator: number;
  denominator: number;
}

const MAX_DENOMINATOR = 10_000;

/**
 * Finds a simple fraction p/q (q <= MAX_DENOMINATOR) equal to `value`
 * within tolerance, using continued-fraction convergents.
 * Returns null when no such fraction exists (e.g. an irrational-looking value).
 */
export function toFraction(value: number): Fraction | null {
  if (!Number.isFinite(value)) return null;
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const tol = tolerance(value) * 10;

  let h0 = 0;
  let h1 = 1;
  let k0 = 1;
  let k1 = 0;
  let remainder = x;
  for (let i = 0; i < 40; i++) {
    const a = Math.floor(remainder);
    const h2 = a * h1 + h0;
    const k2 = a * k1 + k0;
    if (k2 > MAX_DENOMINATOR) break;
    h0 = h1;
    h1 = h2;
    k0 = k1;
    k1 = k2;
    if (Math.abs(x - h1 / k1) <= tol) {
      return { numerator: sign * h1 === 0 ? 0 : sign * h1, denominator: k1 };
    }
    const frac = remainder - a;
    if (frac < 1e-15) break;
    remainder = 1 / frac;
  }
  return null;
}

/** Normalises a direction vector to unit length. */
export function normalize(direction: Point): Point {
  const length = Math.hypot(direction.x1, direction.x2);
  if (length === 0) return { x1: 0, x2: 0 };
  return { x1: direction.x1 / length, x2: direction.x2 / length };
}
