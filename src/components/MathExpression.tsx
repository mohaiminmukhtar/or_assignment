import { useMemo } from "react";
import katex from "katex";
import { cn } from "./ui";

/** Renders a LaTeX string with KaTeX, inline or as a display (block) formula. */
export function MathExpression({
  latex,
  display = false,
  className,
}: {
  latex: string;
  display?: boolean;
  className?: string;
}) {
  const html = useMemo(
    () => katex.renderToString(latex, { displayMode: display, throwOnError: false, strict: "ignore" }),
    [latex, display],
  );
  if (display) {
    return <div className={cn("math-block", className)} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Several formulas, one per line, left-aligned (e.g. a chain of working). */
export function MathLines({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      {lines.map((line, index) => (
        <MathExpression key={index} latex={line} display />
      ))}
    </div>
  );
}
