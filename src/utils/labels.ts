/** Point labels A, B, ..., Z, AA, AB, ... (spreadsheet style, never runs out). */
export function indexToLabel(index: number): string {
  let label = "";
  let n = index;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

/** Constraint label C1, C2, ... from a zero-based index. */
export function constraintLabel(index: number): string {
  return `C${index + 1}`;
}

export const AXIS_X1_ID = "AX1"; // the line x1 = 0 (the x2-axis)
export const AXIS_X2_ID = "AX2"; // the line x2 = 0 (the x1-axis)
