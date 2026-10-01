import type { CheckOperator, ObjectiveType, Point } from "../types/lpp";
import { clean, toFraction } from "./math";

// ---------------------------------------------------------------------------
// Plain-text numbers (tables, tooltips)
// ---------------------------------------------------------------------------

function trimDecimal(value: number, digits: number): string {
  const text = value.toFixed(digits);
  return text.includes(".") ? text.replace(/0+$/, "").replace(/\.$/, "") : text;
}

/** Decimal approximation, e.g. 1.142857 -> "1.143". */
export function formatDecimal(value: number, digits = 3): string {
  const text = trimDecimal(clean(value), digits);
  return text === "-0" ? "0" : text;
}

/** Exact-looking display: integers stay integers, rationals become "p/q". */
export function formatNumber(value: number): string {
  const v = clean(value);
  if (Number.isInteger(v)) return String(v);
  const fraction = toFraction(v);
  if (fraction && fraction.denominator <= 1000) {
    return `${fraction.numerator}/${fraction.denominator}`;
  }
  return formatDecimal(v, 4);
}

/** True when the exact display differs from a short decimal (e.g. "8/7"). */
export function isFractionDisplay(value: number): boolean {
  return formatNumber(value).includes("/");
}

/** "8/7 ≈ 1.143" for fractions, plain value otherwise. */
export function formatNumberWithApprox(value: number): string {
  const exact = formatNumber(value);
  return exact.includes("/") ? `${exact} ≈ ${formatDecimal(value)}` : exact;
}

export function formatPoint(point: Point): string {
  return `(${formatNumber(point.x1)}, ${formatNumber(point.x2)})`;
}

// ---------------------------------------------------------------------------
// LaTeX builders (rendered with KaTeX)
// ---------------------------------------------------------------------------

/** LaTeX for a number: "4", "-\tfrac{4}{3}", "1.2346". */
export function latexNumber(value: number): string {
  const v = clean(value);
  if (Number.isInteger(v)) return String(v);
  const fraction = toFraction(v);
  if (fraction && fraction.denominator <= 1000) {
    const sign = fraction.numerator < 0 ? "-" : "";
    return `${sign}\\tfrac{${Math.abs(fraction.numerator)}}{${fraction.denominator}}`;
  }
  return formatDecimal(v, 4);
}

/** Number wrapped in parentheses when it is negative, for substitutions like 6(-1). */
function latexFactor(value: number): string {
  const text = latexNumber(value);
  return clean(value) < 0 ? `\\left(${text}\\right)` : text;
}

export function latexPoint(point: Point): string {
  return `\\left(${latexNumber(point.x1)},\\ ${latexNumber(point.x2)}\\right)`;
}

export const VARIABLE_LATEX = { x1: "x_1", x2: "x_2" } as const;

export function latexOperator(operator: CheckOperator): string {
  switch (operator) {
    case "<=":
      return "\\le";
    case ">=":
      return "\\ge";
    case ">":
      return ">";
    case "=":
      return "=";
  }
}

export function operatorSymbol(operator: CheckOperator): string {
  switch (operator) {
    case "<=":
      return "≤";
    case ">=":
      return "≥";
    case ">":
      return ">";
    case "=":
      return "=";
  }
}

interface Term {
  coefficient: number;
  /** LaTeX body of the term without its coefficient, e.g. "x_1" or "(3)". */
  body: string;
  /** Whether a coefficient of ±1 can be dropped ("x_1" rather than "1x_1"). */
  implicitOne: boolean;
}

/** Joins signed terms: "2x_1 - 3x_2", skipping zero coefficients. */
function joinTerms(terms: Term[]): string {
  const visible = terms.filter((t) => clean(t.coefficient) !== 0);
  if (visible.length === 0) return "0";
  return visible
    .map((term, index) => {
      const coefficient = clean(term.coefficient);
      const magnitude = Math.abs(coefficient);
      const coefficientText = magnitude === 1 && term.implicitOne ? "" : latexNumber(magnitude);
      const text = `${coefficientText}${term.body}`;
      if (index === 0) return coefficient < 0 ? `-${text}` : text;
      return coefficient < 0 ? ` - ${text}` : ` + ${text}`;
    })
    .join("");
}

/** "2x_1 + 3x_2", "x_1", "-x_2", ... */
export function latexLinear(a: number, b: number): string {
  return joinTerms([
    { coefficient: a, body: "x_1", implicitOne: true },
    { coefficient: b, body: "x_2", implicitOne: true },
  ]);
}

export function latexConstraint(a: number, b: number, operator: CheckOperator, c: number): string {
  return `${latexLinear(a, b)} ${latexOperator(operator)} ${latexNumber(c)}`;
}

export function latexObjective(type: ObjectiveType, c1: number, c2: number): string {
  return `\\text{${type === "min" ? "Minimize" : "Maximize"}}\\quad Z = ${latexLinear(c1, c2)}`;
}

/**
 * Substitution of a point into a·x1 + b·x2.
 * Returns the substituted expression ("6(1) + 2(3)"), the individual
 * products ("6 + 6"), and whether the products line adds information.
 */
export function latexSubstitution(
  a: number,
  b: number,
  point: Point,
): { substituted: string; products: string; showProducts: boolean } {
  const terms: { coefficient: number; value: number }[] = [
    { coefficient: a, value: point.x1 },
    { coefficient: b, value: point.x2 },
  ].filter((t) => clean(t.coefficient) !== 0);

  if (terms.length === 0) return { substituted: "0", products: "0", showProducts: false };

  const substituted = terms
    .map((t, index) => {
      const coefficient = clean(t.coefficient);
      const magnitude = Math.abs(coefficient);
      const body =
        magnitude === 1 ? latexFactor(t.value) : `${latexNumber(magnitude)}\\left(${latexNumber(t.value)}\\right)`;
      if (index === 0) return coefficient < 0 ? `-${body}` : body;
      return coefficient < 0 ? ` - ${body}` : ` + ${body}`;
    })
    .join("");

  const products = terms
    .map((t, index) => {
      const product = clean(t.coefficient * t.value);
      if (index === 0) return latexNumber(product);
      return product < 0 ? ` - ${latexNumber(-product)}` : ` + ${latexNumber(product)}`;
    })
    .join("");

  // Products only add information when there is a real multiplication to show.
  const showProducts =
    terms.length > 1 || terms.some((t) => Math.abs(clean(t.coefficient)) !== 1);
  return { substituted, products, showProducts };
}

/** Full evaluation chain: "6(1) + 2(3) = 6 + 6 = 12". */
export function latexEvaluation(a: number, b: number, point: Point): string {
  const { substituted, products, showProducts } = latexSubstitution(a, b, point);
  const total = latexNumber(a * point.x1 + b * point.x2);
  const parts = [substituted];
  if (showProducts && products !== substituted) parts.push(products);
  if (parts[parts.length - 1] !== total) parts.push(total);
  return parts.join(" = ");
}

export function variableRestrictionLatex(variable: "x1" | "x2", strict: boolean): string {
  return `${VARIABLE_LATEX[variable]} ${strict ? ">" : "\\ge"} 0`;
}
