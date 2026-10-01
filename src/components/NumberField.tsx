import { cn } from "./ui";

/**
 * Text field for a coefficient or right-hand side. Plain text (not type="number")
 * so students can type fractions such as 4/3 or a leading minus sign.
 */
export function NumberField({
  value,
  onChange,
  label,
  placeholder,
  invalid,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
}) {
  return (
    <input
      type="text"
      inputMode="text"
      autoComplete="off"
      spellCheck={false}
      value={value}
      placeholder={placeholder}
      aria-label={label}
      aria-invalid={invalid || undefined}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "tabular h-10 w-16 rounded-md border bg-white px-2 text-center text-base text-slate-900 shadow-xs outline-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 sm:w-20",
        invalid ? "border-red-500 bg-red-50" : "border-slate-300",
        className,
      )}
    />
  );
}
